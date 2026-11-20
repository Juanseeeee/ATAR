'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import CompanyLogo from '@/components/dashboard/company-logo';
import ArgentinaMap from '@/components/home/argentina-map';
import LocationBrowser from '@/components/suppliers/location-browser';
import SupplierShowcaseCard from '@/components/marketing/supplier-showcase-card';
import { HeroLead, HeroSearch, HeroSuggestions, HeroTitle } from '@/components/marketing/page-hero';
import { useRegion } from '@/components/region/region-provider';
import Reveal from '@/components/ui/reveal';
import { isCategoryHidden, withoutHiddenCategories } from '@/lib/hidden-categories';
import { atarApi, SUPPLIER_ROLE_LABELS, type SupplierDirectoryRecord, type SupplierRole } from '@/lib/atar-api';
import { distanceKm, locatePlace, normalizePlace, searchPlaces, type Located, type Place } from '@/lib/ar-places';
import type { CountryCode } from '@/lib/regional-terms';

/* Categorías -------------------------------------------------------------- */

/**
 * Familias del filtro. Cada una agrupa etiquetas del catálogo de solicitudes,
 * que es lo que cada proveedor declara en `categories` / `mainProducts`.
 * `byCountry` pisa el nombre del filtro para un país puntual.
 */
type Family = { id: string; label: string; image: string; catalog: string[]; keywords: string[]; byCountry?: Partial<Record<CountryCode, string>> };

const FAMILIES: Family[] = ([
  { id: 'bigbags', label: 'Big Bags', image: '/bigbags.png', catalog: ['Big Bags'], keywords: ['big bag', 'fibc', 'bolson'], byCountry: { AR: 'Bolsones/Bigbags' } },
  { id: 'costales', label: 'Bolsas PP', image: '/bolsaspp.png', catalog: ['Bolsas PP'], keywords: ['costal', 'bolsa', 'saco', 'rafia'] },
  {
    id: 'telas',
    label: 'Telas de rafia',
    image: '/telasweb.png',
    catalog: ['Rollos y Telas', 'Telas Tubulares', 'Telas planas'],
    keywords: ['tela', 'rafia', 'tejid'],
  },
  {
    id: 'hilos',
    label: 'Insumos',
    image: '/hilosweb.png',
    catalog: ['Hilo multifilamento de PP', 'Hilo retorcido y Mallas', 'Cuerdas/Cordones'],
    keywords: ['insumo', 'hilo', 'cuerda', 'cordon', 'malla'],
  },
  { id: 'polimeros', label: 'Polímeros', image: '/polimero.png', catalog: ['Polipropileno', 'Polietileno'], keywords: ['polimero', 'polipropileno', 'polietileno', 'pellet'] },
  { id: 'impresion', label: 'Impresión y terminación', image: '/tintas.png', catalog: ['Tintas', 'Cintas/Cintillas'], keywords: ['tinta', 'cinta', 'impres'] },
  { id: 'maquinaria', label: 'Maquinaria', image: '/maquinariaweb.png', catalog: ['Maquinarias'], keywords: ['maquin', 'equipo', 'extrus', 'telar'] },
  { id: 'medida', label: 'A medida', image: '/amedida.png', catalog: ['A medida'], keywords: ['a medida'] },
] as Family[]).filter((family) => !isCategoryHidden(family.label));

/** Si en la localidad elegida no hay proveedores, se muestran los que están a menos de esta distancia. */
const NEARBY_KM = 200;

const FREQUENT_SEARCHES = withoutHiddenCategories(['Big Bags', 'Telas', 'Rafia', 'Polímeros', 'Maquinaria']);

type SortKey = 'relevance' | 'name' | 'leadTime';

const PAGE_SIZE = 9;

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function supplierProducts(supplier: SupplierDirectoryRecord) {
  return Array.from(new Set([...supplier.categories, ...supplier.mainProducts]));
}

function supplierFamilies(supplier: SupplierDirectoryRecord) {
  const products = supplierProducts(supplier).map(normalize);
  const text = products.join(' ');
  return FAMILIES.filter(
    (family) =>
      family.catalog.some((label) => products.includes(normalize(label))) ||
      family.keywords.some((keyword) => text.includes(keyword)),
  );
}

function supplierLocation(supplier: SupplierDirectoryRecord) {
  return [supplier.city, supplier.country].filter(Boolean).join(', ');
}

/**
 * Filtro por localidad. Si lo escrito es una localidad conocida, la coincidencia
 * es exacta ("Rosario" no trae "Rosario de la Frontera"); si no, alcanza con que
 * la contenga ("santa" trae Santa Fe y Santa Rosa).
 */
function matchesLocation(supplier: SupplierDirectoryRecord, query: string, cities: { name: string }[]) {
  const wanted = normalize(query);
  const city = normalize(supplier.city ?? '');
  if (cities.some((item) => normalize(item.name) === wanted)) {
    return city === wanted;
  }
  return normalize(supplierLocation(supplier)).includes(wanted);
}

/**
 * Campo de texto con sugerencias: primero las localidades donde hay
 * proveedores y después cualquier localidad de Argentina (Georef), para poder
 * elegir la exacta aunque ahí no haya empresas (se buscan las cercanas).
 */
function LocationFilter({
  value,
  cities,
  onChange,
  onPick,
}: {
  value: string;
  cities: { name: string; count: number }[];
  onChange: (value: string) => void;
  onPick: (name: string, point: { lat: number; lon: number } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [places, setPlaces] = useState<{ query: string; list: Place[] }>({ query: '', list: [] });
  const listId = useId();
  const query = normalizePlace(value);
  const exact = cities.some((city) => normalizePlace(city.name) === query);

  // Localidades de Georef para lo escrito (con una pausa para no consultar en cada tecla).
  useEffect(() => {
    if (query.length < 2 || exact) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(value, controller.signal)
        .then((list) => setPlaces({ query, list }))
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [exact, query, value]);

  const withSuppliers = cities.filter((city) => !query || normalizePlace(city.name).includes(query)).slice(0, 6);
  const supplierNames = new Set(withSuppliers.map((city) => normalizePlace(city.name)));
  const others = places.query === query ? places.list.filter((place) => !supplierNames.has(normalizePlace(place.name))).slice(0, 6) : [];
  const options = [
    ...withSuppliers.map((city) => ({ key: `c-${city.name}`, name: city.name, detail: `${city.count}`, point: null as Place | null })),
    ...others.map((place) => ({ key: `p-${place.name}-${place.province}`, name: place.name, detail: place.province, point: place })),
  ];
  const searching = query.length >= 2 && !exact && places.query !== query;

  function pick(index: number) {
    const option = options[index];
    if (!option) return;
    // Las de Georef llevan la provincia: hay localidades con el mismo nombre en varias.
    const label = option.point && option.point.province ? `${option.name}, ${option.point.province}` : option.name;
    onPick(label, option.point ? { lat: option.point.lat, lon: option.point.lon } : null);
    setOpen(false);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <PinIcon />
      </span>
      <input
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && options.length > 0}
        aria-label="Localidad"
        className="h-10 w-full rounded-[10px] border border-slate-200 bg-white pl-9 pr-8 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1f5bff]"
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setHighlight((current) => Math.min(current + 1, options.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter' && open && options[highlight]) {
            event.preventDefault();
            pick(highlight);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Escribí una localidad"
        role="combobox"
        value={value}
      />
      {value ? (
        <button
          aria-label="Borrar localidad"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={() => onChange('')}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>
      ) : null}
      {open && !exact && (options.length > 0 || query) ? (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-[10px] border border-slate-200 bg-white p-1 shadow-[0_14px_32px_rgba(15,35,95,0.12)]"
          id={listId}
          role="listbox"
        >
          {options.map((option, index) => (
            <li key={option.key} aria-selected={index === highlight} role="option">
              {index === withSuppliers.length && index > 0 ? <p className="mx-2 mt-1 border-t border-slate-100 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Otras localidades</p> : null}
              <button
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition ${
                  index === highlight ? 'bg-[#f3f6ff] text-[#1f5bff]' : 'text-slate-700'
                }`}
                onClick={() => pick(index)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                type="button"
              >
                <span className="truncate">{option.name}</span>
                <span className="shrink-0 truncate text-[12px] text-slate-400">{option.detail}</span>
              </button>
            </li>
          ))}
          {options.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-slate-500">{searching ? 'Buscando localidades…' : 'No encontramos esa localidad.'}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/* Iconos ------------------------------------------------------------------ */

function PinIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ArrowIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ChevronIcon({ className = 'h-4 w-4', direction = 'down' }: { className?: string; direction?: 'down' | 'right' | 'up' }) {
  const d = direction === 'down' ? 'M6 9l6 6 6-6' : direction === 'up' ? 'M6 15l6-6 6 6' : 'M9 6l6 6-6 6';
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d={d} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function UsersIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0116 11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#1f5bff" />
        <path d="M7.5 12.3l3 3 6-6" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      </svg>
      Proveedor verificado
    </span>
  );
}

/* Página ------------------------------------------------------------------ */

// globals.css fija `a { color: inherit }` fuera de las capas de Tailwind: en
// los <Link> el color del texto va en un <span> hijo.
const primaryCta =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#1f5bff] px-6 text-sm font-semibold shadow-[0_14px_36px_rgba(31,91,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#194ee6]';

export default function ProveedoresPage() {
  const { categoryName, region } = useRegion();
  /** Nombre del filtro: el propio del país si lo tiene, si no el regional del rubro. */
  const familyName = useCallback(
    (family: Family) => (region && region !== 'XX' && family.byCountry?.[region]) || categoryName(family.label),
    [categoryName, region],
  );
  const [suppliers, setSuppliers] = useState<SupplierDirectoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [families, setFamilies] = useState<string[]>([]);
  // Localidad escrita o elegida en el filtro (vacío = todas) y, si se eligió
  // una de las sugerencias, sus coordenadas (para buscar por cercanía).
  const [location, setLocation] = useState('');
  const [locationPoint, setLocationPoint] = useState<{ lat: number; lon: number } | null>(null);
  // Coordenadas de la ciudad de cada proveedor (por id).
  const [supplierPoints, setSupplierPoints] = useState<Record<string, Located | null>>({});
  const [roles, setRoles] = useState<SupplierRole[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('relevance');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  // En mobile el panel de filtros arranca plegado para no tapar los resultados.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      try {
        const response = await atarApi.getMarketplaceSuppliers();
        if (!cancelled) {
          setSuppliers(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los proveedores.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSuppliers();

    return () => {
      cancelled = true;
    };
  }, []);

  // Opciones y conteos de los filtros, siempre sobre la base cargada.
  useEffect(() => {
    let cancelled = false;
    const argentine = suppliers.filter((supplier) => supplier.city && /^(ar|argentina)$/i.test(supplier.country ?? 'AR'));
    Promise.all(argentine.map(async (supplier) => [supplier.id, await locatePlace(supplier.city as string)] as const)).then((entries) => {
      if (!cancelled) setSupplierPoints(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [suppliers]);

  const familyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const supplier of suppliers) {
      for (const family of supplierFamilies(supplier)) {
        counts.set(family.id, (counts.get(family.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [suppliers]);
  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const supplier of suppliers) {
      if (supplier.city) {
        counts.set(supplier.city, (counts.get(supplier.city) ?? 0) + 1);
      }
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [suppliers]);
  // Provincia de cada localidad con proveedores (sale de Georef, ver lib/ar-places).
  const provinceOf = useCallback(
    (city: string) => {
      const supplier = suppliers.find((item) => item.city === city && supplierPoints[item.id]?.province);
      return supplier ? (supplierPoints[supplier.id]?.province ?? null) : null;
    },
    [supplierPoints, suppliers],
  );

  // Provincia que se está mirando en "Proveedores por ubicación": el mapa hace
  // zoom y muestra solo sus localidades.
  const [mapProvince, setMapProvince] = useState<string | null>(null);
  const mapCities = useMemo(
    () =>
      cities
        .filter((city) => !mapProvince || provinceOf(city.name) === mapProvince)
        .map((city) => ({ ...city, point: suppliers.map((item) => (item.city === city.name ? supplierPoints[item.id] : null)).find(Boolean) ?? null })),
    [cities, mapProvince, provinceOf, supplierPoints, suppliers],
  );

  // Sin proveedores en la localidad elegida: se buscan los cercanos.
  const nearbyMode =
    Boolean(locationPoint) && location.trim() !== '' && !cities.some((city) => normalizePlace(city.name) === normalizePlace(location));
  const distances = useMemo(() => {
    const map: Record<string, number> = {};
    if (!locationPoint) return map;
    for (const [id, point] of Object.entries(supplierPoints)) {
      if (point) map[id] = distanceKm(locationPoint, point);
    }
    return map;
  }, [locationPoint, supplierPoints]);

  const roleOptions = useMemo(
    () => (Object.keys(SUPPLIER_ROLE_LABELS) as SupplierRole[]).map((role) => ({ role, count: suppliers.filter((s) => s.supplierRole === role).length })),
    [suppliers],
  );
  const certificationOptions = useMemo(
    () => Array.from(new Set(suppliers.flatMap((supplier) => supplier.certifications))).sort(),
    [suppliers],
  );
  const verifiedCount = suppliers.filter((supplier) => supplier.isVerified).length;

  const filteredSuppliers = useMemo(() => {
    const query = normalize(search);
    const result = suppliers.filter((supplier) => {
      const ownFamilies = supplierFamilies(supplier);
      if (families.length > 0 && !ownFamilies.some((family) => families.includes(family.id))) {
        return false;
      }
      if (nearbyMode) {
        if (!(distances[supplier.id] <= NEARBY_KM)) {
          return false;
        }
      } else if (location.trim() && !matchesLocation(supplier, location, cities)) {
        return false;
      }
      if (roles.length > 0 && (!supplier.supplierRole || !roles.includes(supplier.supplierRole))) {
        return false;
      }
      if (verifiedOnly && !supplier.isVerified) {
        return false;
      }
      if (certifications.length > 0 && !certifications.some((cert) => supplier.certifications.includes(cert))) {
        return false;
      }
      if (!query) {
        return true;
      }
      return normalize(
        [
          supplier.name,
          supplierLocation(supplier),
          supplier.description ?? '',
          supplier.about ?? '',
          ...supplierProducts(supplier).flatMap((item) => [item, categoryName(item)]),
          ...ownFamilies.flatMap((family) => [family.label, familyName(family)]),
        ].join(' '),
      ).includes(query);
    });

    return [...result].sort((left, right) => {
      // Por cercanía, primero los más cercanos.
      if (nearbyMode) {
        return distances[left.id] - distances[right.id];
      }
      if (sort === 'name') {
        return left.name.localeCompare(right.name);
      }
      if (sort === 'leadTime') {
        return (left.leadTimeDays ?? Number.POSITIVE_INFINITY) - (right.leadTimeDays ?? Number.POSITIVE_INFINITY);
      }
      // Relevancia: verificados primero, después los que cubren más rubros.
      return Number(right.isVerified) - Number(left.isVerified) || supplierProducts(right).length - supplierProducts(left).length;
    });
  }, [categoryName, certifications, cities, distances, familyName, families, location, nearbyMode, roles, search, sort, suppliers, verifiedOnly]);

  const visibleSuppliers = filteredSuppliers.slice(0, visibleCount);
  const featuredSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => Number(b.isVerified) - Number(a.isVerified)).slice(0, 4),
    [suppliers],
  );
  const hasFilters =
    Boolean(search) || families.length > 0 || location.trim() !== '' || roles.length > 0 || verifiedOnly || certifications.length > 0;

  function resetPaging() {
    setVisibleCount(PAGE_SIZE);
  }

  function clearFilters() {
    setSearch('');
    setFamilies([]);
    setLocation('');
    setLocationPoint(null);
    setRoles([]);
    setVerifiedOnly(false);
    setCertifications([]);
    resetPaging();
  }

  function scrollToDirectory() {
    document.getElementById('directorio')?.scrollIntoView({ behavior: 'smooth' });
  }

  function selectCity(city: string) {
    setLocation(city);
    setLocationPoint(null);
    resetPaging();
    scrollToDirectory();
  }

  function toggle<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* ==================== HERO ==================== */}
      <section className="relative isolate overflow-hidden bg-[#0a1430] text-white">
        {/* La imagen ya trae el lado izquierdo azul oscuro para el texto. */}
        <Image alt="" className="animate-hero-zoom object-cover object-[35%_center]" fill priority sizes="100vw" src="/hero-proveedores-atar.png" />
        {/* El texto puede llegar hasta la tela clara: el oscurecido cubre hasta ~60% del ancho. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,36,0.95)_0%,rgba(7,14,36,0.85)_42%,rgba(7,14,36,0.45)_64%,transparent_85%)] 2xl:bg-[linear-gradient(90deg,rgba(7,14,36,0.85)_0%,rgba(7,14,36,0.6)_40%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[#070e24]/60 lg:hidden" />

        <div className="relative z-10 mx-auto flex min-h-[520px] w-full max-w-[1440px] flex-col justify-center px-6 py-16 lg:min-h-[600px] lg:px-12">
          <div className="max-w-[780px]">
            <HeroTitle accent="esta industria.">Las empresas que hacen posible</HeroTitle>
            <HeroLead>
              Conectá con fabricantes, distribuidores y proveedores verificados de rafia, Big Bags, sacos, telas, hilos,
              maquinaria y más.
            </HeroLead>
            <HeroSearch
              label="Buscar proveedores"
              onChange={(value) => {
                setSearch(value);
                resetPaging();
              }}
              onSubmit={() => {
                resetPaging();
                scrollToDirectory();
              }}
              placeholder="Buscá empresas, productos o ubicaciones..."
              value={search}
            />
            <HeroSuggestions
              label="Búsquedas frecuentes:"
              onPick={(term) => {
                setSearch(term);
                resetPaging();
                scrollToDirectory();
              }}
              terms={FREQUENT_SEARCHES}
            />
          </div>
        </div>
      </section>

      {/* ==================== DIRECTORIO ==================== */}
      <section className="scroll-mt-20 bg-white" id="directorio">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-14 lg:px-12 lg:py-16">
          <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.3rem]">
                Encontrá el socio ideal para tu industria.
              </h2>
            </div>
            {verifiedCount > 0 ? (
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="text-[#1f5bff]">
                  <UsersIcon />
                </span>
                {verifiedCount} {verifiedCount === 1 ? 'empresa verificada' : 'empresas verificadas'}
              </p>
            ) : null}
          </Reveal>

          <div className="mt-8 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
            {/* Filtros */}
            <aside className="h-fit rounded-[14px] border border-slate-200 bg-[#f7f9fd] p-5 lg:sticky lg:top-24">
              <button
                aria-expanded={mobileFiltersOpen}
                className="flex w-full items-center justify-between text-[16px] font-bold text-slate-950 lg:pointer-events-none"
                onClick={() => setMobileFiltersOpen((current) => !current)}
                type="button"
              >
                <span>
                  Filtros
                  {hasFilters ? <span className="ml-2 rounded-full bg-[#1f5bff] px-2 py-0.5 text-[11px] font-semibold text-white">activos</span> : null}
                </span>
                <span className="lg:hidden">
                  <ChevronIcon direction={mobileFiltersOpen ? 'up' : 'down'} />
                </span>
              </button>

              <div className={mobileFiltersOpen ? 'block' : 'hidden lg:block'}>
              <FilterGroup
                open={categoriesOpen}
                onToggle={() => setCategoriesOpen((current) => !current)}
                title="Categorías de productos"
              >
                {FAMILIES.map((family) => (
                  <Checkbox
                    key={family.id}
                    checked={families.includes(family.id)}
                    count={familyCounts.get(family.id) ?? 0}
                    label={familyName(family)}
                    onChange={() => {
                      setFamilies((current) => toggle(current, family.id));
                      resetPaging();
                    }}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Ubicación">
                <LocationFilter
                  cities={cities}
                  onChange={(value) => {
                    setLocation(value);
                    setLocationPoint(null);
                    resetPaging();
                  }}
                  onPick={(name, point) => {
                    setLocation(name);
                    setLocationPoint(point);
                    resetPaging();
                  }}
                  value={location}
                />
              </FilterGroup>

              <FilterGroup title="Tipo de empresa">
                {roleOptions.map((option) => (
                  <Checkbox
                    key={option.role}
                    checked={roles.includes(option.role)}
                    count={option.count}
                    label={SUPPLIER_ROLE_LABELS[option.role]}
                    onChange={() => {
                      setRoles((current) => toggle(current, option.role));
                      resetPaging();
                    }}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Certificaciones">
                <Checkbox
                  checked={verifiedOnly}
                  count={verifiedCount}
                  label="Proveedor verificado"
                  onChange={() => {
                    setVerifiedOnly((current) => !current);
                    resetPaging();
                  }}
                />
                {certificationOptions.map((cert) => (
                  <Checkbox
                    key={cert}
                    checked={certifications.includes(cert)}
                    count={suppliers.filter((supplier) => supplier.certifications.includes(cert)).length}
                    label={cert}
                    onChange={() => {
                      setCertifications((current) => toggle(current, cert));
                      resetPaging();
                    }}
                  />
                ))}
              </FilterGroup>

              <button
                className="mt-5 text-[13px] font-semibold text-[#1f5bff] underline-offset-2 hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline"
                disabled={!hasFilters}
                onClick={clearFilters}
                type="button"
              >
                Limpiar filtros
              </button>
              </div>
            </aside>

            {/* Resultados */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  <span className="text-[18px] font-bold text-slate-950">{loading ? '—' : filteredSuppliers.length}</span>{' '}
                  {filteredSuppliers.length === 1 ? 'proveedor encontrado' : 'proveedores encontrados'}
                </p>
                <label className="flex items-center gap-2 text-[13px] text-slate-600">
                  Ordenar por:
                  <span className="relative">
                    <select
                      className="h-9 appearance-none rounded-[10px] border border-slate-200 bg-white pl-3 pr-9 text-[13px] text-slate-800 outline-none focus:border-[#1f5bff]"
                      onChange={(event) => setSort(event.target.value as SortKey)}
                      value={sort}
                    >
                      <option value="relevance">Relevancia</option>
                      <option value="name">Nombre (A-Z)</option>
                      <option value="leadTime">Menor tiempo de entrega</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <ChevronIcon />
                    </span>
                  </span>
                </label>
              </div>

              {error ? (
                <div className="mt-4 rounded-[12px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
              ) : null}

              {nearbyMode && !loading ? (
                <div className="mt-4 flex items-start gap-3 rounded-[12px] border border-[#c9d6ff] bg-[#f3f6ff] px-4 py-3 text-[13.5px] text-slate-700">
                  <span className="mt-0.5 text-[#1f5bff]">
                    <PinIcon />
                  </span>
                  <p>
                    No hay proveedores en <b className="text-slate-950">{location}</b>.{' '}
                    {filteredSuppliers.length > 0
                      ? `Te mostramos los que están a menos de ${NEARBY_KM} km, del más cercano al más lejano.`
                      : `Tampoco encontramos proveedores a menos de ${NEARBY_KM} km.`}
                  </p>
                </div>
              ) : null}

              {loading ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-[400px] animate-pulse rounded-[14px] bg-slate-100" />
                  ))}
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="mt-5 rounded-[14px] border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center text-sm text-slate-500">
                  No hay proveedores que coincidan con los filtros.{' '}
                  <button className="font-semibold text-[#1f5bff] hover:underline" onClick={clearFilters} type="button">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleSuppliers.map((supplier, index) => (
                      <Reveal key={supplier.id} className="h-full" delay={(index % 3) * 80}>
                        <SupplierCard distance={nearbyMode ? distances[supplier.id] : undefined} supplier={supplier} />
                      </Reveal>
                    ))}
                  </div>
                  {visibleCount < filteredSuppliers.length ? (
                    <div className="mt-8 flex justify-center">
                      <button
                        className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#1f5bff]/40 bg-white px-6 text-sm font-semibold text-[#1f5bff] transition hover:bg-[#f3f6ff]"
                        onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                        type="button"
                      >
                        Cargar más proveedores ({filteredSuppliers.length - visibleCount})
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== ASESORAMIENTO ==================== */}
      <section className="relative isolate overflow-hidden bg-[#0b1530] text-white">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[60%]">
          <Image alt="" className="object-cover object-[12%_center]" fill sizes="(min-width:1024px) 60vw, 100vw" src="/heroatarweb.png" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b1530_0%,#0b1530_38%,rgba(11,21,48,0.7)_54%,rgba(11,21,48,0.1)_78%)]" />
        <div className="absolute inset-0 bg-[#0b1530]/60 lg:hidden" />
        <Reveal className="relative z-10 mx-auto w-full max-w-[1440px] px-6 py-14 lg:px-12 lg:py-16">
          <h2 className="max-w-[640px] text-3xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.5rem]">
            Mostrá tus productos a clientes de todo el país.
          </h2>
          <p className="mt-4 max-w-[500px] text-base leading-7 text-white/75">
            Sumá tu empresa a ATAR, recibí solicitudes de cotización y respondelas desde un solo lugar.
          </p>
          {/* Abre el registro con el perfil de proveedor ya elegido. */}
          <Link className={`${primaryCta} mt-7`} href="/acceso?perfil=proveedor">
            <span className="inline-flex items-center gap-2 text-white">
              Quiero ser proveedor
              <ArrowIcon />
            </span>
          </Link>
        </Reveal>
      </section>

      {/* ==================== UBICACIÓN + DESTACADOS ==================== */}
      <section className="bg-[#f5f7fc]">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-16">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.9rem]">Proveedores por ubicación</h2>
            <p className="mt-1.5 text-sm text-slate-500">Encontrá empresas en tu región.</p>
            <div className="mt-6 grid grid-cols-1 items-center gap-6 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
              <div className="mx-auto h-[360px] w-full max-w-[300px] sm:h-[400px]">
                <ArgentinaMap
                  cities={mapCities}
                  className="h-full w-full"
                  onSelect={selectCity}
                  province={mapProvince}
                  selected={location.trim() || undefined}
                />
              </div>
              <LocationBrowser cities={cities} loading={loading} onProvinceChange={setMapProvince} onSelectCity={selectCity} provinceOf={provinceOf} />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.9rem]">Proveedores destacados</h2>
                <p className="mt-1.5 text-sm text-slate-500">Conocé algunas de las empresas más activas de la plataforma.</p>
              </div>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f5bff]" onClick={scrollToDirectory} type="button">
                Ver todos los proveedores
                <ArrowIcon />
              </button>
            </div>
            <div className="mt-6 grid gap-5">
              {featuredSuppliers.map((supplier) => (
                <SupplierShowcaseCard key={supplier.id} compact supplier={supplier} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================== CTA PROVEEDORES ==================== */}
      <section className="relative isolate overflow-hidden bg-[#0b1530] text-white">
        <Image alt="" className="object-cover object-center opacity-40" fill sizes="100vw" src="/maquinariaweb.png" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b1530_0%,rgba(11,21,48,0.85)_45%,rgba(11,21,48,0.55)_100%)]" />
        <Reveal className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-16">
          <div>
            <h2 className="text-3xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.5rem]">Mostrá tus productos a una industria real.</h2>
            <p className="mt-3 text-base text-white/75">Recibí solicitudes de cotización, conectá con nuevos clientes y hacé crecer tu negocio.</p>
          </div>
          <Link
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-white px-6 text-sm font-semibold transition hover:-translate-y-0.5"
            href="/acceso?perfil=proveedor"
          >
            <span className="inline-flex items-center gap-2 text-[#1f5bff]">
              Quiero ser proveedor
              <ArrowIcon />
            </span>
          </Link>
        </Reveal>
      </section>
    </main>
  );
}

/* Subcomponentes ---------------------------------------------------------- */

function FilterGroup({
  title,
  children,
  open = true,
  onToggle,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="mt-5 border-t border-slate-200 pt-4 first-of-type:border-t-0">
      {onToggle ? (
        <button className="flex w-full items-center justify-between text-[13px] font-semibold text-slate-900" onClick={onToggle} type="button">
          {title}
          <ChevronIcon direction={open ? 'up' : 'down'} />
        </button>
      ) : (
        <p className="text-[13px] font-semibold text-slate-900">{title}</p>
      )}
      {open ? <div className="mt-3 space-y-2">{children}</div> : null}
    </div>
  );
}

function Checkbox({ checked, label, count, onChange }: { checked: boolean; label: string; count: number; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700">
      <input
        checked={checked}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-[#1f5bff]"
        onChange={onChange}
        type="checkbox"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-[12px] text-slate-400">({count})</span>
    </label>
  );
}

function SupplierCard({ supplier, distance }: { supplier: SupplierDirectoryRecord; distance?: number }) {
  const family = supplierFamilies(supplier)[0];
  const { categoryName } = useRegion();
  const products = supplierProducts(supplier).slice(0, 3).map(categoryName);
  const summary = supplier.about ?? supplier.description;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-[#1f5bff]/40 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        <Image
          alt=""
          className="object-cover transition duration-500 group-hover:scale-105"
          fill
          sizes="(min-width:1280px) 22vw, (min-width:640px) 45vw, 90vw"
          src={family?.image ?? '/maquinariaweb.png'}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-3">
          <CompanyLogo
            className="h-11 w-11"
            logoUrl={supplier.logoUrl}
            name={supplier.name}
            rounded="rounded-[10px]"
            textClassName="text-[13px]"
            tone="bg-[#eef3ff] text-[#1f5bff]"
          />
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold text-slate-950">{supplier.name}</h3>
            {supplier.isVerified ? <VerifiedBadge /> : null}
          </div>
        </div>
        {summary ? <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-slate-600">{summary}</p> : null}
        {products.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {products.map((product) => (
              <span key={product} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
                {product}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500">
          <PinIcon className="h-3.5 w-3.5" />
          {supplierLocation(supplier)}
          {distance !== undefined ? <span className="font-semibold text-[#1f5bff]">· a {Math.round(distance)} km</span> : null}
        </p>
        <div className="mt-auto pt-4">
          <Link
            className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#1f5bff]/40 text-[13px] font-semibold transition hover:bg-[#f3f6ff]"
            href={`/productos/${supplier.slug}`}
          >
            <span className="inline-flex items-center gap-1.5 text-[#1f5bff]">
              Ver perfil
              <ArrowIcon className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
