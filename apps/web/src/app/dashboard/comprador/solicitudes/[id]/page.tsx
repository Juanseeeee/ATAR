'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { SupplierAvatar } from '@/components/quotes/supplier-avatar';
import { LoadingState } from '@/components/ui/spinner';
import { formatRequestCode } from '@/lib/request-code';
import {
  atarApi,
  type OrderFulfillmentStatus,
  type QuoteRecord,
  type RequestRecord,
} from '@/lib/atar-api';
import {
  bestPriceOf,
  comparableQuotesOf,
  coverageOf,
  fastestOf,
  formatMoneyShort,
  invitedSupplierNames,
  requestedQuantity,
  requestImageFor,
} from '@/lib/quote-compare';

function formatCurrency(value: number | null, currency = 'ARS') {
  if (typeof value !== 'number') {
    return 'A consultar';
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// Etapas de la solicitud que se muestran arriba del detalle.
const REQUEST_STAGES = ['Publicada', 'Recibiendo propuestas', 'Comparando', 'Compra asignada', 'Entregado'] as const;

function stageIndexOf(request: RequestRecord | null, comparableCount: number) {
  if (!request) return 0;
  switch (request.status) {
    case 'DRAFT':
      return 0;
    case 'PUBLISHED':
    case 'REVIEWING':
      return comparableCount > 0 ? 2 : 1;
    case 'AWARDED':
    case 'NEGOTIATING':
      return 3;
    case 'ORDER_ISSUED':
      return 4;
    case 'COMPLETED':
      return REQUEST_STAGES.length;
    default:
      return 1;
  }
}

function compareQuotes(a: QuoteRecord, b: QuoteRecord) {
  const amountA = a.amount ?? Number.MAX_SAFE_INTEGER;
  const amountB = b.amount ?? Number.MAX_SAFE_INTEGER;
  return amountA - amountB;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getRequestStatusStyles(status: RequestRecord['status']) {
  if (status === 'ORDER_ISSUED') {
    return 'bg-[#dbe6ff] text-[#1238d6]';
  }

  if (status === 'NEGOTIATING') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'AWARDED') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'REVIEWING') {
    return 'bg-amber-100 text-amber-700';
  }

  if (status === 'CANCELLED') {
    return 'bg-rose-100 text-rose-700';
  }

  if (status === 'COMPLETED') {
    return 'bg-emerald-100 text-emerald-700';
  }

  return 'bg-[#dbe6ff] text-[#1238d6]';
}

function getRequestStatusLabel(status: RequestRecord['status']) {
  if (status === 'AWARDED') {
    return 'Adjudicada';
  }

  if (status === 'NEGOTIATING') {
    return 'En negociación';
  }

  if (status === 'ORDER_ISSUED') {
    return 'Orden emitida';
  }

  if (status === 'COMPLETED') {
    return 'Completada';
  }

  if (status === 'DRAFT') {
    return 'Borrador';
  }

  if (status === 'PUBLISHED') {
    return 'Publicada';
  }

  if (status === 'REVIEWING') {
    return 'En evaluación';
  }

  if (status === 'CANCELLED') {
    return 'Cancelada';
  }

  return status;
}

function getFulfillmentLabel(status: OrderFulfillmentStatus) {
  if (status === 'IN_PRODUCTION') {
    return 'En produccion';
  }

  if (status === 'ISSUED') {
    return 'Emitida';
  }

  if (status === 'CONFIRMED') {
    return 'Confirmada';
  }

  if (status === 'DISPATCHED') {
    return 'Despachada';
  }

  return 'Entregada';
}

const FULFILLMENT_STEPS: OrderFulfillmentStatus[] = [
  'ISSUED',
  'CONFIRMED',
  'IN_PRODUCTION',
  'DISPATCHED',
  'DELIVERED',
];

function parseRequestDescription(description: string) {
  return description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        return { label: 'Detalle', value: line };
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      };
    });
}

function DetailIcon({ type }: { type: string }) {
  if (type === 'package') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'layers') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M12 4l7 4-7 4-7-4 7-4zM5 12l7 4 7-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'scale') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M6 7h12M8 7l1.5 10h5L16 7M12 7V4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'ruler') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M4 8l4-4 12 12-4 4L4 8zM9 7l1.5 1.5M12 10l1.5 1.5M15 13l1.5 1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'grid') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'printer') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M7 8V4h10v4M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 14h10v6H7z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'user') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M20 21a8 8 0 10-16 0M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'file') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-5-6zM14 2v6h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'dot') {
    return <span className="h-2.5 w-2.5 rounded-full bg-current" />;
  }
  if (type === 'pin') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1118 0z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M12 10a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'calendar') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'clock') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.77.62 2.6a2 2 0 01-.45 2.11L8.04 9.96a16 16 0 006 6l1.53-1.26a2 2 0 012.11-.45c.83.29 1.7.5 2.6.62A2 2 0 0122 16.92z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export default function BuyerRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, refreshSession, role } = useAuth();
  const [request, setRequest] = useState<RequestRecord | null>(null);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressingAction, setProgressingAction] = useState<
    'START_NEGOTIATION' | 'ISSUE_ORDER' | 'CONFIRM_RECEIPT' | null
  >(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [orderForm, setOrderForm] = useState({
    orderNumber: '',
    promisedDate: '',
    notes: '',
  });

  const requestId = typeof params.id === 'string' ? params.id : '';

  const syncRequestState = useCallback(
    async (accessToken: string) => {
      const detail = await atarApi.getRequestDetail(requestId, accessToken);
      setRequest(detail);
      setQuotes(detail.quotes ?? []);
      return detail;
    },
    [requestId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!session?.accessToken) {
        return;
      }

      if (role && role !== 'BUYER') {
        router.replace('/dashboard/proveedor');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const fresh = await refreshSession();
        if (!fresh || cancelled) {
          return;
        }

        if (cancelled) {
          return;
        }

        await syncRequestState(fresh.accessToken);
        // Vuelta desde el comparador después de asignar la compra.
        if (!cancelled && new URLSearchParams(window.location.search).get('asignada') === '1') {
          setMessage('Listo, asignaste la compra. El proveedor ya recibió la notificación.');
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (detailError) {
        if (!cancelled) {
          setError(detailError instanceof Error ? detailError.message : 'No se pudo cargar el detalle.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [refreshSession, role, router, session?.accessToken, syncRequestState]);

  useEffect(() => {
    setOrderForm({
      orderNumber: request?.order?.orderNumber ?? '',
      promisedDate: toDateInputValue(request?.order?.promisedDate),
      notes: request?.order?.notes ?? '',
    });
  }, [request?.order]);

  async function handleDeleteRequest() {
    if (!session?.accessToken || !request) {
      return;
    }
    const confirmed = window.confirm(
      'Vas a eliminar esta solicitud. Esta acción no se puede deshacer.\n\n¿Confirmás?',
    );
    if (!confirmed) {
      return;
    }
    try {
      setDeleting(true);
      setError(null);
      await atarApi.deleteRequest(request.id, session.accessToken);
      router.push('/dashboard/comprador/solicitudes');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la solicitud.',
      );
      setDeleting(false);
      setActionsOpen(false);
    }
  }

  async function handleCancelRequest() {
    if (!session?.accessToken || !request) {
      return;
    }
    const confirmed = window.confirm(
      'Vas a cancelar esta solicitud. Las cotizaciones recibidas quedarán rechazadas y la solicitud se cerrará (queda en el historial). ¿Confirmás?',
    );
    if (!confirmed) {
      return;
    }
    try {
      setCancelling(true);
      setError(null);
      await atarApi.cancelRequest(request.id, session.accessToken);
      await syncRequestState(session.accessToken);
      setActionsOpen(false);
      setMessage('Solicitud cancelada. Los proveedores que cotizaron fueron notificados.');
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar la solicitud.');
    } finally {
      setCancelling(false);
    }
  }

  // Asignar la compra desde el bloque de "próximo paso", sin ir al comparador.
  const [awardingId, setAwardingId] = useState<string | null>(null);
  async function handleAward(quote: QuoteRecord) {
    if (!session?.accessToken || !request) return;
    const name = quote.supplierCompany?.name ?? 'este proveedor';
    const confirmed = window.confirm(
      `Vas a asignarle la compra a ${name} por ${formatCurrency(quote.amount, quote.currency)}.\n\nLas demás cotizaciones quedarán rechazadas y la solicitud se cerrará para nuevas propuestas.`,
    );
    if (!confirmed) return;
    try {
      setAwardingId(quote.id);
      setError(null);
      setMessage(null);
      await atarApi.awardQuote(request.id, { quoteId: quote.id }, session.accessToken);
      await syncRequestState(session.accessToken);
      setMessage(`Le asignaste la compra a ${name}. Ahora emití la orden de compra.`);
    } catch (awardError) {
      setError(awardError instanceof Error ? awardError.message : 'No se pudo asignar la compra.');
    } finally {
      setAwardingId(null);
    }
  }

  async function handleProgress(action: 'START_NEGOTIATION' | 'ISSUE_ORDER' | 'CONFIRM_RECEIPT') {
    if (!session?.accessToken || !request) {
      return;
    }

    const confirmations = {
      START_NEGOTIATION:
        'Vas a iniciar la negociacion con el proveedor adjudicado. El pedido quedara en seguimiento comercial.',
      ISSUE_ORDER:
        'Vas a emitir la orden de compra al proveedor adjudicado. Recien ahi el proveedor puede empezar a preparar el pedido.',
      CONFIRM_RECEIPT:
        'Vas a confirmar que recibiste el pedido. Esto cierra la operacion como completada.',
    } as const;

    const successMessages = {
      START_NEGOTIATION: 'La solicitud paso a negociacion correctamente.',
      ISSUE_ORDER: 'Orden emitida. El proveedor ya puede avanzar con el cumplimiento.',
      CONFIRM_RECEIPT: 'Confirmaste la recepcion. La operacion quedo completada.',
    } as const;

    const confirmed = window.confirm(confirmations[action]);
    if (!confirmed) {
      return;
    }

    try {
      setProgressingAction(action);
      setError(null);
      setMessage(null);
      await atarApi.progressRequest(request.id, { action }, session.accessToken);
      await syncRequestState(session.accessToken);
      setMessage(successMessages[action]);
    } catch (progressError) {
      setError(
        progressError instanceof Error
          ? progressError.message
          : 'No se pudo avanzar el estado comercial de la solicitud.',
      );
    } finally {
      setProgressingAction(null);
    }
  }

  async function handleSaveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || !request || request.status !== 'ORDER_ISSUED') {
      return;
    }

    try {
      setSavingOrder(true);
      setError(null);
      setMessage(null);
      await atarApi.upsertOrder(
        request.id,
        {
          orderNumber: orderForm.orderNumber || undefined,
          promisedDate: orderForm.promisedDate || undefined,
          notes: orderForm.notes || undefined,
        },
        session.accessToken,
      );
      await syncRequestState(session.accessToken);
      setMessage('Orden y seguimiento actualizados correctamente.');
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : 'No se pudo actualizar la orden.');
    } finally {
      setSavingOrder(false);
    }
  }

  const sortedQuotes = useMemo(() => {
    return quotes.slice().sort((a, b) => {
      if (request?.awardedQuoteId && a.id === request.awardedQuoteId) {
        return -1;
      }

      if (request?.awardedQuoteId && b.id === request.awardedQuoteId) {
        return 1;
      }

      return compareQuotes(a, b);
    });
  }, [quotes, request?.awardedQuoteId]);

  // Cotizaciones vigentes: las rechazadas quedan fuera de la comparacion.
  const comparableQuotes = useMemo(() => comparableQuotesOf(quotes), [quotes]);
  const bestPrice = useMemo(() => bestPriceOf(comparableQuotes, request?.items ?? []), [comparableQuotes, request?.items]);
  const fastest = useMemo(() => fastestOf(comparableQuotes), [comparableQuotes]);
  const awardedQuote = useMemo(
    () => quotes.find((quote) => quote.id === request?.awardedQuoteId) ?? null,
    [quotes, request?.awardedQuoteId],
  );
  const stageIndex = stageIndexOf(request, comparableQuotes.length);
  const invitedCount = request ? Math.max(invitedSupplierNames(request, quotes).length, quotes.length) : 0;
  const respondedCount = quotes.filter((quote) => quote.status !== 'DRAFT').length;

  // Bloque "próximo paso": qué tiene que hacer el comprador ahora.
  const nextStep = useMemo((): { title: string; text: string; action?: { label: string; href: string } } => {
    const compareHref = `/dashboard/comprador/solicitudes/${requestId}/comparar`;
    if (!request) return { title: '', text: '' };
    if (request.status === 'DRAFT') {
      return {
        title: 'Borrador sin publicar',
        text: 'Terminá de completarla y publicala para que los proveedores te coticen.',
        action: { label: 'Continuar', href: `/dashboard/comprador/solicitudes/nueva?edit=${request.id}` },
      };
    }
    if (request.status === 'COMPLETED') {
      return { title: 'Operación completada', text: 'Recibiste el pedido y el ciclo de esta solicitud está cerrado.' };
    }
    if (awardedQuote) {
      if (request.status === 'ORDER_ISSUED') {
        return {
          title: request.order?.fulfillmentStatus === 'DELIVERED' ? 'Pedido entregado' : 'Pedido en curso',
          text:
            request.order?.fulfillmentStatus === 'DELIVERED'
              ? 'El proveedor marcó el pedido como entregado. Confirmá la recepción para cerrar la operación.'
              : 'El proveedor está preparando tu pedido. Acá ves en qué etapa está.',
        };
      }
      return {
        title: 'Compra asignada',
        text: 'Emití la orden de compra para que el proveedor empiece a preparar el pedido.',
      };
    }
    if (comparableQuotes.length === 0) {
      return {
        title: 'Esperando propuestas',
        text: 'Ya les llegó tu solicitud a los proveedores. Te avisamos apenas uno responda.',
      };
    }
    const allIn = invitedCount > 0 && respondedCount >= invitedCount;
    const plural = comparableQuotes.length === 1 ? 'propuesta' : 'propuestas';
    return {
      title: allIn ? 'Ya podés decidir' : `Recibiste ${comparableQuotes.length} ${plural}`,
      text:
        comparableQuotes.length > 1
          ? `${allIn ? `Llegaron las ${comparableQuotes.length} propuestas.` : 'Todavía pueden llegar más.'} Asigná la compra a la que elijas o comparalas lado a lado.`
          : 'Asignale la compra o esperá a que respondan los demás.',
      action: { label: comparableQuotes.length > 1 ? 'Abrir comparador' : 'Revisar propuesta', href: compareHref },
    };
  }, [request, requestId, awardedQuote, comparableQuotes.length, invitedCount, respondedCount]);
  const fulfillmentIndex = request?.order ? FULFILLMENT_STEPS.indexOf(request.order.fulfillmentStatus) : -1;
  const parsedDescription = useMemo(() => parseRequestDescription(request?.description ?? ''), [request?.description]);
  const deliveryItems = useMemo(() => {
    // Preferimos los campos estructurados (nuevos). Si la solicitud es vieja y
    // no los tiene, caemos al parseo por texto de `description` (legacy).
    const structured: { label: string; value: string }[] = [];
    const dateLabel =
      request?.deliveryMode === 'asap'
        ? 'Lo antes posible'
        : request?.dueDate
          ? formatDate(request.dueDate)
          : null;
    if (request?.deliveryAddress) structured.push({ label: 'Ubicación de entrega', value: request.deliveryAddress });
    if (request?.deliveryCity) structured.push({ label: 'Ciudad', value: request.deliveryCity });
    if (dateLabel) structured.push({ label: 'Fecha de entrega', value: dateLabel });
    if (request?.deliverySchedule) structured.push({ label: 'Horario de recepción', value: request.deliverySchedule });
    if (request?.deliveryContactName) structured.push({ label: 'Contacto en planta', value: request.deliveryContactName });
    if (request?.deliveryPhone) structured.push({ label: 'Teléfono de contacto', value: request.deliveryPhone });
    if (request?.deliveryNotes) structured.push({ label: 'Observaciones', value: request.deliveryNotes });
    if (structured.length > 0) {
      return structured;
    }
    return parsedDescription.filter((item) => {
      const label = item.label.toLowerCase();
      return (
        label.includes('entrega') ||
        label.includes('fecha') ||
        label.includes('horario') ||
        label.includes('contacto') ||
        label.includes('telefono')
      );
    });
  }, [request, parsedDescription]);
  const detailItems = useMemo(() => {
    const items = [
      { label: 'Producto', value: request?.category ?? '-' },
      ...parsedDescription.filter((item) => {
        const label = item.label.toLowerCase();
        return (
          !label.includes('entrega') &&
          !label.includes('fecha') &&
          !label.includes('horario') &&
          !label.includes('contacto') &&
          !label.includes('telefono') &&
          !label.includes('adjuntar') &&
          !label.includes('archivo')
        );
      }),
    ];

    const uniqueItems = items.filter((item, index) => index === items.findIndex((candidate) => candidate.label === item.label));
    return uniqueItems;
  }, [parsedDescription, request?.category]);
  const supplierCards = useMemo(() => {
    type Card = { id: string; name: string; city: string; tag: string; quoted: boolean };
    const norm = (value: string) => value.trim().toLowerCase();
    const tag = `Especialista en ${request?.category ?? 'solicitudes industriales'}`;
    const byName = new Map<string, Card>();

    // 1) Proveedores elegidos al crear la solicitud (nombres, unidos por "|").
    //    Se muestran aunque todavia no hayan cotizado.
    for (const raw of (request?.preferredSupplierName ?? '').split('|')) {
      const name = raw.trim();
      if (!name) continue;
      byName.set(norm(name), { id: `pref-${norm(name)}`, name, city: '', tag, quoted: false });
    }

    // 2) Enriquecer / agregar con las empresas que efectivamente cotizaron.
    const applyCompany = (company?: { id: string; name: string; city: string | null; country: string }) => {
      if (!company) return;
      const key = norm(company.name);
      byName.set(key, {
        id: company.id,
        name: company.name,
        city: [company.city, company.country].filter(Boolean).join(', '),
        tag: byName.get(key)?.tag ?? tag,
        quoted: true,
      });
    };
    for (const quote of sortedQuotes) applyCompany(quote.supplierCompany);
    applyCompany(request?.awardedQuote?.supplierCompany);

    return Array.from(byName.values());
  }, [request?.preferredSupplierName, request?.awardedQuote?.supplierCompany, request?.category, sortedQuotes]);
  const requestTimeline = useMemo(() => (request?.events ?? []).slice(0, 4), [request?.events]);
  const requestCreatedLabel = request ? formatDateTime(request.createdAt) : '-';

  // El comprador puede editar/eliminar mientras la solicitud siga abierta y sin
  // cotizaciones (después el backend igual lo rechaza).
  const canEditRequest =
    Boolean(request) &&
    (request?.status === 'DRAFT' || request?.status === 'PUBLISHED') &&
    (request?.quotes?.length ?? 0) === 0;

  // Cancelar aplica a solicitudes abiertas (sin adjudicar), incluso si ya
  // recibieron cotizaciones (a diferencia de eliminar, que exige 0 cotizaciones).
  const canCancelRequest =
    Boolean(request) &&
    (request?.status === 'DRAFT' || request?.status === 'PUBLISHED' || request?.status === 'REVIEWING');

  useEffect(() => {
    if (!actionsOpen) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActionsOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [actionsOpen]);

  /** Abre el diálogo de impresión con las especificaciones (Guardar como PDF). */
  function handleDownloadSpecs() {
    if (!request) {
      return;
    }
    const esc = (value: string) =>
      value.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
    const items = request.items ?? [];
    const productsHtml = items.length
      ? items
          .map((item, index) => {
            const specs = (item.specifications ?? '')
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => `<li>${esc(line)}</li>`)
              .join('');
            const qty = item.quantity ? `${item.quantity} ${esc(item.unit ?? 'u.')}` : 'Cantidad a definir';
            return `<section class="prod"><h3>${index + 1}. ${esc(item.productName)}</h3>
              <p class="muted">${esc(item.category ?? request.category ?? '')} · ${qty}</p>
              ${specs ? `<ul>${specs}</ul>` : '<p class="muted">Sin especificaciones adicionales.</p>'}</section>`;
          })
          .join('')
      : `<p>${esc(request.description ?? 'Sin especificaciones.')}</p>`;

    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" />
      <title>${esc(request.title ?? 'Solicitud')}</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;margin:40px;line-height:1.5}
        h1{font-size:22px;margin:0 0 4px} h3{font-size:15px;margin:0 0 2px}
        .muted{color:#64748b;font-size:12px;margin:2px 0 8px}
        .prod{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:12px 0}
        ul{margin:6px 0 0;padding-left:18px} li{font-size:13px;margin:2px 0}
        .head{border-bottom:2px solid #1847ff;padding-bottom:10px;margin-bottom:16px}
      </style></head><body>
      <div class="head"><h1>${esc(request.title ?? 'Solicitud de cotización')}</h1>
      <p class="muted">${esc(formatRequestCode(request.id))} · ${esc(request.category ?? '')}</p></div>
      ${productsHtml}
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    // Limpieza tras dar tiempo al diálogo de impresión.
    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 60_000);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef1f7] text-slate-950">
        <div className="rounded-[12px] border border-slate-300 bg-white px-6 py-5 shadow-sm">
          <LoadingState label="Cargando detalle..." className="gap-3" />
        </div>
      </main>
    );
  }

  const compareHref = `/dashboard/comprador/solicitudes/${requestId}/comparar`;
  const isAwardedFlow = request?.status === 'AWARDED' || request?.status === 'NEGOTIATING' || request?.status === 'ORDER_ISSUED';
  const quantity = request ? requestedQuantity(request) : null;
  const deliveryWhen =
    request?.deliveryMode === 'asap' ? 'lo antes posible' : request?.dueDate ? formatDate(request.dueDate) : null;
  const deliveryJoined = [request?.deliveryCity, deliveryWhen].filter(Boolean).join(' · ');
  const deliverySummary = deliveryJoined ? deliveryJoined.charAt(0).toUpperCase() + deliveryJoined.slice(1) : 'A coordinar';
  const prices = comparableQuotes
    .filter((quote) => (request?.items?.length ?? 0) < 2 || coverageOf(quote, request?.items ?? []).kind !== 'partial')
    .map((quote) => quote.amount)
    .filter((amount): amount is number => typeof amount === 'number');

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1f7] text-slate-950">
      <div className="flex w-full flex-col gap-5 py-2 sm:py-3">
        <nav className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-semibold text-slate-500">
          <Link className="inline-flex items-center gap-1 transition hover:text-slate-800" href="/dashboard/comprador/solicitudes">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Mis solicitudes
          </Link>
          <span className="text-slate-300">/</span>
          <span className="truncate text-slate-900">{request?.title ?? 'Solicitud'}</span>
        </nav>

        {error ? <div className="rounded-[12px] border border-rose-200 bg-rose-100 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
        {message ? <div className="rounded-[12px] border border-emerald-200 bg-emerald-100 px-5 py-4 text-sm text-emerald-700">{message}</div> : null}

        {/* ==================== ENCABEZADO + ETAPAS ==================== */}
        <section data-tour="request-main" className="rounded-[16px] border border-slate-300 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-6">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              {request ? (
                <span className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-slate-100 sm:block">
                  <Image alt="" className="object-cover" fill sizes="64px" src={requestImageFor(request)} />
                </span>
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-slate-500">
                  {request ? (
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold ${getRequestStatusStyles(request.status)}`}>
                      {getRequestStatusLabel(request.status)}
                    </span>
                  ) : null}
                  <span>
                    {formatRequestCode(request?.id ?? requestId)} · creada el {requestCreatedLabel}
                  </span>
                </div>
                <h1 className="mt-1.5 text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 sm:text-[28px]">
                  {request?.title ?? 'Solicitud no encontrada'}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                className="hidden h-10 items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
                onClick={handleDownloadSpecs}
                type="button"
              >
                <DetailIcon type="file" />
                Descargar PDF
              </button>
              <div className="relative" ref={actionsRef}>
                <button
                  aria-expanded={actionsOpen}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setActionsOpen((current) => !current)}
                  type="button"
                >
                  Acciones
                  <svg aria-hidden="true" className={`h-4 w-4 text-slate-600 transition ${actionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
                {actionsOpen ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[230px] rounded-[12px] border border-slate-300 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
                    <button
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canEditRequest}
                      onClick={() => {
                        setActionsOpen(false);
                        router.push(`/dashboard/comprador/solicitudes/nueva?edit=${request?.id}`);
                      }}
                      type="button"
                    >
                      Editar solicitud
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                      onClick={() => {
                        setActionsOpen(false);
                        handleDownloadSpecs();
                      }}
                      type="button"
                    >
                      Descargar especificaciones
                    </button>
                    {quotes.length > 0 ? (
                      <Link className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50" href={compareHref}>
                        Comparar propuestas
                      </Link>
                    ) : null}
                    <div className="my-1 h-px bg-slate-100" />
                    {canCancelRequest ? (
                      <button
                        className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={cancelling}
                        onClick={() => void handleCancelRequest()}
                        type="button"
                      >
                        {cancelling ? 'Cancelando...' : 'Cancelar solicitud'}
                      </button>
                    ) : null}
                    <button
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canEditRequest || deleting}
                      onClick={() => void handleDeleteRequest()}
                      type="button"
                    >
                      {deleting ? 'Eliminando...' : 'Eliminar solicitud'}
                    </button>
                    {!canEditRequest ? (
                      <p className="px-3 pb-1.5 pt-1 text-[11px] leading-4 text-slate-600">
                        Editar y eliminar están disponibles solo mientras la solicitud no tenga cotizaciones.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {request?.status === 'CANCELLED' ? (
            <div className="mx-4 mb-5 rounded-[12px] bg-slate-100 px-4 py-3 text-[13.5px] text-slate-600 sm:mx-6">
              Cancelaste esta solicitud. Queda en tu historial y los proveedores que cotizaron fueron notificados.
            </div>
          ) : (
            <ol className="flex items-start overflow-x-auto px-2 pb-5 sm:justify-center sm:px-6">
              {REQUEST_STAGES.map((stage, index) => {
                const done = index < stageIndex;
                const current = index === stageIndex;
                return (
                  <li key={stage} className="relative flex min-w-[88px] flex-1 flex-col items-center gap-1.5 text-center sm:max-w-[170px]">
                    {index > 0 ? (
                      <span className={`absolute right-1/2 top-[14px] h-[2px] w-full ${done || current ? 'bg-[#1f5bff]' : 'bg-slate-200'}`} />
                    ) : null}
                    <span
                      className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                        done
                          ? 'border-[#1f5bff] bg-[#1f5bff] text-white'
                          : current
                            ? 'border-[#1f5bff] bg-white shadow-[0_0_0_4px_#dfe8ff]'
                            : 'border-slate-300 bg-white'
                      }`}
                    >
                      {done ? (
                        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                        </svg>
                      ) : current ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#1f5bff]" />
                      ) : null}
                    </span>
                    <span className={`px-1 text-[12px] font-semibold leading-tight ${done || current ? 'text-slate-900' : 'text-slate-400'}`}>{stage}</span>
                  </li>
                );
              })}
            </ol>
          )}

          <dl className="grid grid-cols-2 border-t border-slate-200 lg:grid-cols-4">
            {[
              ['Cantidad', quantity ? `${quantity.value.toLocaleString('es-AR')} ${quantity.unit}` : 'A definir'],
              ['Entrega', deliverySummary],
              ['Proveedores', invitedCount > 0 ? `${respondedCount} de ${invitedCount} respondieron` : 'Sin proveedores aún'],
              awardedQuote
                ? ['Monto asignado', formatCurrency(awardedQuote.amount, awardedQuote.currency)]
                : [
                    'Rango de precios',
                    prices.length === 0
                      ? 'Sin propuestas'
                      : prices.length === 1
                        ? formatCurrency(prices[0])
                        : `${formatMoneyShort(Math.min(...prices))} – ${formatMoneyShort(Math.max(...prices))}`,
                  ],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`px-4 py-3.5 sm:px-6 ${index % 2 === 1 ? 'border-l border-slate-200' : ''} ${index >= 2 ? 'border-t border-slate-200 lg:border-t-0' : ''} ${index === 2 ? 'lg:border-l' : ''}`}
              >
                <dt className="text-[12px] font-semibold text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-[15px] font-bold text-slate-950">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ==================== PRÓXIMO PASO ==================== */}
        {request && request.status !== 'CANCELLED' ? (
          <section className="flex flex-col gap-4 rounded-[16px] bg-[linear-gradient(120deg,#0b1f66,#1f5bff)] p-5 text-white sm:p-6 lg:flex-row lg:items-center">
            <div className="lg:w-[280px] lg:shrink-0">
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">{nextStep.title}</h2>
              <p className="mt-1 text-[13.5px] leading-5 text-[#c4d4ff]">{nextStep.text}</p>
              {nextStep.action ? (
                nextStep.action.href.startsWith('#') ? (
                  <a className="mt-4 inline-flex h-11 items-center gap-2 rounded-[11px] bg-white px-5 text-[14px] font-bold text-[#1238d6] transition hover:bg-[#eef3ff]" href={nextStep.action.href}>
                    {nextStep.action.label}
                    <span aria-hidden="true">→</span>
                  </a>
                ) : (
                  <Link className="mt-4 inline-flex h-11 items-center gap-2 rounded-[11px] bg-white px-5 text-[14px] font-bold text-[#1238d6] transition hover:bg-[#eef3ff]" href={nextStep.action.href}>
                    {nextStep.action.label}
                    <span aria-hidden="true">→</span>
                  </Link>
                )
              ) : null}
            </div>
            {!awardedQuote && comparableQuotes.length > 0 ? (
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                {comparableQuotes.slice(0, 3).map((quote) => {
                  const coverage = coverageOf(quote, request.items ?? []);
                  return (
                    <div key={quote.id} className="flex min-w-0 flex-col rounded-[12px] border border-white/20 bg-white/10 px-3.5 py-3">
                      <Link className="min-w-0 transition hover:opacity-90" href={`/dashboard/comprador/cotizaciones/${quote.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12.5px] text-[#c4d4ff]">{quote.supplierCompany?.name ?? 'Proveedor'}</span>
                          {comparableQuotes.length > 1 && quote.id === bestPrice?.id ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Mejor precio</span>
                          ) : quote.id === fastest?.id ? (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">Más rápida</span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[17px] font-extrabold tabular-nums">{formatCurrency(quote.amount, quote.currency)}</p>
                        <p className="truncate text-[12px] text-[#c4d4ff]">
                          {typeof quote.leadTimeDays === 'number' ? `${quote.leadTimeDays} días` : 'Plazo a convenir'}
                          {quote.paymentTerms ? ` · ${quote.paymentTerms}` : ''}
                        </p>
                        {coverage.kind === 'partial' ? (
                          <p className="mt-1 text-[12px] font-semibold text-amber-200">
                            Cotiza {coverage.covered} de {coverage.total} productos
                          </p>
                        ) : null}
                      </Link>
                      <button
                        className="mt-3 inline-flex h-9 items-center justify-center rounded-[9px] bg-white text-[13px] font-bold text-[#1238d6] transition hover:bg-[#eef3ff] disabled:opacity-60"
                        disabled={Boolean(awardingId)}
                        onClick={() => void handleAward(quote)}
                        type="button"
                      >
                        {awardingId === quote.id ? 'Asignando…' : 'Asignar compra'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : awardedQuote ? (
              <div className="flex flex-1 flex-col gap-3 rounded-[12px] border border-white/20 bg-white/10 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <SupplierAvatar name={awardedQuote.supplierCompany?.name} size={44} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold">{awardedQuote.supplierCompany?.name ?? 'Proveedor'}</p>
                    <p className="text-[13px] text-[#c4d4ff]">
                      {formatCurrency(awardedQuote.amount, awardedQuote.currency)}
                      {typeof awardedQuote.leadTimeDays === 'number' ? ` · ${awardedQuote.leadTimeDays} días` : ''}
                      {request.order?.orderNumber ? ` · Orden ${request.order.orderNumber}` : ''}
                    </p>
                  </div>
                  <Link className="ml-auto hidden shrink-0 text-[13px] font-semibold text-white underline-offset-4 hover:underline sm:block" href={compareHref}>
                    Ver comparación
                  </Link>
                </div>

                {/* Compra asignada: emitir la orden acá mismo. */}
                {request.status === 'AWARDED' || request.status === 'NEGOTIATING' ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-white/15 pt-3">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-[10px] bg-white px-4 text-[13.5px] font-bold text-[#1238d6] transition hover:bg-[#eef3ff] disabled:opacity-60"
                      disabled={Boolean(progressingAction)}
                      onClick={() => void handleProgress('ISSUE_ORDER')}
                      type="button"
                    >
                      {progressingAction === 'ISSUE_ORDER' ? 'Emitiendo…' : 'Emitir orden de compra'}
                    </button>
                    {request.status === 'AWARDED' ? (
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-[10px] border border-white/40 px-4 text-[13.5px] font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                        disabled={Boolean(progressingAction)}
                        onClick={() => void handleProgress('START_NEGOTIATION')}
                        type="button"
                      >
                        {progressingAction === 'START_NEGOTIATION' ? 'Iniciando…' : 'Negociar antes'}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {/* Orden emitida: avance del pedido y confirmación de recepción. */}
                {request.status === 'ORDER_ISSUED' && request.order ? (
                  <div className="border-t border-white/15 pt-3">
                    <div className="flex items-end gap-1.5">
                      {FULFILLMENT_STEPS.map((step, index) => {
                        const done = index <= fulfillmentIndex;
                        return (
                          <div key={step} className="flex flex-1 flex-col items-center gap-1.5">
                            <span className={`h-1.5 w-full rounded-full ${done ? 'bg-white' : 'bg-white/25'}`} />
                            <span className={`text-center text-[11px] font-semibold leading-tight ${done ? 'text-white' : 'text-[#c4d4ff]'}`}>
                              {getFulfillmentLabel(step)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {request.order.fulfillmentStatus === 'DELIVERED' ? (
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-[10px] bg-emerald-500 px-4 text-[13.5px] font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                          disabled={Boolean(progressingAction)}
                          onClick={() => void handleProgress('CONFIRM_RECEIPT')}
                          type="button"
                        >
                          {progressingAction === 'CONFIRM_RECEIPT' ? 'Confirmando…' : 'Confirmar recepción'}
                        </button>
                      ) : null}
                      <a className="text-[13px] font-semibold text-white underline-offset-4 hover:underline" href="#orden">
                        Datos de la orden
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_360px] 2xl:grid-cols-[minmax(0,1.7fr)_380px]">
          <div className="min-w-0 space-y-5">
            {/* ==================== PRODUCTOS ==================== */}
            <section className="rounded-[16px] border border-slate-300 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">
                  {(request?.items?.length ?? 0) > 1 ? `Productos solicitados (${request?.items?.length})` : 'Producto solicitado'}
                </h2>
                {canEditRequest ? (
                  <Link className="text-[13px] font-semibold text-[#1f5bff]" href={`/dashboard/comprador/solicitudes/nueva?edit=${request?.id}`}>
                    Editar
                  </Link>
                ) : null}
              </div>
              {(request?.items?.length ?? 0) > 0 ? (
                <div className="mt-3 space-y-4">
                  {(request?.items ?? []).map((item) => {
                    const specRows = parseRequestDescription(item.specifications ?? '').filter((row) => row.label.toLowerCase() !== 'cantidad');
                    return (
                      <div key={item.id}>
                        {(request?.items?.length ?? 0) > 1 ? (
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[14.5px] font-bold">{item.productName}</p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold text-slate-700">
                              {item.quantity ? `${item.quantity.toLocaleString('es-AR')} ${item.unit ?? 'u.'}` : 'Cantidad a definir'}
                            </span>
                          </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                          {(request?.items?.length ?? 0) === 1 ? (
                            <div className="rounded-[10px] bg-[#f4f6fb] px-3 py-2.5">
                              <p className="text-[12px] font-semibold text-slate-500">Cantidad</p>
                              <p className="mt-0.5 text-[14px] font-bold text-slate-950">
                                {item.quantity ? `${item.quantity.toLocaleString('es-AR')} ${item.unit ?? 'u.'}` : 'A definir'}
                              </p>
                            </div>
                          ) : null}
                          {specRows.map((row, rowIndex) => (
                            <div key={`${row.label}-${rowIndex}`} className="rounded-[10px] bg-[#f4f6fb] px-3 py-2.5">
                              <p className="text-[12px] font-semibold text-slate-500">{row.label}</p>
                              <p className="mt-0.5 text-[14px] font-bold text-slate-950">{row.value || '-'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {detailItems.map((item) => (
                    <div key={`${item.label}-${item.value}`} className="rounded-[10px] bg-[#f4f6fb] px-3 py-2.5">
                      <p className="text-[12px] font-semibold text-slate-500">{item.label}</p>
                      <p className="mt-0.5 text-[14px] font-bold text-slate-950">{item.value || '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ==================== PROPUESTAS ==================== */}
            <section className="overflow-hidden rounded-[16px] border border-slate-300 bg-white">
              <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
                <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">
                  Propuestas recibidas <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-bold text-slate-600">{sortedQuotes.length}</span>
                </h2>
                {sortedQuotes.length > 0 ? (
                  <Link className="text-[13px] font-semibold text-[#1f5bff]" href={compareHref}>
                    {sortedQuotes.length > 1 ? (
                      <>
                        Comparar<span className="hidden sm:inline"> lado a lado</span>
                      </>
                    ) : (
                      'Ver propuesta'
                    )}
                  </Link>
                ) : null}
              </div>
              {sortedQuotes.length === 0 ? (
                <p className="border-t border-slate-200 px-4 py-5 text-[13.5px] text-slate-500 sm:px-5">
                  Todavía no recibiste propuestas. Te avisamos apenas un proveedor responda.
                </p>
              ) : (
                <ul>
                  {sortedQuotes.map((quote) => {
                    const isAwarded = quote.id === request?.awardedQuoteId;
                    const isRejected = quote.status === 'REJECTED';
                    return (
                      <li key={quote.id} className={`border-t border-slate-200 ${isRejected ? 'opacity-60' : ''}`}>
                        <Link
                          className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 transition hover:bg-[#f7f9ff] sm:grid-cols-[auto_minmax(0,1.4fr)_1fr_0.7fr_auto] sm:px-5"
                          href={`/dashboard/comprador/cotizaciones/${quote.id}`}
                        >
                          <SupplierAvatar name={quote.supplierCompany?.name} size={40} />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold">{quote.supplierCompany?.name ?? 'Proveedor'}</p>
                            <p className="mt-0.5 flex flex-wrap gap-1">
                              {isAwarded ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Compra asignada</span>
                              ) : isRejected ? (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">No seleccionada</span>
                              ) : (
                                <>
                                  {comparableQuotes.length > 1 && bestPrice?.id === quote.id ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Mejor precio</span>
                                  ) : null}
                                  {fastest?.id === quote.id ? (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">Más rápida</span>
                                  ) : null}
                                  {(() => {
                                    const coverage = coverageOf(quote, request?.items ?? []);
                                    if (coverage.kind === 'partial') {
                                      return (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                          Cotiza {coverage.covered} de {coverage.total} productos
                                        </span>
                                      );
                                    }
                                    if (coverage.kind === 'alternative') {
                                      return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Ofrece alternativa</span>;
                                    }
                                    return null;
                                  })()}
                                </>
                              )}
                            </p>
                          </div>
                          <p className="text-right text-[15px] font-extrabold tabular-nums sm:text-left">{formatCurrency(quote.amount, quote.currency)}</p>
                          <p className="col-span-2 col-start-2 text-[12.5px] text-slate-500 sm:col-span-1 sm:col-start-auto sm:text-[13.5px] sm:font-semibold sm:text-slate-800">
                            {typeof quote.leadTimeDays === 'number' ? `${quote.leadTimeDays} días` : 'Plazo a convenir'}
                            <span className="sm:hidden">{quote.paymentTerms ? ` · ${quote.paymentTerms}` : ''}</span>
                          </p>
                          <svg aria-hidden="true" className="hidden h-4 w-4 text-slate-400 sm:block" fill="none" viewBox="0 0 24 24">
                            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ==================== DATOS DE LA ORDEN ==================== */}
            {/* El avance del pedido y sus acciones están arriba, en "próximo paso". */}
            {request?.status === 'ORDER_ISSUED' && request?.order ? (
              <section id="orden" className="scroll-mt-24 rounded-[16px] border border-slate-300 bg-white p-4 sm:p-5">
                <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">Datos de la orden {request.order.orderNumber}</h2>
                    <form onSubmit={handleSaveOrder}>
                      <p className="mt-1 text-[12px] text-slate-500">Información operativa para tu registro y el del proveedor.</p>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-[12px] font-semibold text-slate-500">Número de orden</span>
                          <input
                            className="mt-1 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-[#1f5bff]"
                            onChange={(event) => setOrderForm((form) => ({ ...form, orderNumber: event.target.value }))}
                            value={orderForm.orderNumber}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[12px] font-semibold text-slate-500">Fecha prometida</span>
                          <input
                            className="mt-1 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-[#1f5bff]"
                            onChange={(event) => setOrderForm((form) => ({ ...form, promisedDate: event.target.value }))}
                            type="date"
                            value={orderForm.promisedDate}
                          />
                        </label>
                      </div>
                      <label className="mt-3 block">
                        <span className="text-[12px] font-semibold text-slate-500">Notas</span>
                        <textarea
                          className="mt-1 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-[#1f5bff]"
                          onChange={(event) => setOrderForm((form) => ({ ...form, notes: event.target.value }))}
                          rows={2}
                          value={orderForm.notes}
                        />
                      </label>
                      <div className="mt-3 flex justify-end">
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-[11px] border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={savingOrder}
                          type="submit"
                        >
                          {savingOrder ? 'Guardando...' : 'Guardar datos de la orden'}
                        </button>
                      </div>
                    </form>
              </section>
            ) : null}

            {/* ==================== ENTREGA ==================== */}
            <section className="rounded-[16px] border border-slate-300 bg-white p-4 sm:p-5">
              <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">Entrega y contacto</h2>
              {deliveryItems.length ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {deliveryItems.map((item) => (
                    <div key={`${item.label}-${item.value}`} className="rounded-[10px] bg-[#f4f6fb] px-3 py-2.5">
                      <p className="text-[12px] font-semibold text-slate-500">{item.label}</p>
                      <p className="mt-0.5 text-[14px] font-bold text-slate-950">{item.value || '-'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[13.5px] text-slate-500">Aún no hay información de entrega cargada en esta solicitud.</p>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            {/* ==================== PROVEEDORES ==================== */}
            <section data-tour="request-suppliers" className="overflow-hidden rounded-[16px] border border-slate-300 bg-white">
              <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
                <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">Proveedores invitados</h2>
                {isAwardedFlow || request?.status === 'COMPLETED' || request?.status === 'CANCELLED' ? null : (
                  <button
                    className="text-[13px] font-semibold text-[#1f5bff]"
                    onClick={() => router.push(`/dashboard/comprador/solicitudes/nueva?category=${encodeURIComponent(request?.category ?? '')}&step=4`)}
                    type="button"
                  >
                    + Sumar
                  </button>
                )}
              </div>
              {supplierCards.length ? (
                <ul>
                  {supplierCards.map((provider) => {
                    const quote = sortedQuotes.find((item) => item.supplierCompany?.name === provider.name);
                    return (
                      <li key={provider.id} className="flex items-center gap-3 border-t border-slate-200 px-4 py-2.5">
                        <SupplierAvatar name={provider.name} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-bold text-slate-950">{provider.name}</p>
                          <p className="truncate text-[12px] text-slate-500">
                            {quote ? `Cotizó el ${formatDate(quote.createdAt)}` : 'Todavía no respondió'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            provider.quoted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {provider.quoted ? 'Cotizó' : 'Invitado'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="border-t border-slate-200 px-4 py-4 text-[13px] text-slate-500">Todavía no hay proveedores vinculados a esta solicitud.</p>
              )}
            </section>

            {/* ==================== HISTORIAL ==================== */}
            <section data-tour="request-history" className="rounded-[16px] border border-slate-300 bg-white p-4">
              <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">Historial</h2>
              {requestTimeline.length ? (
                <ol className="relative mt-3 space-y-3.5 pl-5 before:absolute before:bottom-1.5 before:left-[5px] before:top-1.5 before:w-[2px] before:bg-slate-200">
                  {requestTimeline.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-5 top-1 h-3 w-3 rounded-full border-[2.5px] border-[#1f5bff] bg-white" />
                      <p className="text-[13.5px] font-bold leading-5 text-slate-950">{event.title}</p>
                      {event.detail ? <p className="text-[12.5px] leading-5 text-slate-500">{event.detail}</p> : null}
                      <p className="mt-0.5 text-[11.5px] text-slate-400">{formatDateTime(event.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-[13px] text-slate-500">Todavía no hay eventos registrados para esta solicitud.</p>
              )}
            </section>

            <p className="flex items-start gap-2 px-1 text-[12.5px] leading-5 text-slate-500">
              <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#1f5bff]" fill="none" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Solo los proveedores que elegiste pueden ver los detalles completos de esta solicitud.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
