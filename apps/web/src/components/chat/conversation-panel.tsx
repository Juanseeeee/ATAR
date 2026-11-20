'use client';

import Link from 'next/link';
import CompanyLogo from '@/components/dashboard/company-logo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  atarApi,
  type MembershipRole,
  type ConversationMessageRecord,
  type ConversationRecord,
  type SendConversationMessagePayload,
} from '@/lib/atar-api';
import { getConversationSocket } from '@/lib/conversation-socket';
import { LoadingState } from '@/components/ui/spinner';
import { SUPPLIER_COUNTERS_REFRESH_EVENT } from '@/lib/dashboard-hooks';
import { loadSession, type WebSession } from '@/lib/session';
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardInfoBadge,
  dashboardInputClassName,
  dashboardGhostButtonClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
  dashboardTextareaClassName,
} from '../dashboard/dashboard-ui';

type ConversationPanelProps = {
  mode: 'quote' | 'product' | 'existing';
  conversationId?: string;
  quoteId?: string;
  productName?: string;
  supplierCompanyName?: string;
  session?: WebSession | null;
  title?: string;
  description?: string;
  loginHref?: string;
  /** Lo que se muestra sin sesión en lugar del aviso genérico de "iniciar sesión". */
  guestContent?: React.ReactNode;
  /** Si viene, muestra un botón "volver" en el header (solo mobile). */
  onBack?: () => void;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/** Separador de día del chat: "Hoy", "Ayer" o "12 de noviembre". */
function formatDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  }).format(date);
}

function getInitials(value: string | null | undefined) {
  const cleaned = (value ?? '').replace(/\bS\.?\s*A\.?\b/gi, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const raw = words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join('') : cleaned.slice(0, 2);
  return raw.toUpperCase() || 'AT';
}

function resolveParticipantRole(
  session: WebSession | null,
  conversation: ConversationRecord | null,
): Extract<MembershipRole, 'BUYER' | 'SUPPLIER'> | null {
  if (!session || !conversation) {
    return null;
  }

  // El servidor dice de qué lado está (necesario en los chats directos entre
  // proveedoras, donde las dos empresas son proveedoras).
  if (conversation.viewerRole === 'BUYER' || conversation.viewerRole === 'SUPPLIER') {
    return conversation.viewerRole;
  }

  const buyerMatch = session.user.memberships.some(
    (membership) => membership.role === 'BUYER' && membership.company.id === conversation.buyerCompanyId,
  );
  if (buyerMatch) {
    return 'BUYER';
  }

  // Un vendedor (SELLER) participa en nombre de su empresa proveedora.
  const supplierMatch = session.user.memberships.some(
    (membership) =>
      (membership.role === 'SUPPLIER' || membership.role === 'SELLER') &&
      membership.company.id === conversation.supplierCompanyId,
  );
  if (supplierMatch) {
    return 'SUPPLIER';
  }

  return null;
}

function getRolePath(
  session: WebSession | null,
  participantRole: Extract<MembershipRole, 'BUYER' | 'SUPPLIER'> | null,
  isDirect = false,
) {
  // Un chat directo es siempre entre proveedoras.
  if (isDirect || participantRole === 'SUPPLIER') {
    return 'proveedor';
  }

  if (participantRole === 'BUYER') {
    return 'comprador';
  }

  const hasSupplierRole = session?.user.memberships.some(
    (membership) => membership.role === 'SUPPLIER' || membership.role === 'SELLER',
  );
  return hasSupplierRole ? 'proveedor' : 'comprador';
}

function getContextLabel(contextType: ConversationRecord['contextType']) {
  if (contextType === 'DIRECT') {
    return 'Chat directo';
  }

  if (contextType === 'PRODUCT') {
    return 'Producto';
  }

  if (contextType === 'QUOTE') {
    return 'Cotizacion';
  }

  return 'Solicitud';
}

function getContextTone(contextType: ConversationRecord['contextType']) {
  if (contextType === 'DIRECT') {
    return 'indigo' as const;
  }

  if (contextType === 'PRODUCT') {
    return 'sky' as const;
  }

  if (contextType === 'QUOTE') {
    return 'indigo' as const;
  }

  return 'amber' as const;
}

async function fileToBase64(file: File) {
  const reader = new FileReader();

  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo adjunto.'));
    reader.readAsDataURL(file);
  });
}

export default function ConversationPanel({
  mode,
  conversationId,
  quoteId,
  productName,
  supplierCompanyName,
  session,
  title = 'Chat contextual',
  description = 'Intercambia mensajes y archivos sin salir del flujo comercial.',
  loginHref = '/acceso',
  guestContent,
  onBack,
}: ConversationPanelProps) {
  const [activeSession, setActiveSession] = useState<WebSession | null>(session ?? null);
  const [conversation, setConversation] = useState<ConversationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [typingState, setTypingState] = useState<{
    senderRole: MembershipRole;
    isTyping: boolean;
  } | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (session) {
      setActiveSession(session);
      return;
    }

    setActiveSession(loadSession());
  }, [session]);

  const refreshConversation = useCallback(async (options?: { silent?: boolean }) => {
    if (!activeSession?.accessToken) {
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      let ensuredConversation: ConversationRecord;

      if (mode === 'existing') {
        if (!conversationId) {
          throw new Error('Falta la conversacion para abrir el chat.');
        }

        ensuredConversation = await atarApi.getConversation(
          conversationId,
          undefined,
          activeSession.accessToken,
        );
      } else if (mode === 'quote') {
        if (!quoteId) {
          throw new Error('Falta la cotizacion para abrir el chat.');
        }

        ensuredConversation = await atarApi.getOrCreateQuoteConversation(
          quoteId,
          activeSession.accessToken,
        );
      } else {
        if (!productName || !supplierCompanyName) {
          throw new Error('Faltan datos del producto para iniciar el chat.');
        }

        ensuredConversation = await atarApi.getOrCreateProductConversation(
          {
            productName,
            supplierCompanyName,
          },
          activeSession.accessToken,
        );
      }

      let detail = await atarApi.getConversation(
        ensuredConversation.id,
        {
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
        },
        activeSession.accessToken,
      );

      if (detail.unreadCount > 0) {
        await atarApi.markConversationRead(detail.id, activeSession.accessToken);
        detail = await atarApi.getConversation(
          detail.id,
          {
            search: search || undefined,
            from: from || undefined,
            to: to || undefined,
          },
          activeSession.accessToken,
        );
        window.dispatchEvent(new Event(SUPPLIER_COUNTERS_REFRESH_EVENT));
      }

      setConversation(detail);
    } catch (conversationError) {
      setError(
        conversationError instanceof Error
          ? conversationError.message
          : 'No se pudo abrir la conversacion.',
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [activeSession?.accessToken, conversationId, from, mode, productName, quoteId, search, supplierCompanyName, to]);

  useEffect(() => {
    void refreshConversation();
  }, [refreshConversation]);

  const participantRole = useMemo(
    () => resolveParticipantRole(activeSession, conversation),
    [activeSession, conversation],
  );

  useEffect(() => {
    if (!activeSession?.accessToken) {
      setLiveConnected(false);
      return;
    }

    const socket = getConversationSocket(activeSession.accessToken);
    const syncConversation = (payload: { conversationId: string }) => {
      if (conversation?.id && payload.conversationId === conversation.id) {
        void refreshConversation({ silent: true });
      }
    };
    const handleTyping = (payload: {
      conversationId: string;
      senderRole: MembershipRole;
      isTyping: boolean;
    }) => {
      if (!conversation?.id || payload.conversationId !== conversation.id) {
        return;
      }

      if (participantRole && payload.senderRole === participantRole) {
        return;
      }

      setTypingState(
        payload.isTyping
          ? {
              senderRole: payload.senderRole,
              isTyping: true,
            }
          : null,
      );
    };
    const handleConnect = () => setLiveConnected(true);
    const handleDisconnect = () => setLiveConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('conversation:updated', syncConversation);
    socket.on('conversation:read', syncConversation);
    socket.on('conversation:typing', handleTyping);

    if (socket.connected) {
      setLiveConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('conversation:updated', syncConversation);
      socket.off('conversation:read', syncConversation);
      socket.off('conversation:typing', handleTyping);
    };
  }, [activeSession?.accessToken, conversation?.id, participantRole, refreshConversation]);

  useEffect(() => {
    if (!activeSession?.accessToken || !conversation?.id) {
      return;
    }

    const socket = getConversationSocket(activeSession.accessToken);
    socket.emit('conversation:join', {
      conversationId: conversation.id,
    });

    return () => {
      socket.emit('conversation:leave', {
        conversationId: conversation.id,
      });
    };
  }, [activeSession?.accessToken, conversation?.id]);

  const attachmentHint = useMemo(() => {
    if (!selectedFile) {
      return 'Adjuntos hasta 10 MB.';
    }

    return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
  }, [selectedFile]);

  const typingLabel = useMemo(() => {
    if (!typingState?.isTyping || !conversation) {
      return null;
    }

    if (typingState.senderRole === 'BUYER') {
      return `${conversation.buyerCompanyName} esta escribiendo...`;
    }

    if (typingState.senderRole === 'SUPPLIER') {
      return `${conversation.supplierCompanyName} esta escribiendo...`;
    }

    return 'La otra parte esta escribiendo...';
  }, [conversation, typingState]);

  const rolePath = useMemo(
    () => getRolePath(activeSession, participantRole, conversation?.contextType === 'DIRECT'),
    [activeSession, participantRole],
  );

  const detailHref = useMemo(() => {
    if (!conversation) {
      return null;
    }

    if (conversation.quoteId) {
      return `/dashboard/${rolePath}/cotizaciones/${conversation.quoteId}`;
    }

    if (conversation.requestId && rolePath === 'comprador') {
      return `/dashboard/comprador/solicitudes/${conversation.requestId}`;
    }

    return null;
  }, [conversation, rolePath]);

  const detailLabel = useMemo(() => {
    if (!conversation) {
      return null;
    }

    if (conversation.quoteId) {
      return 'Ver cotizacion';
    }

    if (conversation.requestId && rolePath === 'comprador') {
      return 'Ver solicitud';
    }

    return null;
  }, [conversation, rolePath]);

  const counterpartLabel = useMemo(() => {
    if (!conversation) {
      return null;
    }

    // La otra empresa: si estoy del lado comprador (o soy quien inició un chat
    // directo), es la proveedora; si no, la compradora.
    return participantRole === 'BUYER' || (!participantRole && rolePath === 'comprador')
      ? conversation.supplierCompanyName
      : conversation.buyerCompanyName;
  }, [conversation, participantRole, rolePath]);

  const counterpartLogo = useMemo(() => {
    if (!conversation) {
      return null;
    }

    // La otra empresa: si estoy del lado comprador (o soy quien inició un chat
    // directo), es la proveedora; si no, la compradora.
    return participantRole === 'BUYER' || (!participantRole && rolePath === 'comprador')
      ? conversation.supplierCompanyLogoUrl
      : conversation.buyerCompanyLogoUrl;
  }, [conversation, participantRole, rolePath]);

  const messageCount = conversation?.messages?.length ?? 0;
  const attachmentCount =
    conversation?.messages?.filter((item) => item.attachmentBase64 && item.attachmentName).length ?? 0;
  const hasActiveFilters = search.length > 0 || from.length > 0 || to.length > 0;
  const canSend = message.trim().length > 0 || Boolean(selectedFile);

  function resetFilters() {
    setSearch('');
    setFrom('');
    setTo('');
  }

  const emitTypingState = useCallback(
    (isTyping: boolean) => {
      if (!activeSession?.accessToken || !conversation?.id) {
        return;
      }

      const socket = getConversationSocket(activeSession.accessToken);
      socket.emit('conversation:typing', {
        conversationId: conversation.id,
        isTyping,
      });
    },
    [activeSession?.accessToken, conversation?.id],
  );

  async function handleSend() {
    if (!activeSession?.accessToken || !conversation) {
      return;
    }

    const body = message.trim();
    const file = selectedFile;
    if (!body && !file) {
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      setError('El archivo adjunto supera el maximo permitido de 10 MB.');
      return;
    }

    const conversationId = conversation.id;
    const ownCompanyName =
      participantRole === 'SUPPLIER' ? conversation.supplierCompanyName : conversation.buyerCompanyName;
    const tempId = `temp-${Date.now()}`;

    // Optimista: el mensaje aparece al instante y el input se limpia ya mismo,
    // sin esperar el round-trip. El adjunto real se ve cuando el server confirma.
    const optimisticMessage: ConversationMessageRecord = {
      id: tempId,
      body,
      senderRole: participantRole ?? 'BUYER',
      senderCompanyName: ownCompanyName ?? null,
      attachmentName: file?.name ?? null,
      attachmentMimeType: file?.type ?? null,
      attachmentSize: file?.size ?? null,
      attachmentBase64: null,
      createdAt: new Date().toISOString(),
      buyerReadAt: null,
      supplierReadAt: null,
    };

    setConversation((current) =>
      current && current.id === conversationId
        ? { ...current, messages: [...(current.messages ?? []), optimisticMessage] }
        : current,
    );
    setMessage('');
    setSelectedFile(null);
    setTypingState(null);
    emitTypingState(false);
    setError(null);
    setSending(true);

    try {
      const payload: SendConversationMessagePayload = {
        body: body || undefined,
      };

      if (file) {
        payload.attachmentName = file.name;
        payload.attachmentMimeType = file.type || 'application/octet-stream';
        payload.attachmentSize = file.size;
        payload.attachmentBase64 = await fileToBase64(file);
      }

      const nextConversation = await atarApi.sendConversationMessage(
        conversationId,
        payload,
        activeSession.accessToken,
      );

      // El server devuelve la conversacion real: reemplaza al mensaje temporal.
      setConversation(nextConversation);
    } catch (sendError) {
      // Rollback: se quita el mensaje optimista y se restaura lo escrito.
      setConversation((current) =>
        current && current.id === conversationId
          ? { ...current, messages: (current.messages ?? []).filter((item) => item.id !== tempId) }
          : current,
      );
      setMessage(body);
      setSelectedFile(file);
      setError(sendError instanceof Error ? sendError.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  }

  function handleMessageChange(nextValue: string) {
    setMessage(nextValue);

    if (!conversation?.id || !liveConnected) {
      return;
    }

    emitTypingState(nextValue.trim().length > 0);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      emitTypingState(false);
      typingTimeoutRef.current = null;
    }, 1200);
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      if (conversation?.id && liveConnected) {
        emitTypingState(false);
      }
    };
  }, [conversation?.id, emitTypingState, liveConnected]);

  if (!activeSession?.accessToken && guestContent) {
    return <>{guestContent}</>;
  }

  if (!activeSession?.accessToken) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="max-w-sm text-sm leading-7 text-slate-600">{description}</p>
        <Link className={dashboardPrimaryButtonClassName} href={loginHref}>
          Iniciar sesión para conversar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2.5 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {onBack ? (
            <button
              type="button"
              aria-label="Volver a conversaciones"
              onClick={onBack}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 xl:hidden"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          ) : null}
          <CompanyLogo
            className="h-9 w-9 sm:h-11 sm:w-11"
            logoUrl={counterpartLogo}
            name={counterpartLabel ?? title}
            rounded="rounded-2xl"
            tone="border border-slate-200 bg-white text-indigo-600"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-950">{counterpartLabel ?? title}</p>
              {conversation ? (
                <span className="hidden shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600 sm:inline">
                  {getContextLabel(conversation.contextType)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${liveConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}
                title={liveConnected ? 'Conectado en tiempo real' : 'Reconectando'}
              />
              {/* De qué se está hablando (producto, solicitud o cotización). */}
              <span className="truncate">
                {conversation?.contextType !== 'DIRECT' && conversation?.contextTitle
                  ? conversation.contextTitle
                  : liveConnected
                    ? 'En línea'
                    : 'Reconectando...'}
              </span>
            </p>
          </div>
        </div>
        {detailHref && detailLabel ? (
          <Link
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            href={detailHref}
          >
            {detailLabel}
          </Link>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto bg-white px-3 py-3 sm:bg-[linear-gradient(180deg,#f8f9fc_0%,#f3f5fb_100%)] sm:px-5 sm:py-4">
        <div className="mx-auto w-full max-w-[880px]">
          {loading ? (
            <LoadingState label="Cargando conversación..." className="py-8" />
          ) : !conversation || (conversation.messages?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Todavía no hay mensajes. Escribí el primero 👇</p>
          ) : (
            conversation.messages?.map((item, index, all) => {
              const isOwn = participantRole ? item.senderRole === participantRole : item.senderRole === 'BUYER';
              const readAt =
                participantRole === 'BUYER'
                  ? item.supplierReadAt
                  : participantRole === 'SUPPLIER'
                    ? item.buyerReadAt
                    : null;
              const previous = all[index - 1];
              const next = all[index + 1];
              const newDay = !previous || formatDay(previous.createdAt) !== formatDay(item.createdAt);
              // Mensajes seguidos del mismo lado (menos de 5 minutos) van juntos:
              // menos espacio y el logo solo en el último.
              const sameAs = (other?: typeof item) =>
                Boolean(other) &&
                other!.senderRole === item.senderRole &&
                Math.abs(new Date(other!.createdAt).getTime() - new Date(item.createdAt).getTime()) < 5 * 60_000 &&
                formatDay(other!.createdAt) === formatDay(item.createdAt);
              const groupedWithPrevious = !newDay && sameAs(previous);
              const lastOfGroup = !sameAs(next);

              return (
                <div key={item.id} className={groupedWithPrevious ? 'mt-1' : 'mt-4 first:mt-0'}>
                  {newDay ? (
                    <div className="mb-4 flex justify-center">
                      <span className="rounded-full bg-white px-3 py-1 text-[11.5px] font-semibold text-slate-500 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                        {formatDay(item.createdAt)}
                      </span>
                    </div>
                  ) : null}
                  <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn ? (
                      lastOfGroup ? (
                        <CompanyLogo
                          className="hidden h-8 w-8 shrink-0 sm:flex"
                          logoUrl={counterpartLogo}
                          name={item.senderCompanyName ?? counterpartLabel ?? title}
                          rounded="rounded-full"
                          textClassName="text-[10px] font-bold"
                          tone="border border-slate-200 bg-white text-slate-600"
                        />
                      ) : (
                        <span aria-hidden="true" className="hidden w-8 shrink-0 sm:block" />
                      )
                    ) : null}
                    <div
                      className={`max-w-[85%] px-3.5 py-2 text-[14px] sm:max-w-[68%] ${
                        isOwn
                          ? `rounded-[18px] bg-indigo-600 text-white ${lastOfGroup ? 'rounded-br-[6px]' : ''}`
                          : `rounded-[18px] border border-slate-200 bg-white text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ${lastOfGroup ? 'rounded-bl-[6px]' : ''}`
                      }`}
                    >
                      {item.body ? <p className="whitespace-pre-wrap leading-[1.45]">{item.body}</p> : null}
                      {item.attachmentBase64 && item.attachmentName ? (
                        <a
                          className={`mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${
                            isOwn ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-700'
                          }`}
                          download={item.attachmentName}
                          href={`data:${item.attachmentMimeType ?? 'application/octet-stream'};base64,${item.attachmentBase64}`}
                        >
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8zM14 2v6h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                          {item.attachmentName}
                        </a>
                      ) : null}
                      <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10.5px] ${isOwn ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {formatTime(item.createdAt)}
                        {isOwn ? (
                          <span className={readAt ? 'text-sky-200' : ''} title={readAt ? 'Leído' : 'Enviado'}>
                            {readAt ? '✓✓' : '✓'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {typingLabel ? (
            <div className="mt-3 flex justify-start">
              <div className="rounded-[1.35rem] rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-xs italic text-slate-400 shadow-sm">
                {typingLabel}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
        {error ? <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}
        <div className="mx-auto w-full max-w-[880px]">
          <div className="flex items-end gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:rounded-2xl sm:bg-white sm:py-2 sm:shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
            <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 sm:rounded-xl sm:border sm:border-slate-200">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M21.44 11.05l-8.49 8.49a6 6 0 01-8.49-8.49l8.49-8.49a4 4 0 115.66 5.66L9.41 17.4a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <input className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            <textarea
              className="max-h-28 min-h-[36px] w-full resize-none bg-transparent py-1.5 text-sm text-slate-950 outline-none placeholder:text-slate-400"
              onChange={(event) => handleMessageChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (canSend && !sending) {
                    void handleSend();
                  }
                }
              }}
              placeholder="Escribí un mensaje..."
              rows={1}
              value={message}
            />
            <button
              aria-label="Enviar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40 sm:rounded-xl sm:shadow-[0_10px_26px_rgba(79,70,229,0.25)]"
              disabled={sending || !canSend}
              onClick={() => void handleSend()}
              type="button"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
          {selectedFile ? (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="truncate">{attachmentHint}</span>
              <button className="font-semibold text-slate-400 hover:text-slate-700" onClick={() => setSelectedFile(null)} type="button">
                Quitar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
