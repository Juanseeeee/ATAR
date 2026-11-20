'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import CompanyLogo from '@/components/dashboard/company-logo';
import ConversationListItem from '@/components/chat/conversation-list-item';
import CustomerMiniCard from '@/components/chat/customer-mini-card';
import ConversationPanel from '@/components/chat/conversation-panel';
import SupplierDashboardShell from '@/components/dashboard/supplier-dashboard-shell';
import { atarApi, SUPPLIER_ROLE_LABELS, type ConversationRecord, type SupplierContactRecord } from '@/lib/atar-api';
import { LoadingState } from '@/components/ui/spinner';
import { useSupplierDashboardData } from '@/lib/dashboard-hooks';

/**
 * La otra empresa de la conversación. En las de clientes es el comprador; en un
 * chat directo entre proveedoras depende de quién lo inició (viewerRole).
 */
function counterpart(conversation: ConversationRecord) {
  return conversation.viewerRole === 'BUYER'
    ? { name: conversation.supplierCompanyName, logoUrl: conversation.supplierCompanyLogoUrl }
    : { name: conversation.buyerCompanyName, logoUrl: conversation.buyerCompanyLogoUrl };
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export default function SupplierMessagesPage() {
  return (
    <Suspense fallback={null}>
      <SupplierMessagesWithParams />
    </Suspense>
  );
}

function SupplierMessagesWithParams() {
  // El Inicio enlaza con ?tab=sin-leer para abrir solo las conversaciones pendientes.
  const searchParams = useSearchParams();
  const unread = searchParams?.get('tab') === 'sin-leer';
  // ?c= abre directamente una conversación (desde una notificación de mensaje).
  const target = searchParams?.get('c') ?? null;
  return <SupplierMessagesContent key={`${unread}-${target}`} initialConversationId={target} initialTab={unread ? 'unread' : 'all'} />;
}

function SupplierMessagesContent({ initialTab, initialConversationId }: { initialTab: 'all' | 'unread'; initialConversationId: string | null }) {
  const { session, loading: dashboardLoading, error: dashboardError } = useSupplierDashboardData();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>(initialTab);
  // Conversación elegida a mano (o la del enlace ?c=).
  const [pickedId, setSelectedId] = useState<string | null>(initialConversationId);
  // Chat estilo Instagram en mobile: lista -> tocar -> conversación a pantalla completa.
  const [mobileChatOpen, setMobileChatOpen] = useState(Boolean(initialConversationId));
  // "Nuevo chat" (como en WhatsApp): directorio de las demás proveedoras.
  const [composing, setComposing] = useState(false);
  const [contacts, setContacts] = useState<SupplierContactRecord[] | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    const accessToken = session.accessToken;
    let cancelled = false;

    async function loadConversations() {
      try {
        setLoading(true);
        setError(null);
        const items = await atarApi.getConversations(undefined, accessToken);
        if (!cancelled) {
          setConversations(items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las conversaciones.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadConversations();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const unreadTotal = conversations.filter((conversation) => conversation.unreadCount > 0).length;

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...conversations]
      // Las conversaciones abiertas sin ningún mensaje no se listan (salvo la elegida).
      .filter((conversation) => Boolean(conversation.lastMessage) || conversation.id === pickedId)
      .filter((conversation) => {
        if (activeTab === 'unread' && conversation.unreadCount === 0) {
          return false;
        }
        if (!query) {
          return true;
        }
        return [counterpart(conversation).name, conversation.contextTitle, conversation.lastMessage?.body ?? '']
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const leftTime = new Date(left.lastMessageAt ?? left.lastMessage?.createdAt ?? 0).getTime();
        const rightTime = new Date(right.lastMessageAt ?? right.lastMessage?.createdAt ?? 0).getTime();
        return rightTime - leftTime;
      });
  }, [conversations, search, activeTab, pickedId]);

  // La elegida si sigue en la lista (o si todavía está cargando, para no perder
  // la del enlace); si no, la primera de la lista.
  const selectedId =
    pickedId && (loading || conversations.some((conversation) => conversation.id === pickedId))
      ? pickedId
      : (filteredConversations[0]?.id ?? null);

  const activeConversation = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  // El directorio se carga la primera vez que se abre "Nuevo chat".
  useEffect(() => {
    if (!composing || contacts || !session?.accessToken) {
      return;
    }
    let cancelled = false;
    atarApi
      .getConversationContacts(session.accessToken)
      .then((list) => !cancelled && setContacts(list))
      .catch(() => !cancelled && setContacts([]));
    return () => {
      cancelled = true;
    };
  }, [composing, contacts, session?.accessToken]);

  const filteredContacts = useMemo(() => {
    const query = normalize(contactSearch.trim());
    return (contacts ?? []).filter(
      (contact) => !query || normalize([contact.name, contact.city ?? '', ...contact.sellers].join(' ')).includes(query),
    );
  }, [contacts, contactSearch]);

  async function startDirectChat(contact: SupplierContactRecord) {
    if (!session?.accessToken) {
      return;
    }
    setOpeningId(contact.id);
    try {
      const conversation = await atarApi.getOrCreateDirectConversation(contact.id, session.accessToken);
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setSelectedId(conversation.id);
      setComposing(false);
      setContactSearch('');
      setMobileChatOpen(true);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'No se pudo abrir el chat.');
    } finally {
      setOpeningId(null);
    }
  }

  const showCustomerCard = Boolean(activeConversation && activeConversation.contextType !== 'DIRECT');

  const detailLink = useMemo(() => {
    if (!activeConversation) {
      return null;
    }
    if (activeConversation.contextType === 'REQUEST' && activeConversation.requestId) {
      return { href: `/dashboard/proveedor/solicitudes/${activeConversation.requestId}`, label: 'Ver solicitud' };
    }
    if (activeConversation.contextType === 'QUOTE' && activeConversation.quoteId) {
      return { href: `/dashboard/proveedor/cotizaciones/${activeConversation.quoteId}`, label: 'Ver cotización' };
    }
    return null;
  }, [activeConversation]);

  return (
    <SupplierDashboardShell fullBleed searchPlaceholder="Buscar mensajes o clientes..." session={session}>
      <div className="flex h-full min-h-0 flex-col bg-white">
        {error ?? dashboardError ? (
          <div className="shrink-0 border-b border-rose-200 bg-rose-100 px-5 py-3 text-sm text-rose-700">
            {error ?? dashboardError}
          </div>
        ) : null}

        <div
          className={`grid min-h-0 flex-1 gap-0 overflow-hidden border-t border-slate-300 bg-white ${
            showCustomerCard ? 'xl:grid-cols-[320px_minmax(0,1fr)_290px] 2xl:grid-cols-[340px_minmax(0,1fr)_320px]' : 'xl:grid-cols-[340px_minmax(0,1fr)]'
          }`}
        >
          <section data-tour="messages-list" className={`min-h-0 flex-col border-b border-slate-300 bg-white p-4 xl:flex xl:border-b-0 xl:border-r ${mobileChatOpen ? 'hidden' : 'flex'}`}>
            {composing ? (
              <NewChatPanel
                contacts={filteredContacts}
                loading={contacts === null}
                onBack={() => {
                  setComposing(false);
                  setContactSearch('');
                }}
                onPick={startDirectChat}
                onSearch={setContactSearch}
                openingId={openingId}
                search={contactSearch}
              />
            ) : (
              <>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5">
                <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <path d="M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <input
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar conversaciones..."
                  value={search}
                />
              </div>
              <button
                aria-label="Nuevo chat con otro proveedor"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700"
                data-tour="messages-new-chat"
                onClick={() => setComposing(true)}
                title="Nuevo chat"
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.1A8.5 8.5 0 1 1 21 12z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.9" />
                  <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-6 border-b border-slate-300 pb-3 text-xs font-semibold">
              {[
                { key: 'all' as const, label: 'Todas', count: conversations.filter((item) => item.lastMessage).length },
                { key: 'unread' as const, label: 'No leídos', count: unreadTotal },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    className={`relative pb-2 transition ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    <span className="flex items-center gap-1.5">
                      {tab.label}
                      <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{tab.count}</span>
                    </span>
                    {isActive ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-indigo-600" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              {dashboardLoading || loading ? (
                <div className="rounded-2xl bg-seller-surface px-4 py-8"><LoadingState label="Cargando conversaciones..." /></div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-seller-surface px-4 py-8 text-sm text-slate-500">
                  Todavía no hay conversaciones.{' '}
                  <button className="font-semibold text-indigo-600 hover:underline" onClick={() => setComposing(true)} type="button">
                    Escribile a otro proveedor
                  </button>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    active={activeConversation?.id === conversation.id}
                    conversation={conversation}
                    logoUrl={counterpart(conversation).logoUrl}
                    name={counterpart(conversation).name}
                    onSelect={() => {
                      setSelectedId(conversation.id);
                      setMobileChatOpen(true);
                    }}
                  />
                ))
              )}
            </div>
              </>
            )}
          </section>

          <section data-tour="messages-chat" className={`min-h-0 flex-col overflow-hidden bg-white xl:flex ${mobileChatOpen ? 'flex' : 'hidden'}`}>
            {selectedId ? (
              <>
                <div className="min-h-0 flex-1">
                  <ConversationPanel
                    conversationId={selectedId}
                    description={activeConversation ? `Conversación con ${counterpart(activeConversation).name}.` : 'Conversación'}
                    mode="existing"
                    session={session}
                    title={activeConversation?.contextTitle ?? 'Conversación'}
                    onBack={() => setMobileChatOpen(false)}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                Seleccioná una conversación para ver el detalle.
              </div>
            )}
          </section>

          {/* Ficha del cliente con anotaciones del equipo (no en los chats directos entre proveedores). */}
          {showCustomerCard && activeConversation && session?.accessToken ? (
            <div className="hidden min-h-0 xl:block">
              <CustomerMiniCard
                key={activeConversation.buyerCompanyId}
                accessToken={session.accessToken}
                buyerCompanyId={activeConversation.buyerCompanyId}
                context={detailLink ? { label: detailLink.label.replace(/^Ver /, ''), title: activeConversation.contextTitle, href: detailLink.href } : null}
                city={activeConversation.buyerCompanyCity}
                country={activeConversation.buyerCompanyCountry}
                logoUrl={activeConversation.buyerCompanyLogoUrl}
                name={activeConversation.buyerCompanyName}
              />
            </div>
          ) : null}
        </div>
      </div>
    </SupplierDashboardShell>
  );
}

/** Directorio de "Nuevo chat": las demás proveedoras con sus vendedores. */
function NewChatPanel({
  contacts,
  loading,
  search,
  openingId,
  onSearch,
  onPick,
  onBack,
}: {
  contacts: SupplierContactRecord[];
  loading: boolean;
  search: string;
  openingId: string | null;
  onSearch: (value: string) => void;
  onPick: (contact: SupplierContactRecord) => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          aria-label="Volver a las conversaciones"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
          onClick={onBack}
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path d="m15 6-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>
        <div>
          <p className="text-[15px] font-bold text-slate-950">Nuevo chat</p>
          <p className="text-[12px] text-slate-500">Escribile a otro proveedor o a su equipo de ventas.</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5">
        <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
        <input
          aria-label="Buscar proveedor o vendedor"
          autoFocus
          className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar proveedor, vendedor o ciudad..."
          value={search}
        />
      </div>
      <p className="mt-4 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Proveedores en ATAR</p>
      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {loading ? (
          <div className="rounded-2xl bg-seller-surface px-4 py-8"><LoadingState label="Cargando proveedores..." /></div>
        ) : contacts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            {search.trim() ? 'No encontramos proveedores con ese nombre.' : 'Todavía no hay otros proveedores.'}
          </p>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.id}
              className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-seller-surface disabled:opacity-60"
              disabled={openingId !== null}
              onClick={() => onPick(contact)}
              type="button"
            >
              <CompanyLogo
                className="h-11 w-11"
                logoUrl={contact.logoUrl}
                name={contact.name}
                rounded="rounded-full"
                tone="border border-slate-300 bg-white text-slate-950"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-slate-950">{contact.name}</span>
                  {contact.isVerified ? (
                    <svg aria-label="Verificado" className="h-3.5 w-3.5 shrink-0 text-indigo-600" fill="currentColor" role="img" viewBox="0 0 24 24">
                      <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7.9-2.9-.9-2.9 2.5-1.7.9-2.9 3 .2z" />
                    </svg>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {[contact.supplierRole ? SUPPLIER_ROLE_LABELS[contact.supplierRole] : 'Proveedor', contact.city].filter(Boolean).join(' · ')}
                </span>
                {contact.sellers.length > 0 ? (
                  <span className="block truncate text-xs text-slate-400">
                    {contact.sellers.length === 1 ? 'Vendedor' : 'Vendedores'}: {contact.sellers.join(', ')}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-semibold text-indigo-600">{openingId === contact.id ? 'Abriendo…' : 'Escribir'}</span>
            </button>
          ))
        )}
      </div>
    </>
  );
}
