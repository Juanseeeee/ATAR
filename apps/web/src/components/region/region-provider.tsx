'use client';

import Image from 'next/image';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  COUNTRIES,
  type CountryCode,
  PREVIEW_TERMS,
  type RegionChoice,
  flagSources,
  guessCountry,
  localizeCategory,
} from '@/lib/regional-terms';

const STORAGE_KEY = 'atar.region';
const CHANGE_EVENT = 'atar:region-change';
/** Duración de la salida de la pantalla de países. */
const EXIT_MS = 650;
/** Cuánto dura el logo solo en el centro antes de abrir la pantalla (primera visita). */
const INTRO_MS = 1300;

function readChoice(): RegionChoice | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'XX' || COUNTRIES.some((item) => item.code === value)) {
      return value as RegionChoice;
    }
  } catch {
    // Sin acceso a localStorage (modo privado estricto): se pregunta cada vez.
  }
  // Valores viejos (p. ej. "GT", antes de unificar Centroamérica) vuelven a preguntar.
  return null;
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/** En el servidor todavía no se sabe el país: `undefined` = sin hidratar. */
function useStoredChoice() {
  return useSyncExternalStore<RegionChoice | null | undefined>(subscribe, readChoice, () => undefined);
}

type RegionContextValue = {
  /** País elegido; `null` si todavía no eligió, `undefined` antes de hidratar. */
  region: RegionChoice | null | undefined;
  setRegion: (choice: RegionChoice) => void;
  openPicker: () => void;
  /** Nombre de una categoría del catálogo tal como se dice en el país elegido. */
  categoryName: (label: string) => string;
};

const RegionContext = createContext<RegionContextValue | null>(null);

export function useRegion() {
  const value = useContext(RegionContext);
  if (!value) {
    throw new Error('useRegion debe usarse dentro de <RegionProvider>.');
  }
  return value;
}

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const region = useStoredChoice();
  const [pickerOpen, setPickerOpen] = useState(false);

  const setRegion = useCallback((choice: RegionChoice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Ver readChoice.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setPickerOpen(false);
  }, []);

  const value = useMemo<RegionContextValue>(
    () => ({
      region,
      setRegion,
      openPicker: () => setPickerOpen(true),
      categoryName: (label: string) => localizeCategory(label, region ?? null),
    }),
    [region, setRegion],
  );

  // Primera visita (ya hidratado y sin país guardado) o cambio pedido desde el header.
  const showPicker = region === null || pickerOpen;

  return (
    <RegionContext.Provider value={value}>
      {children}
      {showPicker ? (
        <CountryPicker
          current={region ?? null}
          onClose={region ? () => setPickerOpen(false) : undefined}
          onSelect={setRegion}
        />
      ) : null}
    </RegionContext.Provider>
  );
}

/* ================================ Banderas ================================ */

const FLAG_SIZES = {
  sm: { w: 22, h: 15, radius: 'rounded-[2px]', cell: { w: 10, h: 7, gap: 1 } },
  md: { w: 36, h: 24, radius: 'rounded-[4px]', cell: { w: 17, h: 11, gap: 2 } },
  lg: { w: 45, h: 30, radius: 'rounded-[4px]', cell: { w: 22, h: 14, gap: 2 } },
} as const;

/** Bandera de la región; Centroamérica muestra sus seis banderas en una grilla de 3×2. */
function RegionFlag({ code, size = 'md' }: { code: CountryCode; size?: keyof typeof FLAG_SIZES }) {
  const { w, h, radius, cell } = FLAG_SIZES[size];
  const sources = flagSources(code);

  if (sources.length === 1) {
    return (
      <Image
        alt=""
        className={`shrink-0 object-cover ${radius} shadow-[0_0_0_1px_rgba(15,23,42,0.08)]`}
        height={h}
        src={sources[0]}
        style={{ width: w, height: h }}
        width={w}
      />
    );
  }

  return (
    <span className="grid shrink-0 grid-cols-3" style={{ gap: cell.gap }}>
      {sources.map((src) => (
        <Image
          key={src}
          alt=""
          className="rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.08)]"
          height={cell.h}
          src={src}
          style={{ width: cell.w, height: cell.h }}
          width={cell.w}
        />
      ))}
    </span>
  );
}

function GlobeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/* ============================ Pantalla de país ============================ */

function CountryPicker({
  current,
  onSelect,
  onClose,
}: {
  current: RegionChoice | null;
  onSelect: (choice: RegionChoice) => void;
  /** Solo cuando ya había un país elegido: en la primera visita hay que elegir. */
  onClose?: () => void;
}) {
  const [suggested] = useState<CountryCode | null>(() =>
    typeof navigator === 'undefined' ? null : guessCountry(navigator.languages ?? [navigator.language]),
  );
  const [query, setQuery] = useState('');
  // Primera visita: es lo primero que ve el usuario, así que la pantalla presenta
  // ATAR. Cuando cambia de país desde el menú, va directo a la lista.
  const firstVisit = !onClose;
  // Intro: el logo aparece solo en el centro y después se abre la pantalla.
  const [introDone, setIntroDone] = useState(!firstVisit);
  useEffect(() => {
    if (introDone) {
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setIntroDone(true), reduceMotion ? 0 : INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [introDone]);
  // País que se previsualiza en el panel de marca (hover / foco).
  const [hovered, setHovered] = useState<RegionChoice | null>(null);

  // Bloquea el scroll de la página mientras la pantalla está abierta.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Salida suave: primero se desvanece la pantalla y recién después se guarda el
  // país (al guardarlo el componente se desmonta y aparece el home de golpe).
  const [leaving, setLeaving] = useState<RegionChoice | 'close' | null>(null);
  const leave = (next: RegionChoice | 'close') => {
    if (leaving) {
      return;
    }
    setLeaving(next);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(
      () => (next === 'close' ? onClose?.() : onSelect(next)),
      reduceMotion ? 0 : EXIT_MS,
    );
  };

  useEffect(() => {
    if (!onClose) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        leave('close');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const selected = leaving && leaving !== 'close' && leaving !== 'XX' ? leaving : current && current !== 'XX' ? current : null;
  const highlighted = selected ?? suggested;
  const preview: RegionChoice = hovered ?? current ?? suggested ?? 'MX';
  const previewCountry = COUNTRIES.find((item) => item.code === preview);

  const needle = normalize(query.trim());
  const visibleCountries = needle
    ? COUNTRIES.filter((item) => normalize(`${item.name} ${item.detail ?? ''}`).includes(needle))
    : COUNTRIES;

  return (
    <div
      aria-labelledby="region-picker-title"
      aria-modal="true"
      className={`fixed inset-0 z-[100] overflow-y-auto bg-white animate-[region-fade_250ms_ease-out] transition-[opacity,transform,filter] duration-[650ms] ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none lg:grid lg:grid-cols-[minmax(400px,0.9fr)_1.1fr] lg:overflow-hidden ${
        leaving ? 'pointer-events-none scale-[1.03] opacity-0 blur-[3px]' : ''
      }`}
      role="dialog"
    >
      {firstVisit ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0b1533] transition-opacity duration-700 ease-out ${
            introDone ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgba(31,91,255,0.45)_0%,transparent_70%)]" />
          <Image
            alt=""
            className="relative animate-[region-pop_700ms_cubic-bezier(.2,.9,.3,1.2)_both]"
            height={84}
            priority
            src="/logoatarblanco.png"
            width={84}
          />
          <span className="relative text-[15px] font-semibold uppercase tracking-[0.5em] text-white/85 animate-[region-rise_600ms_ease-out_both] [animation-delay:250ms]">
            ATAR
          </span>
        </div>
      ) : null}

      {/* ---------- Panel de marca ---------- */}
      <aside
        className={`relative isolate overflow-hidden bg-[#0b1533] px-6 pb-8 pt-7 text-white transition-transform duration-[650ms] ease-[cubic-bezier(.4,0,.2,1)] sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12 ${
          leaving ? 'lg:-translate-x-10' : ''
        }`}
      >
        {/* Foto de planta de fondo, oscurecida para que el texto y el emblema se lean. */}
        <Image alt="" className="pointer-events-none -z-10 object-cover object-[92%_center]" fill priority sizes="(min-width:1024px) 45vw, 100vw" src="/hero-productos-atar.png" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,21,51,0.82)_0%,rgba(11,21,51,0.72)_45%,rgba(11,21,51,0.92)_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_60%_at_100%_0%,rgba(31,91,255,0.55)_0%,transparent_60%),radial-gradient(70%_50%_at_0%_100%,rgba(31,91,255,0.35)_0%,transparent_65%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="flex items-center gap-3 animate-[region-pop_600ms_cubic-bezier(.2,.9,.3,1.2)]">
          <Image alt="" height={36} priority src="/logoatarblanco.png" width={36} />
          <span className="text-xl font-bold tracking-tight">ATAR</span>
        </div>

        {firstVisit ? (
          /* Bienvenida: qué es ATAR, antes de pedir nada. */
          <div className="mt-7 lg:mt-0">
            <h1 id="region-picker-title" className="text-[28px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[38px] lg:text-[44px]">
              El punto de encuentro de la <span className="text-[#7da2ff]">industria de la rafia.</span>
            </h1>
            <p className="mt-4 max-w-[460px] text-[15px] leading-6 text-white/70">
              Compradores, vendedores y proveedores de toda la cadena del polipropileno, en un solo lugar.
            </p>
            <div className="relative mt-8 hidden aspect-[1333/1180] w-full max-w-[400px] lg:block">
              <div className="absolute inset-[12%] rounded-full bg-[#1f5bff]/35 blur-[70px]" />
              <Image
                alt=""
                className="animate-[region-rise_700ms_ease-out_both] object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.45)] [animation-delay:150ms]"
                fill
                priority
                sizes="400px"
                src="/hero-atar-logotipo.png"
              />
            </div>
          </div>
        ) : (
          <div className="mt-7 lg:mt-0">
            <h1 id="region-picker-title" className="text-[30px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[40px] lg:text-[46px]">
              ¿Desde qué país
              <br className="hidden sm:block" /> nos visitás?
            </h1>
            <p className="mt-4 max-w-[440px] text-[15px] leading-6 text-white/70">
              Cada país nombra distinto a los mismos productos. Elegí el tuyo y te los mostramos como los conocés.
            </p>

            {/* Vista previa: cambia al pasar por cada país. */}
            <div className="mt-8 hidden max-w-[470px] rounded-[18px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm lg:block">
              <div className="flex items-center gap-3">
                {previewCountry ? <RegionFlag code={previewCountry.code} size="md" /> : <GlobeIcon className="h-6 w-6 text-[#8fb0ff]" />}
                <p className="text-[14px] text-white/70">
                  Así se dice en <span className="font-semibold text-white">{previewCountry?.name ?? 'toda la región'}</span>
                </p>
              </div>
              <dl key={preview} className="mt-4 divide-y divide-white/10">
                {PREVIEW_TERMS.map((term, index) => (
                  <div
                    key={term.label}
                    className="flex items-baseline justify-between gap-4 py-2.5 animate-[region-rise_300ms_ease-out_both]"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <dt className="text-[13px] text-white/55">{term.concept}</dt>
                    <dd className="text-right text-[15px] font-semibold text-white">{localizeCategory(term.label, preview)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {firstVisit ? (
          <ul className="mt-6 hidden flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/60 lg:flex">
            <li>✓ Proveedores verificados</li>
            <li>✓ Cotizaciones en minutos</li>
            <li>✓ Toda la región</li>
          </ul>
        ) : (
          <p className="mt-6 hidden text-[13px] text-white/45 lg:block">Podés cambiarlo cuando quieras desde la bandera del menú.</p>
        )}
      </aside>

      {/* ---------- Lista de países ---------- */}
      <section
        className={`flex flex-col px-5 py-7 transition-transform duration-[650ms] ease-[cubic-bezier(.4,0,.2,1)] sm:px-10 lg:overflow-y-auto lg:px-14 lg:py-12 ${
          leaving ? 'lg:translate-x-10' : ''
        }`}
      >
        {firstVisit ? (
          <div className="lg:mt-6">
            <h2 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-[#0b1533] sm:text-[28px]">¿Desde qué país nos visitás?</h2>
            <p className="mt-2 max-w-[520px] text-[14px] leading-6 text-slate-500">
              Te mostramos cada producto con el nombre que usás en tu país.
            </p>
            {/* Vista previa compacta: cambia al pasar por cada país. */}
            <p key={preview} className="mt-3 flex min-h-[28px] flex-wrap items-center gap-1.5 text-[13px] text-slate-500 animate-[region-rise_250ms_ease-out_both]">
              {previewCountry ? <RegionFlag code={previewCountry.code} size="sm" /> : <GlobeIcon className="h-4 w-4 text-[#1f5bff]" />}
              <span className="ml-1">En {previewCountry?.name ?? 'toda la región'}:</span>
              {PREVIEW_TERMS.slice(0, 3).map((term) => (
                <span key={term.label} className="rounded-full bg-[#eef3ff] px-2.5 py-0.5 font-semibold text-[#1f3fd6]">
                  {localizeCategory(term.label, preview)}
                </span>
              ))}
            </p>
          </div>
        ) : null}
        <div className={`flex items-center justify-between gap-4 ${firstVisit ? 'hidden' : ''}`}>
          <h2 className="text-[17px] font-bold text-[#0b1533]">Elegí tu país</h2>
          {onClose ? (
            <button
              aria-label="Cerrar"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => leave('close')}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          ) : null}
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">Buscar país</span>
          <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24">
            <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
          <input
            className="h-12 w-full rounded-[12px] border border-[#e3e8f4] bg-[#f7f9fd] pl-11 pr-4 text-[15px] text-[#0b1533] outline-none transition placeholder:text-slate-400 focus:border-[#1f5bff] focus:bg-white focus:ring-4 focus:ring-[#1f5bff]/10"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar país"
            type="search"
            value={query}
          />
        </label>

        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2" onMouseLeave={() => setHovered(null)}>
          {visibleCountries.map((country, index) => {
            const isSelected = country.code === selected;
            const isSuggested = !selected && country.code === suggested;
            const isHighlighted = country.code === highlighted;
            return (
              <li
                key={country.code}
                className={`animate-[region-rise_350ms_ease-out_both] ${country.code === 'CA' ? 'sm:col-span-2' : ''}`}
                style={{ animationDelay: `${80 + index * 25}ms` }}
              >
                <button
                  className={`group flex min-h-[64px] w-full items-center gap-3.5 rounded-[14px] border px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#1f5bff] hover:shadow-[0_14px_30px_rgba(31,91,255,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1f5bff]/20 ${
                    isHighlighted ? 'border-[#1f5bff] bg-[#f3f6ff]' : 'border-[#e6eaf3] bg-white'
                  }`}
                  onClick={() => leave(country.code)}
                  onFocus={() => setHovered(country.code)}
                  onMouseEnter={() => setHovered(country.code)}
                  type="button"
                >
                  <RegionFlag code={country.code} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-[#0b1533]">{country.name}</span>
                    {country.detail ? (
                      <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">{country.detail}</span>
                    ) : null}
                  </span>
                  {isSelected || isSuggested ? (
                    <span className="shrink-0 rounded-full bg-[#1f5bff] px-2.5 py-1 text-[11px] font-semibold text-white">
                      {isSelected ? 'Actual' : 'Sugerido'}
                    </span>
                  ) : (
                    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1f5bff]" fill="none" viewBox="0 0 24 24">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
          {visibleCountries.length === 0 ? (
            <li className="rounded-[14px] border border-dashed border-[#d9e0ee] px-4 py-5 text-center text-[14px] text-slate-500 sm:col-span-2">
              No encontramos ese país. Podés elegir “Mi país no está en la lista” para ver los nombres generales.
            </li>
          ) : null}
          {/* Va como una tarjeta más: ocupa el lugar libre al final de la grilla. */}
          <li className="animate-[region-rise_350ms_ease-out_both]" style={{ animationDelay: `${80 + visibleCountries.length * 25}ms` }}>
            <button
              className={`group flex min-h-[64px] w-full items-center gap-3.5 rounded-[14px] border border-dashed px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-solid hover:border-[#1f5bff] hover:shadow-[0_14px_30px_rgba(31,91,255,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1f5bff]/20 ${
                current === 'XX' ? 'border-solid border-[#1f5bff] bg-[#f3f6ff]' : 'border-[#d3dbea] bg-white'
              }`}
              onClick={() => leave('XX')}
              onFocus={() => setHovered('XX')}
              onMouseEnter={() => setHovered('XX')}
              type="button"
            >
              <span className="flex h-[30px] w-[45px] shrink-0 items-center justify-center rounded-[4px] bg-[#eef2fb] text-[#1f5bff]">
                <GlobeIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold text-[#0b1533]">Mi país no está en la lista</span>
              {current === 'XX' ? (
                <span className="shrink-0 rounded-full bg-[#1f5bff] px-2.5 py-1 text-[11px] font-semibold text-white">Actual</span>
              ) : (
                <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1f5bff]" fill="none" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              )}
            </button>
          </li>
        </ul>

        <p className="mt-6 text-center text-[13px] text-slate-400 lg:hidden">Podés cambiarlo cuando quieras desde la bandera del menú.</p>
      </section>
    </div>
  );
}

/* ============================ Botón de bandera ============================ */

/** Bandera del país elegido; al tocarla se vuelve a abrir la pantalla de países. */
export function RegionButton({
  className = '',
  tone = 'light',
  compact = false,
}: {
  className?: string;
  tone?: 'light' | 'dark';
  /** Alto de los botones del header del panel (34 px) en vez de 40 px. */
  compact?: boolean;
}) {
  const { region, openPicker } = useRegion();
  if (region === undefined) {
    return null;
  }
  const country = COUNTRIES.find((item) => item.code === region);
  return (
    <button
      aria-label={`País: ${country?.name ?? 'Otro país'}. Cambiar país`}
      className={`inline-flex ${compact ? 'h-8.5 rounded-xl' : 'h-10 rounded-[10px]'} items-center gap-2 border px-2.5 text-[13px] font-semibold transition ${
        tone === 'dark' ? 'border-white/30 text-white hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
      } ${className}`}
      onClick={openPicker}
      title="Cambiar país"
      type="button"
    >
      {country ? <RegionFlag code={country.code} size="sm" /> : <GlobeIcon />}
      <span>{country?.code ?? 'Otro'}</span>
    </button>
  );
}
