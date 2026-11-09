'use client';

import type { FormEvent, ReactNode } from 'react';

/**
 * Piezas compartidas de los heroes oscuros de Productos y Proveedores, para que
 * los dos tengan exactamente el mismo título, buscador y búsquedas sugeridas.
 */

/** Título del hero; `accent` va en azul en la segunda parte. */
export function HeroTitle({ children, accent }: { children: ReactNode; accent: ReactNode }) {
  return (
    <h1 className="animate-fade-up text-[2.4rem] font-bold leading-[1.05] tracking-[-0.035em] text-white [animation-delay:100ms] [text-shadow:0_2px_28px_rgba(5,10,28,0.55)] sm:text-5xl lg:text-[3.5rem]">
      {children} <span className="text-[#5b87ff]">{accent}</span>
    </h1>
  );
}

export function HeroLead({ children }: { children: ReactNode }) {
  return (
    <p className="animate-fade-up mt-5 max-w-[580px] text-[17px] leading-7 text-white/75 [animation-delay:200ms]">{children}</p>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function HeroSearch({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Se llama al tocar "Buscar" o Enter (por ejemplo, para bajar a los resultados). */
  onSubmit: () => void;
  placeholder: string;
  label: string;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className="animate-fade-up mt-8 flex max-w-[620px] items-center gap-2 rounded-[14px] border border-white/15 bg-white p-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] [animation-delay:300ms]"
      onSubmit={handleSubmit}
      role="search"
    >
      <span className="pl-2 text-slate-400">
        <SearchIcon />
      </span>
      <input
        aria-label={label}
        className="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      <button className="h-11 shrink-0 rounded-[10px] bg-[#1f5bff] px-6 text-sm font-semibold text-white transition hover:bg-[#194ee6]" type="submit">
        Buscar
      </button>
    </form>
  );
}

export function HeroSuggestions({
  label,
  terms,
  onPick,
}: {
  label: string;
  terms: string[];
  onPick: (term: string) => void;
}) {
  return (
    <div className="animate-fade-up mt-4 flex flex-wrap items-center gap-2 text-[13px] text-white/60 [animation-delay:400ms]">
      <span>{label}</span>
      {terms.map((term) => (
        <button
          key={term}
          className="rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-white/80 transition hover:border-white/50 hover:text-white"
          onClick={() => onPick(term)}
          type="button"
        >
          {term}
        </button>
      ))}
    </div>
  );
}
