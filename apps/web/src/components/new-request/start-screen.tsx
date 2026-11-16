'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { atarApi, type RequestRecord } from '@/lib/atar-api';
import { clearDraft, loadDraft, type StartMode } from '@/lib/new-request';
import { requestImageFor } from '@/lib/quote-compare';

const BASE = '/dashboard/comprador/solicitudes/nueva';

type IconName = 'grid' | 'spark' | 'sheet' | 'ruler' | 'repeat' | 'arrow' | 'draft';

export function StartIcon({ name, className = 'h-6 w-6' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    grid: (
      <>
        <rect height="7" rx="1.5" width="7" x="3" y="3" />
        <rect height="7" rx="1.5" width="7" x="14" y="3" />
        <rect height="7" rx="1.5" width="7" x="3" y="14" />
        <rect height="7" rx="1.5" width="7" x="14" y="14" />
      </>
    ),
    spark: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </>
    ),
    sheet: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M8 13h8M8 17h8M12 11v8" />
      </>
    ),
    ruler: (
      <>
        <path d="M3 17 17 3l4 4L7 21z" />
        <path d="m7 13 2 2M10 10l2 2M13 7l2 2" />
      </>
    ),
    repeat: <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    draft: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.9}
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

const OPTIONS: Array<{ mode: StartMode; icon: IconName; title: string; text: string; tone: string; badge?: string }> = [
  {
    mode: 'catalogo',
    icon: 'grid',
    title: 'Elegir del catálogo',
    text: 'Bolsones, bolsas, telas, hilos y más. Elegís el rubro y cargás la cantidad.',
    tone: 'bg-[#eef3ff] text-[#1238d6]',
    badge: 'Más usado',
  },
  {
    mode: 'ataria',
    icon: 'spark',
    title: 'Contárselo a ATARIA',
    text: 'Escribí tu pedido como se lo dirías a alguien y ATARIA arma la lista.',
    tone: 'bg-violet-50 text-violet-700',
  },
  {
    mode: 'planilla',
    icon: 'sheet',
    title: 'Subir una planilla',
    text: 'Pegá las filas de tu Excel o subí un CSV con producto y cantidad.',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    mode: 'medida',
    icon: 'ruler',
    title: 'Producto a medida',
    text: '¿No está en el catálogo? Describilo con tus palabras y lo cotizan igual.',
    tone: 'bg-amber-50 text-amber-700',
  },
];

const HOW_IT_WORKS = [
  { title: 'Cargás lo que necesitás', text: 'Producto, cantidad y dónde lo recibís.' },
  { title: 'Elegís a quién enviarla', text: 'Te sugerimos proveedores del rubro.' },
  { title: 'Comparás y decidís', text: 'Las propuestas llegan a ATAR, sin compromiso.' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default function NewRequestStart() {
  const { session } = useAuth();
  const [recent, setRecent] = useState<RequestRecord[] | null>(null);
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    // Leer el navegador solo en el cliente (después de montar).
    const timer = window.setTimeout(() => setDraftCount(loadDraft()?.products.length ?? 0), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    atarApi
      .getBuyerRequests(session.accessToken)
      .then((list) => {
        if (cancelled) return;
        const sorted = list
          .filter((request) => request.status !== 'DRAFT')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecent(sorted.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRecent([]);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  return (
    <div className="mx-auto w-full max-w-[1180px] pb-24 pt-2 lg:pb-8 lg:pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[#1f5bff]">Solicitar cotización</p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.03em] text-slate-950 lg:text-[30px]">¿Cómo querés empezar?</h1>
          <p className="mt-1 text-[14.5px] text-slate-600">Elegí la forma más cómoda. Después revisás los detalles, la entrega y a quién se la mandás.</p>
        </div>
      </div>

      {draftCount > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#c9d6ff] bg-[#f3f6ff] px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#1238d6]">
            <StartIcon className="h-[18px] w-[18px]" name="draft" />
          </span>
          <p className="min-w-0 flex-1 text-[14px] text-slate-700">
            Tenés una solicitud sin terminar con{' '}
            <b className="text-slate-950">
              {draftCount} producto{draftCount === 1 ? '' : 's'}
            </b>
            .
          </p>
          <button
            className="h-9 rounded-lg px-3 text-[13px] font-semibold text-slate-500 hover:bg-white hover:text-slate-800"
            onClick={() => {
              clearDraft();
              setDraftCount(0);
            }}
            type="button"
          >
            Descartar
          </button>
          <Link className="inline-flex h-9 items-center rounded-lg bg-[#1847ff] px-4 text-[13px] font-semibold text-white hover:bg-[#0f3ff5]" href={`${BASE}?modo=seguir`}>
            Seguir donde dejé
          </Link>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tour="request-start-options">
        {OPTIONS.map((option) => (
          <Link
            key={option.mode}
            className={`group relative flex flex-col rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,35,95,0.10)] ${
              option.badge ? 'border-[#1f5bff] shadow-[0_0_0_3px_rgba(31,91,255,0.10)]' : 'border-slate-300 hover:border-[#9db4ff]'
            }`}
            href={`${BASE}?modo=${option.mode}`}
          >
            {option.badge ? (
              <span className="absolute right-4 top-4 rounded-full bg-[#1847ff] px-2.5 py-0.5 text-[11px] font-bold text-white">{option.badge}</span>
            ) : null}
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${option.tone}`}>
              <StartIcon name={option.icon} />
            </span>
            <span className="mt-4 text-[16.5px] font-bold text-slate-950">{option.title}</span>
            <span className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-slate-600">{option.text}</span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1238d6]">
              Empezar
              <StartIcon className="h-4 w-4 transition group-hover:translate-x-0.5" name="arrow" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-slate-300 bg-white" data-tour="request-start-repeat">
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4">
            <StartIcon className="h-5 w-5 text-slate-500" name="repeat" />
            <h2 className="text-[16px] font-bold text-slate-950">Repetir un pedido anterior</h2>
          </div>
          {recent === null ? (
            <div className="space-y-2 p-5">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px] text-slate-500">Cuando hagas tu primera solicitud, la vas a poder repetir desde acá.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {recent.map((request) => {
                const items = request.items ?? [];
                const summary =
                  items.length > 1
                    ? items.map((item) => item.productName).join(', ')
                    : items[0]?.quantity
                      ? `${items[0].quantity.toLocaleString('es-AR')} ${items[0].unit ?? 'unidades'}`
                      : request.category;
                return (
                  <li key={request.id} className="flex items-center gap-3.5 px-5 py-3">
                    <Image
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover"
                      height={44}
                      src={requestImageFor(request)}
                      width={44}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-slate-950">{request.title}</p>
                      <p className="truncate text-[12.5px] text-slate-500">
                        {summary} · {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <Link
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold text-slate-800 transition hover:border-[#1f5bff] hover:text-[#1238d6]"
                      href={`${BASE}?repetir=${request.id}`}
                    >
                      <StartIcon className="h-4 w-4" name="repeat" />
                      Repetir
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-[linear-gradient(150deg,#0b1f66,#1847ff)] p-5 text-white">
          <h2 className="text-[16px] font-bold">Cómo funciona</h2>
          <ol className="mt-4 space-y-4">
            {HOW_IT_WORKS.map((item, index) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[13px] font-bold">{index + 1}</span>
                <span>
                  <span className="block text-[14px] font-semibold">{item.title}</span>
                  <span className="block text-[13px] text-[#c4d4ff]">{item.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-xl bg-white/10 px-3 py-2.5 text-[12.5px] text-[#dbe5ff]">Pedir cotización es gratis y no te obliga a comprar.</p>
        </section>
      </div>
    </div>
  );
}
