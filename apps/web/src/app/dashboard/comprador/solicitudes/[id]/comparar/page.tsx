'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { SupplierAvatar } from '@/components/quotes/supplier-avatar';
import { LoadingState } from '@/components/ui/spinner';
import { atarApi, type QuoteRecord, type RequestRecord } from '@/lib/atar-api';
import {
  bestPriceOf,
  comparableQuotesOf,
  coverageOf,
  estimatedArrival,
  fastestOf,
  formatMoney,
  formatMoneyShort,
  formatShortDate,
  requestedQuantity,
  unitPriceOf,
} from '@/lib/quote-compare';

/**
 * Comparador de propuestas: cada proveedor es una columna-tarjeta y las filas
 * quedan alineadas entre columnas. Pensado para entrar en una pantalla.
 */

type ColumnState = { best: boolean; awarded: boolean; rejected: boolean };

function columnClasses(state: ColumnState, position: 'top' | 'middle' | 'bottom') {
  const border = state.awarded
    ? 'border-emerald-400'
    : state.best
      ? 'border-[#1f5bff]'
      : 'border-slate-200';
  const width = state.best || state.awarded ? 'border-x-2' : 'border-x';
  const bg = state.awarded ? 'bg-emerald-50/40' : state.best ? 'bg-[#f7f9ff]' : 'bg-white';
  const shape =
    position === 'top'
      ? `rounded-t-[16px] ${state.best || state.awarded ? 'border-t-2' : 'border-t'}`
      : position === 'bottom'
        ? `rounded-b-[16px] ${state.best || state.awarded ? 'border-b-2' : 'border-b'}`
        : '';
  return `${border} ${width} ${bg} ${shape} ${state.rejected ? 'opacity-60' : ''}`;
}

function Pill({ tone, children }: { tone: 'green' | 'amber' | 'blue' | 'rose' | 'slate'; children: React.ReactNode }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-[#e6edff] text-[#1238d6]',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-200 text-slate-600',
  };
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export default function CompareQuotesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, refreshSession, role } = useAuth();
  const requestId = typeof params.id === 'string' ? params.id : '';
  const [request, setRequest] = useState<RequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(
    async (token: string) => {
      const detail = await atarApi.getRequestDetail(requestId, token);
      setRequest(detail);
      return detail;
    },
    [requestId],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!session?.accessToken) return;
      if (role && role !== 'BUYER') {
        router.replace('/dashboard/proveedor');
        return;
      }
      try {
        setLoading(true);
        const fresh = await refreshSession();
        if (!fresh || cancelled) return;
        await load(fresh.accessToken);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las propuestas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [load, refreshSession, role, router, session?.accessToken]);

  const items = useMemo(() => request?.items ?? [], [request?.items]);
  const quotes = useMemo(() => {
    const all = request?.quotes ?? [];
    // Ya asignada: se muestra la elegida primero y las demás para referencia.
    if (request?.awardedQuoteId) {
      return all.slice().sort((a, b) => (a.id === request.awardedQuoteId ? -1 : b.id === request.awardedQuoteId ? 1 : 0));
    }
    return comparableQuotesOf(all);
  }, [request]);
  const bestPrice = useMemo(() => bestPriceOf(quotes, items), [quotes, items]);
  const fastest = useMemo(() => fastestOf(quotes), [quotes]);
  const canAward = Boolean(request) && !request?.awardedQuoteId && request?.status !== 'CANCELLED';
  const detailHref = `/dashboard/comprador/solicitudes/${requestId}`;
  const multi = items.length > 1;

  // Resumen en chips: lo que hay que mirar antes de decidir.
  const highlights = useMemo(() => {
    if (quotes.length < 2 || request?.awardedQuoteId) return [];
    const chips: { tone: 'green' | 'amber' | 'blue'; text: string }[] = [];
    // Mejor precio y más rápida ya se marcan en las tarjetas: acá solo van las advertencias.
    for (const q of quotes) {
      const coverage = coverageOf(q, items);
      const name = q.supplierCompany?.name ?? 'Un proveedor';
      if (coverage.kind === 'partial') chips.push({ tone: 'amber', text: `${name} no cotiza todo (${coverage.covered} de ${coverage.total})` });
      if (coverage.kind === 'alternative') chips.push({ tone: 'amber', text: `${name} ofrece una alternativa` });
    }
    return chips;
  }, [quotes, items, request?.awardedQuoteId]);

  async function handleAward(quote: QuoteRecord) {
    if (!session?.accessToken || !request) return;
    const name = quote.supplierCompany?.name ?? 'este proveedor';
    const confirmed = window.confirm(
      `Vas a asignarle la compra a ${name} por ${formatMoney(quote.amount, quote.currency)}.\n\nLas demás cotizaciones quedarán rechazadas y la solicitud se cerrará para nuevas propuestas.`,
    );
    if (!confirmed) return;
    try {
      setAwardingId(quote.id);
      setError(null);
      await atarApi.awardQuote(request.id, { quoteId: quote.id }, session.accessToken);
      router.push(`${detailHref}?asignada=1`);
    } catch (awardError) {
      setError(awardError instanceof Error ? awardError.message : 'No se pudo asignar la compra.');
      setAwardingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoadingState label="Cargando propuestas..." className="gap-3" />
      </main>
    );
  }

  const qty = request ? requestedQuantity(request) : null;
  const subtitle = [
    `${quotes.length} ${quotes.length === 1 ? 'propuesta' : 'propuestas'}`,
    qty ? `${qty.value.toLocaleString('es-AR')} ${qty.unit}` : null,
    request?.deliveryCity ? `entrega en ${request.deliveryCity}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const states: ColumnState[] = quotes.map((quote) => ({
    best: !request?.awardedQuoteId && quotes.length > 1 && quote.id === bestPrice?.id,
    awarded: quote.id === request?.awardedQuoteId,
    rejected: quote.status === 'REJECTED',
  }));

  // Filas de la grilla: etiqueta + una celda por propuesta.
  // `stacked`: la etiqueta va arriba del valor (textos largos); si no, a la izquierda.
  type GridRow = { key: string; label: React.ReactNode; stacked?: boolean; render: (quote: QuoteRecord) => React.ReactNode };
  const rows: GridRow[] = [
    {
      key: 'entrega',
      label: 'Entrega',
      render: (q) => {
        const arrival = request?.awardedQuoteId ? null : estimatedArrival(q.leadTimeDays);
        return (
          <>
            <p className={`text-[14px] font-bold ${q.id === fastest?.id ? 'text-[#1238d6]' : 'text-slate-900'}`}>
              {typeof q.leadTimeDays === 'number' ? `${q.leadTimeDays} días` : 'A convenir'}
            </p>
            {arrival ? <p className="text-[12px] text-slate-500">Llegaría el {formatShortDate(arrival)}</p> : null}
          </>
        );
      },
    },
    {
      key: 'pago',
      label: 'Forma de pago',
      render: (q) => (
        <p className={`line-clamp-2 text-[13.5px] leading-5 ${q.paymentTerms ? 'font-semibold text-slate-900' : 'text-slate-400'}`} title={q.paymentTerms ?? undefined}>
          {q.paymentTerms || 'A convenir'}
        </p>
      ),
    },
    {
      key: 'condiciones',
      label: 'Mínimo y validez',
      render: (q) => {
        const expired = q.validUntil ? new Date(q.validUntil).getTime() < now : false;
        return (
          <>
            <p className="text-[13.5px] font-semibold text-slate-900">
              {typeof q.minimumOrder === 'number' ? `Mínimo ${q.minimumOrder.toLocaleString('es-AR')}${multi ? '' : ' u.'}` : 'Sin mínimo informado'}
            </p>
            <p className={`text-[12px] ${expired ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
              {q.validUntil ? `${expired ? 'Venció' : 'Válida hasta'} el ${formatShortDate(q.validUntil)}` : 'Validez no informada'}
            </p>
          </>
        );
      },
    },
  ];

  if (multi) {
    for (const item of items) {
      const priced = quotes
        .map((q) => q.items?.find((l) => l.requestItemId === item.id))
        .filter((l) => l && l.availability !== 'UNAVAILABLE' && l.unitPrice != null)
        .map((l) => l!.unitPrice as number);
      const cheapest = priced.length > 1 ? Math.min(...priced) : null;
      rows.push({
        key: `item-${item.id}`,
        label: (
          <>
            <span className="block font-bold text-slate-700">{item.productName}</span>
            <span className="block text-[11.5px] font-medium text-slate-400">
              {item.quantity ? `${item.quantity.toLocaleString('es-AR')} ${item.unit ?? 'u.'}` : 'Cantidad a definir'}
            </span>
          </>
        ),
        render: (q) => {
          const line = q.items?.find((l) => l.requestItemId === item.id);
          if (!line) return <p className="text-[13px] text-slate-400">No cotizó</p>;
          if (line.availability === 'UNAVAILABLE') {
            return (
              <p className="text-[13px] font-semibold text-rose-600" title={line.note ?? undefined}>
                No lo ofrece
              </p>
            );
          }
          const isCheapest = cheapest != null && line.unitPrice === cheapest;
          return (
            <div className="flex flex-wrap items-baseline gap-x-1.5" title={line.note ?? undefined}>
              <span className={`text-[14px] font-bold tabular-nums ${isCheapest ? 'text-emerald-700' : 'text-slate-900'}`}>
                {line.unitPrice != null ? `${formatMoney(line.unitPrice, q.currency)}/u` : 'A consultar'}
              </span>
              {line.unitPrice != null && item.quantity ? (
                <span className="text-[12px] text-slate-500">{formatMoneyShort(line.unitPrice * item.quantity)}</span>
              ) : null}
              {line.availability === 'ALTERNATIVE' ? <Pill tone="amber">Alternativa</Pill> : null}
              {line.note && line.availability === 'ALTERNATIVE' ? (
                <span className="mt-0.5 block w-full truncate text-[11.5px] text-slate-500">{line.note}</span>
              ) : null}
            </div>
          );
        },
      });
    }
  } else {
    rows.push({
      key: 'cumple',
      label: 'Lo que pediste',
      render: (q) => {
        const coverage = coverageOf(q, items);
        if (coverage.kind === 'alternative') {
          return (
            <div title={coverage.notes[0]}>
              <Pill tone="amber">Ofrece alternativa</Pill>
              {coverage.notes[0] ? <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-slate-600">{coverage.notes[0]}</p> : null}
            </div>
          );
        }
        if (coverage.kind === 'partial') return <p className="text-[13px] font-semibold text-amber-700">Cotiza {coverage.covered} de {coverage.total}</p>;
        if (coverage.kind === 'full') return <p className="text-[13.5px] font-semibold text-emerald-700">✓ Cotiza lo pedido</p>;
        return <p className="text-[13px] text-slate-400">No detalla</p>;
      },
    });
  }

  rows.push({
    key: 'comentario',
    label: 'Comentario del proveedor',
    stacked: true,
    render: (q) => (
      <p className={`line-clamp-2 text-[12.5px] leading-[18px] ${q.technicalComment ? 'text-slate-600' : 'text-slate-400'}`} title={q.technicalComment ?? undefined}>
        {q.technicalComment || 'Sin comentarios'}
      </p>
    ),
  });

  const gridTemplate = `repeat(${Math.max(quotes.length, 1)}, minmax(268px, 1fr))`;
  const cellPad = 'px-4 py-2 xl:py-1.5 2xl:py-2';

  return (
    <main className="pb-2 text-slate-950">
      <div className="flex w-full flex-col gap-3 py-1 sm:py-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Link className="inline-flex max-w-full items-center gap-1 text-[13px] font-semibold text-slate-500 transition hover:text-slate-800" href={detailHref}>
              <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span className="truncate">{request?.title ?? 'Volver a la solicitud'}</span>
            </Link>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-[-0.03em] sm:text-[28px]">Comparar propuestas</h1>
            <p className="text-[13.5px] text-slate-600">{subtitle}</p>
          </div>
          {highlights.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 sm:max-w-[62%] sm:justify-end">
              {highlights.map((chip) => (
                <span
                  key={chip.text}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                    chip.tone === 'green' ? 'bg-emerald-100 text-emerald-800' : chip.tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}
                >
                  {chip.text}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {error ? <div className="rounded-[12px] border border-rose-200 bg-rose-100 px-5 py-3 text-sm text-rose-700">{error}</div> : null}
        {request?.awardedQuoteId ? (
          <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-800">
            Ya asignaste esta compra a <b>{request.awardedQuote?.supplierCompany?.name ?? 'un proveedor'}</b>.
            {quotes.length > 1 ? ' Las demás propuestas quedan como referencia.' : ''}
          </div>
        ) : null}

        {quotes.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-[14px] text-slate-600">
            Todavía no hay propuestas para comparar.{' '}
            <Link className="font-semibold text-[#1f5bff]" href={detailHref}>
              Volver a la solicitud
            </Link>
          </div>
        ) : (
          <div className="-mx-4 snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-1 sm:mx-0 sm:snap-none sm:px-0">
            <div className="grid gap-x-3 pt-3" style={{ gridTemplateColumns: gridTemplate }}>
              {/* ---------- Encabezado de cada propuesta ---------- */}
              {quotes.map((quote, index) => {
                const state = states[index];
                const coverage = coverageOf(quote, items);
                const missing = coverage.kind === 'partial' ? coverage.total - coverage.covered : 0;
                const unit = unitPriceOf(quote, items);
                const diff =
                  bestPrice?.amount != null && quote.amount != null && quote.id !== bestPrice.id && missing === 0
                    ? Math.round(((quote.amount - bestPrice.amount) / bestPrice.amount) * 100)
                    : null;
                return (
                  <div key={quote.id} className={`relative snap-start px-4 pb-2.5 pt-3.5 ${columnClasses(state, 'top')}`}>
                    {state.best ? (
                      <span className="absolute -top-3 left-4 rounded-full bg-[#1f5bff] px-2.5 py-0.5 text-[11px] font-bold text-white shadow">Mejor precio</span>
                    ) : null}
                    {state.awarded ? (
                      <span className="absolute -top-3 left-4 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow">Compra asignada</span>
                    ) : null}
                    <div className="flex items-center gap-2.5">
                      <SupplierAvatar name={quote.supplierCompany?.name} size={38} />
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-extrabold leading-tight">{quote.supplierCompany?.name ?? 'Proveedor'}</p>
                        <p className="truncate text-[12px] text-slate-500">{quote.supplierCompany?.city ?? 'Ubicación no informada'}</p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[22px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">{formatMoney(quote.amount, quote.currency)}</p>
                    <div className="mt-1.5 flex min-h-[22px] flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
                      {missing > 0 ? (
                        <Pill tone="amber">
                          Sin {missing} {missing === 1 ? 'producto' : 'productos'}
                        </Pill>
                      ) : diff != null ? (
                        <span className="font-semibold text-slate-600">+{diff}% que la mejor</span>
                      ) : null}
                      {unit != null ? <span>{formatMoney(unit, quote.currency)} por unidad</span> : null}
                      {quote.id === fastest?.id && !state.awarded ? <Pill tone="blue">Más rápida</Pill> : null}
                      {state.rejected ? <Pill tone="slate">No seleccionada</Pill> : null}
                    </div>
                  </div>
                );
              })}

              {/* ---------- Filas alineadas ---------- */}
              {rows.map((row) => (
                <div key={row.key} className="contents">
                  {quotes.map((quote, index) => (
                    <div key={quote.id} className={`${columnClasses(states[index], 'middle')}`}>
                      <div
                        className={`flex h-full border-t border-slate-100 ${cellPad} ${
                          row.stacked ? 'flex-col justify-center gap-0.5' : 'items-center justify-between gap-3'
                        }`}
                      >
                        <div className="shrink-0 text-[12.5px] font-semibold leading-4 text-slate-500">{row.label}</div>
                        <div className={`min-w-0 ${row.stacked ? '' : 'text-right [&>div]:justify-end'}`}>{row.render(quote)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* ---------- Acciones ---------- */}
              {quotes.map((quote, index) => {
                const awardable = canAward && quote.status === 'SUBMITTED';
                const primary = states[index].best;
                return (
                  <div key={quote.id} className={columnClasses(states[index], 'bottom')}>
                    <div className="flex items-center gap-2 border-t border-slate-100 px-4 pb-3.5 pt-3">
                      {awardable ? (
                        <button
                          className={`inline-flex h-10 flex-1 items-center justify-center rounded-[11px] px-3 text-[14px] font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            primary
                              ? 'bg-[#1f5bff] text-white shadow-[0_8px_20px_rgba(31,91,255,0.25)] hover:bg-[#1747d6]'
                              : 'border border-slate-300 bg-white text-slate-800 hover:border-[#1f5bff] hover:text-[#1238d6]'
                          }`}
                          disabled={Boolean(awardingId)}
                          onClick={() => void handleAward(quote)}
                          type="button"
                        >
                          {awardingId === quote.id ? 'Asignando...' : 'Asignar compra'}
                        </button>
                      ) : null}
                      <Link
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-[11px] px-2.5 text-[13px] font-semibold text-[#1f5bff] transition hover:bg-[#eef3ff]"
                        href={`/dashboard/comprador/cotizaciones/${quote.id}`}
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
