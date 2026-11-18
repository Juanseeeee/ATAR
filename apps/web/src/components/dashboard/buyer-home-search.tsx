'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

export const BUYER_HOME_HREF = '/dashboard/comprador';

/**
 * Buscador del home del comprador. La búsqueda viaja en la URL (?q=) para que
 * el header de escritorio y el home compartan el mismo término sin estado
 * global: el home filtra productos, categorías y proveedores con ese valor.
 */
type Tone = 'dark' | 'light';

function SearchForm({ initialQuery, size, tone }: { initialQuery: string; size: 'header' | 'page'; tone: Tone }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function submit(next: string) {
    const term = next.trim();
    router.push(term ? `${BUYER_HOME_HREF}?q=${encodeURIComponent(term)}` : BUYER_HOME_HREF, { scroll: false });
  }

  const height = size === 'header' ? 'h-11' : 'h-12';
  // Sobre fondo azul el borde es blanco; sobre la barra blanca, gris.
  const inputTone =
    tone === 'light'
      ? 'border-slate-300 bg-slate-50 focus:border-[#1f5bff] focus:bg-white focus:ring-[#1f5bff]/15'
      : 'border-white bg-white focus:ring-white/70';
  const buttonTone = tone === 'light' ? 'border-[#1847ff] bg-[#1847ff] hover:bg-[#0f3ff5]' : 'border-white bg-[#0b1f66] hover:bg-[#06123f]';

  return (
    <form
      className="flex w-full"
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
      role="search"
    >
      <label className="sr-only" htmlFor={`buyer-home-search-${size}`}>
        Buscar productos, materiales, categorías o proveedores
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          className={`${height} w-full rounded-l-[10px] border border-r-0 pl-4 pr-9 text-[15px] text-slate-950 outline-none transition placeholder:text-slate-500 focus:ring-2 ${inputTone}`}
          id={`buyer-home-search-${size}`}
          onChange={(event) => setValue(event.target.value)}
          placeholder="¿Qué necesitás comprar para tu empresa?"
          type="search"
          value={value}
        />
        {value ? (
          <button
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => {
              setValue('');
              if (initialQuery) {
                submit('');
              }
            }}
            type="button"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
            </svg>
          </button>
        ) : null}
      </div>
      <button
        aria-label="Buscar"
        className={`${height} flex shrink-0 items-center justify-center gap-2 rounded-r-[10px] border px-4 text-[14px] font-semibold text-white transition sm:px-5 ${buttonTone}`}
        type="submit"
      >
        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
          <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        </svg>
        <span className="hidden sm:inline">Buscar</span>
      </button>
    </form>
  );
}

function SearchWithQuery({ size, tone }: { size: 'header' | 'page'; tone: Tone }) {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') ?? '';
  // La key reinicia el campo cuando la búsqueda cambia desde otro lado
  // (por ejemplo, "Limpiar búsqueda" en el home).
  return <SearchForm key={query} initialQuery={query} size={size} tone={tone} />;
}

export default function BuyerHomeSearch({ size = 'page', tone = 'dark' }: { size?: 'header' | 'page'; tone?: Tone }) {
  return (
    <Suspense fallback={<SearchForm initialQuery="" size={size} tone={tone} />}>
      <SearchWithQuery size={size} tone={tone} />
    </Suspense>
  );
}
