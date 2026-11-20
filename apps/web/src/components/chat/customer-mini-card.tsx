'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CompanyLogo from '@/components/dashboard/company-logo';
import { atarApi, type CustomerDetailRecord, type CustomerNoteRecord } from '@/lib/atar-api';
import { locatePlace } from '@/lib/ar-places';
import { COUNTRIES } from '@/lib/regional-terms';

/**
 * Ficha chica del cliente al costado del chat del proveedor (o vendedor): su
 * historial con la empresa y tus anotaciones personales, que solo ves vos.
 */

function formatMoney(value: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(value));
}

export default function CustomerMiniCard({
  buyerCompanyId,
  name,
  logoUrl,
  city,
  country,
  accessToken,
  context,
}: {
  buyerCompanyId: string;
  name: string;
  logoUrl: string | null;
  /** Ciudad y país del cliente. */
  city?: string | null;
  country?: string | null;
  accessToken: string;
  /** De qué trata la conversación (solicitud o cotización), con su enlace. */
  context?: { label: string; title: string; href: string } | null;
}) {
  const [detail, setDetail] = useState<CustomerDetailRecord | null>(null);
  const [notes, setNotes] = useState<CustomerNoteRecord[] | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Provincia de la ciudad (Argentina), para decir bien de dónde es.
  const [province, setProvince] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (city && (!country || /^(ar|argentina)$/i.test(country))) {
      locatePlace(city).then((place) => !cancelled && setProvince(place?.province ?? null));
    }
    return () => {
      cancelled = true;
    };
  }, [city, country]);

  useEffect(() => {
    let cancelled = false;
    // El historial puede no estar disponible (p. ej. un vendedor sin ventas a
    // este cliente): la ficha se muestra igual, con las anotaciones.
    atarApi
      .getSupplierCustomerDetail(buyerCompanyId, accessToken)
      .then((value) => !cancelled && setDetail(value))
      .catch(() => !cancelled && setDetail(null));
    atarApi
      .getCustomerNotes(buyerCompanyId, accessToken)
      .then((value) => !cancelled && setNotes(value))
      .catch(() => !cancelled && setNotes([]));
    return () => {
      cancelled = true;
    };
  }, [accessToken, buyerCompanyId]);

  async function addNote() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    setError(null);
    try {
      const note = await atarApi.addCustomerNote(buyerCompanyId, body, accessToken);
      setNotes((current) => [note, ...(current ?? [])]);
      setDraft('');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'No se pudo guardar la anotación.');
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(noteId: string) {
    if (!window.confirm('¿Borrar esta anotación?')) return;
    try {
      await atarApi.deleteCustomerNote(buyerCompanyId, noteId, accessToken);
      setNotes((current) => (current ?? []).filter((note) => note.id !== noteId));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'No se pudo borrar la anotación.');
    }
  }

  const quotes = detail?.quotes ?? [];
  const won = quotes.filter((quote) => quote.status === 'AWARDED');
  const wonAmount = won.reduce((total, quote) => total + (quote.amount ?? 0), 0);
  const cityName = city ?? detail?.company.city ?? null;
  const countryCode = country ?? detail?.company.country ?? null;
  const countryName = COUNTRIES.find((item) => item.code === countryCode)?.name ?? countryCode;
  const location = [cityName, province && province !== cityName ? province : null, countryName].filter(Boolean).join(', ');
  const lastQuote = quotes[0];

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-[#f8f9fc] p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
        <CompanyLogo
          className="mx-auto h-14 w-14"
          logoUrl={logoUrl}
          name={name}
          rounded="rounded-2xl"
          textClassName="text-[16px] font-bold"
          tone="border border-slate-200 bg-white text-indigo-600"
        />
        <p className="mt-2.5 truncate text-[15px] font-bold text-slate-950">{name}</p>
        <p className="mt-0.5 text-[12.5px] text-slate-500">Cliente</p>
        {location ? (
          <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[12.5px] font-semibold text-indigo-700">
            <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="truncate">{location}</span>
          </p>
        ) : null}
        <Link
          className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-300 text-[13px] font-semibold text-slate-800 transition hover:border-indigo-400 hover:text-indigo-700"
          href="/dashboard/proveedor/clientes"
        >
          Ver en Clientes
        </Link>
      </div>

      {context ? (
        <Link className="mt-3 block rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-indigo-300" href={context.href}>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{context.label}</span>
          <span className="mt-0.5 block truncate text-[13.5px] font-semibold text-slate-900">{context.title}</span>
          <span className="mt-1 inline-flex text-[12.5px] font-semibold text-indigo-600">Ver detalle →</span>
        </Link>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <dt className="text-[11px] font-semibold text-slate-500">Cotizaciones</dt>
          <dd className="mt-0.5 text-[13px] font-bold text-slate-900">{quotes.length}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <dt className="text-[11px] font-semibold text-slate-500">Ganadas</dt>
          <dd className="mt-0.5 text-[13px] font-bold text-slate-900">{won.length}</dd>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <dt className="text-[11px] font-semibold text-slate-500">Vendido a este cliente</dt>
          <dd className="mt-0.5 text-[13px] font-bold text-slate-900">{wonAmount > 0 ? formatMoney(wonAmount, won[0]?.currency) : '—'}</dd>
        </div>
        {lastQuote ? (
          <div className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">Última cotización</dt>
            <dd className="mt-0.5 truncate text-[13px] font-bold text-slate-900">
              {lastQuote.requestTitle} · {formatDate(lastQuote.createdAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      {/* Anotaciones internas */}
      <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Anotaciones</p>
          <span className="text-[11px] text-slate-400">Solo las ves vos</span>
        </div>
        <label className="sr-only" htmlFor={`note-${buyerCompanyId}`}>
          Nueva anotación
        </label>
        <textarea
          className="mt-2 min-h-[64px] w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          id={`note-${buyerCompanyId}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void addNote();
            }
          }}
          placeholder="Ej.: prefiere entregas los martes, pide factura A…"
          value={draft}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {error ? <span className="text-[11.5px] text-rose-600">{error}</span> : <span />}
          <button
            className="inline-flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-[12.5px] font-bold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            disabled={!draft.trim() || saving}
            onClick={() => void addNote()}
            type="button"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {notes === null ? (
            <li className="text-[12px] text-slate-400">Cargando…</li>
          ) : notes.length === 0 ? (
            <li className="text-[12px] text-slate-400">Todavía no anotaste nada sobre este cliente.</li>
          ) : (
            notes.map((note) => (
              <li key={note.id} className="rounded-xl bg-amber-50 px-3 py-2">
                <p className="whitespace-pre-wrap text-[12.5px] leading-5 text-slate-800">{note.body}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="truncate">{formatDate(note.createdAt)}</span>
                  <button className="font-semibold text-slate-400 hover:text-rose-600" onClick={() => void removeNote(note.id)} type="button">
                    Borrar
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </aside>
  );
}
