'use client';

import { useState } from 'react';
import { normalizePlace } from '@/lib/ar-places';

/**
 * Proveedores por ubicación: primero las provincias; al tocar una, sus
 * localidades. El buscador encuentra provincias y localidades a la vez.
 */

type City = { name: string; count: number };

const OTHER = 'Otras ubicaciones';

function Pin() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#1f5bff]" fill="none" viewBox="0 0 24 24">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Chevron({ left = false }: { left?: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d={left ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function Row({ label, detail, count, onClick }: { label: string; detail?: string; count: number; onClick: () => void }) {
  return (
    <button
      className="flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-[#f3f6ff] hover:text-[#1f5bff]"
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Pin />
        <span className="truncate">{label}</span>
        {detail ? <span className="truncate text-[12px] text-slate-400">{detail}</span> : null}
        <span className="shrink-0 text-slate-400">({count})</span>
      </span>
      <Chevron />
    </button>
  );
}

export default function LocationBrowser({
  cities,
  provinceOf,
  loading,
  onSelectCity,
  onProvinceChange,
}: {
  cities: City[];
  /** Provincia de cada localidad (por nombre). Las que no se conocen van a "Otras ubicaciones". */
  provinceOf: (city: string) => string | null;
  loading: boolean;
  onSelectCity: (city: string) => void;
  /** Avisa qué provincia se está mirando (null = todas), para que el mapa haga zoom. */
  onProvinceChange?: (province: string | null) => void;
}) {
  const [province, setProvinceState] = useState<string | null>(null);
  function setProvince(next: string | null) {
    setProvinceState(next);
    onProvinceChange?.(next === OTHER ? null : next);
  }
  const [query, setQuery] = useState('');

  const grouped = new Map<string, City[]>();
  for (const city of cities) {
    const key = provinceOf(city.name) ?? OTHER;
    grouped.set(key, [...(grouped.get(key) ?? []), city]);
  }
  const provinces = Array.from(grouped, ([name, list]) => ({ name, list, count: list.reduce((total, city) => total + city.count, 0) })).sort(
    (a, b) => Number(a.name === OTHER) - Number(b.name === OTHER) || b.count - a.count || a.name.localeCompare(b.name),
  );

  const term = normalizePlace(query);
  const provinceMatches = term ? provinces.filter((item) => normalizePlace(item.name).includes(term)) : [];
  const cityMatches = term ? cities.filter((city) => normalizePlace(city.name).includes(term)) : [];
  const current = province ? provinces.find((item) => item.name === province) : null;

  let body;
  if (cities.length === 0) {
    body = <p className="px-3 py-4 text-sm text-slate-500">{loading ? 'Cargando…' : 'Sin ubicaciones cargadas.'}</p>;
  } else if (term) {
    body =
      provinceMatches.length === 0 && cityMatches.length === 0 ? (
        <p className="px-3 py-4 text-sm text-slate-500">No hay proveedores en «{query.trim()}».</p>
      ) : (
        <>
          {provinceMatches.map((item) => (
            <Row
              key={`p-${item.name}`}
              count={item.count}
              detail="Provincia"
              label={item.name}
              onClick={() => {
                setProvince(item.name);
                setQuery('');
              }}
            />
          ))}
          {cityMatches.map((city) => (
            <Row key={`c-${city.name}`} count={city.count} detail={provinceOf(city.name) ?? undefined} label={city.name} onClick={() => onSelectCity(city.name)} />
          ))}
        </>
      );
  } else if (current) {
    body = (
      <>
        <button
          className="mb-1 flex w-full items-center gap-1.5 rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          onClick={() => setProvince(null)}
          type="button"
        >
          <Chevron left />
          Todas las provincias
        </button>
        <p className="px-3 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-400">{current.name}</p>
        {current.list.map((city) => (
          <Row key={city.name} count={city.count} label={city.name} onClick={() => onSelectCity(city.name)} />
        ))}
      </>
    );
  } else {
    body = provinces.map((item) => <Row key={item.name} count={item.count} label={item.name} onClick={() => setProvince(item.name)} />);
  }

  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-2">
      <div className="relative p-1">
        <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <input
          aria-label="Buscar provincia o localidad"
          className="h-9 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1f5bff] focus:bg-white"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar provincia o localidad"
          value={query}
        />
      </div>
      <div className="mt-1 max-h-[320px] overflow-y-auto">{body}</div>
    </div>
  );
}
