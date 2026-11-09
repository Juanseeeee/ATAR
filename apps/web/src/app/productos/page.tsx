'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRegion } from '@/components/region/region-provider';
import SupplierShowcaseCard from '@/components/marketing/supplier-showcase-card';
import { HeroLead, HeroSearch, HeroSuggestions, HeroTitle } from '@/components/marketing/page-hero';
import Reveal from '@/components/ui/reveal';
import { atarApi, type RequestCatalogCategoryRecord, type SupplierDirectoryRecord } from '@/lib/atar-api';
import { categorySearchTerms } from '@/lib/regional-terms';

type ProductCategory = {
  id: string;
  label: string;
  subtitle: string;
  imageSrc: string;
  imageClassName: string;
};

/* Catálogo de respaldo: se usa si el backend no responde, para conservar la
   presentación de la maqueta. Cuando el API responde, manda el dato real. */
const FALLBACK_CATEGORIES: ProductCategory[] = [
  {
    id: 'tintas',
    label: 'Tintas',
    subtitle: 'Tintas para impresión flexográfica y huecograbado en diferentes sustratos y aplicaciones.',
    imageSrc: '/tintas.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'polimeros',
    label: 'Polímeros',
    subtitle: 'Polipropileno, polietileno y masterbatches de alta calidad para la industria del plástico.',
    imageSrc: '/polimero.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'maquinarias',
    label: 'Maquinarias',
    subtitle: 'Equipos y líneas para procesos de extrusión, impresión, conversión y reciclado.',
    imageSrc: '/maquinariaweb.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'cuerdas-cordones',
    label: 'Cuerdas/Cordones',
    subtitle: 'Cuerdas y cordones de polipropileno para atado, sujeción y aplicaciones industriales.',
    imageSrc: '/cuerdas.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'bolsas',
    label: 'Bolsas',
    subtitle: 'Bolsas de polipropileno y polietileno para múltiples usos: alimentos, agroindustria, retail y más.',
    imageSrc: '/bolsaspp.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'sacos',
    label: 'Sacos',
    subtitle: 'Sacos tejidos y laminados para agroindustria, construcción, químicos y otras aplicaciones.',
    imageSrc: '/sacos.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'big-bags',
    label: 'Big Bags',
    subtitle: 'Contenedores flexibles de gran capacidad para transporte y almacenamiento de sólidos.',
    imageSrc: '/bigbags.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'cintas-cintillas',
    label: 'Cintas/Cintillas',
    subtitle: 'Cintas y cintillas de polipropileno para flejado, cierre y aseguramiento de cargas.',
    imageSrc: '/cintas.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'hilo-pp',
    label: 'Hilo multifilamento de PP',
    subtitle: 'Hilos de polipropileno de alta tenacidad para tejeduría, costura, agricultura y aplicaciones técnicas.',
    imageSrc: '/hilomulti.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'hilo-mallas',
    label: 'Hilo retorcido y Mallas para Arrolladora',
    subtitle: 'Hilos retorcidos y mallas diseñadas para arrolladoras y procesos de empaque agrícola.',
    imageSrc: '/hiloretor.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'telas-tubulares',
    label: 'Telas Tubulares',
    subtitle: 'Telas tubulares de polipropileno para la confección de bolsas, Big Bags y sacos.',
    imageSrc: '/telatubular.png',
    imageClassName: 'object-cover',
  },
  {
    id: 'telas-planas',
    label: 'Telas planas',
    subtitle: 'Telas planas de polipropileno para bolsas, sacos, coberturas y múltiples usos industriales.',
    imageSrc: '/telaplana.png',
    imageClassName: 'object-cover',
  },
];

const MOST_SEARCHED = ['Big Bags', 'Polímeros', 'Maquinarias', 'Bolsas', 'Tintas'];

/* Iconos ------------------------------------------------------------------ */

function CubeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M3.3 7.3L12 12l8.7-4.7M12 22V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
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

function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function TrendingIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M22 7l-8.5 8.5-5-5L2 17M16 7h6v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
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

/* Familias de productos ---------------------------------------------------- */


type ProductFamily = {
  id: string;
  title: string;
  /** Nombre corto de la familia. */
  tab: string;
  image: string;
  /** Cada ítem abre una solicitud con esa categoría del catálogo preseleccionada. */
  items: { label: string; category: string }[];
  /** Palabras para ubicar productos y búsquedas dentro de la familia. */
  keywords: string[];
};

const ALL_FAMILIES: ProductFamily[] = [
  {
    id: 'envases',
    title: 'Envases y embalajes',
    tab: 'Big Bags y sacos',
    image: '/bigbags.png',
    items: [
      { label: 'Big Bags', category: 'Big Bags' },
      { label: 'Sacos', category: 'Sacos' },
      { label: 'Bolsas PP', category: 'Bolsas PP' },
    ],
    keywords: ['big bag', 'bolsa', 'saco', 'fibc', 'envase', 'embalaje'],
  },
  {
    id: 'telas',
    title: 'Telas y tejidos',
    tab: 'Telas',
    image: '/telaplana.png',
    items: [
      { label: 'Rafia', category: 'Rollos y Telas' },
      { label: 'Telas tubulares', category: 'Telas Tubulares' },
      { label: 'Telas planas', category: 'Telas planas' },
      { label: 'Mallas', category: 'Hilo retorcido y Mallas' },
    ],
    keywords: ['tela', 'rafia', 'tejid', 'malla', 'rollo'],
  },
  {
    id: 'hilos',
    title: 'Hilos y cordones',
    tab: 'Hilos',
    image: '/hilomulti.png',
    items: [
      { label: 'Hilo multifilamento PP', category: 'Hilo multifilamento de PP' },
      { label: 'Hilo retorcido', category: 'Hilo retorcido y Mallas' },
      { label: 'Cuerdas', category: 'Cuerdas/Cordones' },
      { label: 'Cordones', category: 'Cuerdas/Cordones' },
    ],
    keywords: ['hilo', 'cuerda', 'cordon', 'cordón', 'multifilamento'],
  },
  {
    id: 'materias',
    title: 'Polímeros',
    tab: 'Polímeros',
    image: '/polimero.png',
    items: [
      { label: 'Polipropileno', category: 'Polipropileno' },
      { label: 'Polietileno', category: 'Polietileno' },
    ],
    keywords: ['polímero', 'polimero', 'polimeros', 'materia prima', 'polipropileno', 'polietileno', 'pellet', 'resina', 'masterbatch'],
  },
  {
    id: 'impresion',
    title: 'Impresión y terminación',
    tab: 'Tintas y cintas',
    image: '/tintas.png',
    items: [
      { label: 'Tintas', category: 'Tintas' },
      { label: 'Cintas', category: 'Cintas/Cintillas' },
      { label: 'Cintillas', category: 'Cintas/Cintillas' },
    ],
    keywords: ['tinta', 'cinta', 'cintilla', 'impres'],
  },
  {
    id: 'maquinaria',
    title: 'Maquinaria',
    tab: 'Maquinaria',
    image: '/maquinariaweb.png',
    items: [
      { label: 'Equipos', category: 'Maquinarias' },
      { label: 'Líneas de producción', category: 'Maquinarias' },
      { label: 'Accesorios', category: 'Maquinarias' },
    ],
    keywords: ['maquin', 'equipo', 'línea', 'linea', 'extrus', 'telar', 'accesorio', 'repuesto'],
  },
];

const FAMILIES = ALL_FAMILIES;

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function familyMatches(family: ProductFamily, query: string) {
  const needle = normalize(query.trim());
  if (!needle) {
    return true;
  }
  // Suma los nombres de cada país (maxisaco, costal, hilaza…) para que también encuentren la familia.
  return normalize(
    [family.title, ...family.items.flatMap((item) => [item.label, ...categorySearchTerms(item.category)]), ...family.keywords].join(' '),
  ).includes(needle);
}

// globals.css fija `a { color: inherit }` fuera de las capas de Tailwind: en
// los <Link> el color del texto va en un <span> hijo.
const primaryCta =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#1f5bff] px-6 text-sm font-semibold shadow-[0_14px_36px_rgba(31,91,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#194ee6]';

/* Página ------------------------------------------------------------------ */

/* El buscador del header y las categorías de la home llegan con ?q=. El
   fallback renderiza la página completa sin filtro, así el HTML estático no
   queda vacío mientras se leen los parámetros. */
export default function ProductosPage() {
  return (
    <Suspense fallback={<ProductosContent initialQuery="" />}>
      <ProductosWithQuery />
    </Suspense>
  );
}

/** Solicitud nueva, con la categoría del catálogo preseleccionada si se conoce. */
function newRequestHref(category?: string) {
  return `/dashboard/comprador/solicitudes/nueva${category ? `?category=${encodeURIComponent(category)}` : ''}`;
}

function ProductosWithQuery() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') ?? '';
  return <ProductosContent key={query} initialQuery={query} />;
}

function ProductosContent({ initialQuery }: { initialQuery: string }) {
  // El fallback arranca vacio a proposito: si se usa como estado inicial, la
  // pantalla pinta el catalogo hardcodeado y despues lo reemplaza por el de la
  // base, y se ve el parpadeo. Solo se usa si la API falla o viene vacia.
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [supplierCount, setSupplierCount] = useState<number | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierDirectoryRecord[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [search, setSearch] = useState(initialQuery);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [catalog, stats, directory] = await Promise.allSettled([
        atarApi.getRequestCategories(),
        atarApi.getMarketplaceStats(),
        atarApi.getMarketplaceSuppliers(),
      ]);
      if (cancelled) {
        return;
      }
      setCategories(
        catalog.status === 'fulfilled' && catalog.value.length > 0 ? catalog.value.map(mapCategory) : FALLBACK_CATEGORIES,
      );
      if (stats.status === 'fulfilled') {
        setSupplierCount(stats.value.suppliersCount);
      }
      // Verificados primero: son los que se muestran en "Empresas".
      setSuppliers(
        directory.status === 'fulfilled'
          ? [...directory.value].sort((left, right) => Number(right.isVerified) - Number(left.isVerified))
          : [],
      );
      setSuppliersLoaded(true);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleFamilies = useMemo(() => FAMILIES.filter((family) => familyMatches(family, search)), [search]);
  const featuredSuppliers = suppliers.slice(0, 5);

  const supplierLabel = supplierCount === null ? '1200+' : `${supplierCount}+`;

  function scrollToFamilies() {
    document.getElementById('familias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showAllFamilies() {
    setSearch('');
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* ==================== HERO ==================== */}
      <section className="relative isolate overflow-hidden bg-[#070b17] text-white">
        {/* La imagen ya trae el lado izquierdo oscuro para el texto y los productos a la derecha. */}
        <Image alt="" className="animate-hero-zoom object-cover object-[70%_center]" fill priority sizes="100vw" src="/hero-productos-atar.png" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,23,0.95)_0%,rgba(7,11,23,0.82)_42%,rgba(7,11,23,0.4)_64%,transparent_85%)] 2xl:bg-[linear-gradient(90deg,rgba(7,11,23,0.85)_0%,rgba(7,11,23,0.5)_38%,transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,11,23,0.8)_0%,transparent_30%)]" />
        <div className="absolute inset-0 bg-[#070b17]/55 lg:hidden" />

        <div className="relative z-10 mx-auto flex min-h-[520px] w-full max-w-[1440px] flex-col justify-center px-6 py-16 lg:min-h-[600px] lg:px-12">
          <div className="max-w-[780px]">
            <HeroTitle accent="en un solo lugar.">Todo lo que tu empresa necesita,</HeroTitle>
            <HeroLead>Explorá nuestras categorías y conectá con proveedores especializados en cada solución industrial.</HeroLead>
            <HeroSearch
              label="Buscar productos"
              onChange={setSearch}
              onSubmit={scrollToFamilies}
              placeholder="Buscar productos, aplicaciones o industrias..."
              value={search}
            />
            <HeroSuggestions
              label="Más buscados:"
              onPick={(term) => {
                setSearch(term);
                scrollToFamilies();
              }}
              terms={MOST_SEARCHED}
            />
          </div>

          {/* Los numeros, en la misma fila que usa la home. */}
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 xl:gap-0 xl:divide-x xl:divide-white/15">
            {[
              { icon: <CubeIcon className="h-5 w-5" />, v: `${categories.length}+`, l: 'categorías de productos' },
              { icon: <UsersIcon className="h-5 w-5" />, v: supplierLabel, l: 'proveedores especializados' },
              { icon: <ShieldIcon className="h-5 w-5" />, v: 'Verificados', l: 'calidad y confianza' },
              { icon: <TrendingIcon className="h-5 w-5" />, v: 'Actualizado', l: 'nuevos productos cada semana' },
            ].map((item, index) => (
              <div key={item.l} className="animate-fade-up flex items-center gap-2.5 xl:px-9 xl:first:pl-0" style={{ animationDelay: `${600 + index * 100}ms` }}>
                <span className="text-[#4f7bff]">{item.icon}</span>
                <p className="text-sm text-white/75">
                  <span className="font-semibold text-white">{item.v}</span> {item.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAMILIAS ==================== */}
      <section className="scroll-mt-20 bg-white" id="familias">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-12 lg:py-20">
          <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.4rem]">
                Explorá por familias de productos.
              </h2>
            </div>
            <button className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#1f5bff]" onClick={showAllFamilies} type="button">
              Ver todas las categorías
              <ArrowIcon />
            </button>
          </Reveal>

          {visibleFamilies.length === 0 ? (
            <div className="mt-10 rounded-[14px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
              No hay familias que coincidan con “{search}”.
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
              {visibleFamilies.map((family, index) => (
                <Reveal key={family.id} className="h-full" delay={index * 70}>
                  <FamilyCard family={family} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================== ASESORAMIENTO ==================== */}
      <section className="relative isolate overflow-hidden bg-[#0b1530] text-white">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[62%] lg:[mask-image:linear-gradient(90deg,transparent,#000_35%)]">
          <Image alt="" className="object-cover object-[62%_center]" fill sizes="(min-width:1024px) 62vw, 100vw" src="/asesoramiento-atar.png" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b1530_0%,#0b1530_36%,rgba(11,21,48,0.7)_52%,rgba(11,21,48,0.15)_75%)]" />
        <div className="absolute inset-0 bg-[#0b1530]/60 lg:hidden" />
        <Reveal className="relative z-10 mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-12 lg:py-20">
          <h2 className="max-w-[620px] text-3xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
            Contanos tu necesidad y encontramos la mejor solución.
          </h2>
          <p className="mt-4 max-w-[520px] text-base leading-7 text-white/75">
            Nuestro equipo te ayuda a encontrar los productos y proveedores ideales para tu proceso de producción.
          </p>
          <Link className={`${primaryCta} mt-8`} href={newRequestHref()}>
            <span className="inline-flex items-center gap-2 text-white">
              Iniciar cotización
              <ArrowIcon />
            </span>
          </Link>
        </Reveal>
      </section>

      {/* ==================== EMPRESAS ==================== */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-12 lg:py-20">
          <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.2rem]">Empresas que producen para esta industria</h2>
              <p className="mt-2 text-[15px] text-slate-500">Conocé algunas de las empresas verificadas que ofrecen estos productos.</p>
            </div>
            <Link className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold" href="/proveedores">
              <span className="inline-flex items-center gap-2 text-[#1f5bff]">
                Ver todos los proveedores
                <ArrowIcon />
              </span>
            </Link>
          </Reveal>

          {!suppliersLoaded ? (
            <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:gap-6">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-[300px] animate-pulse rounded-[22px] bg-slate-100" />
              ))}
            </div>
          ) : featuredSuppliers.length === 0 ? (
            <div className="mt-10 rounded-[14px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
              Pronto vas a ver acá a las empresas de la red.
            </div>
          ) : (
            <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:gap-6">
              {featuredSuppliers.map((supplier, index) => (
                <Reveal key={supplier.id} className="h-full min-w-0" delay={index * 70}>
                  <SupplierShowcaseCard supplier={supplier} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section className="relative isolate overflow-hidden bg-[#0b1530] text-white">
        <Image alt="" className="object-cover object-center opacity-45" fill sizes="100vw" src="/telaplana.png" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b1530_0%,rgba(11,21,48,0.85)_45%,rgba(11,21,48,0.55)_100%)]" />
        <Reveal className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-20">
          <div>
            <h2 className="max-w-[760px] text-3xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
              Pedí cotizaciones a proveedores especializados en la industria de la rafia.
            </h2>
            <p className="mt-4 text-base text-white/75">Compará opciones, precios y condiciones de empresas verificadas.</p>
          </div>
          <Link className={`${primaryCta} h-14 shrink-0 px-8 text-base`} href={newRequestHref()}>
            <span className="inline-flex items-center gap-2 text-white">
              Iniciar cotización
              <ArrowIcon />
            </span>
          </Link>
        </Reveal>
      </section>
    </main>
  );
}

/* Subcomponentes ---------------------------------------------------------- */

/** Ilustraciones de cada familia: el mismo estilo de íconos que las tarjetas del inicio. */
const FAMILY_ILLUSTRATIONS: Record<string, string> = {
  envases: '/categorias/cat5-bigbags.png',
  telas: '/categorias/cat5-telas.png',
  hilos: '/categorias/ico-hilos.png',
  materias: '/categorias/ico-polimeros.png',
  impresion: '/categorias/ico-tintas.png',
  maquinaria: '/categorias/cat5-maquinaria.png',
};

function FamilyCard({ family }: { family: ProductFamily }) {
  const { categoryName } = useRegion();
  return (
    <div className="group flex h-full flex-col rounded-[22px] border border-[#e3e8f4] bg-[linear-gradient(180deg,#f8faff_0%,#eff3fc_100%)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#c9d5f5] hover:shadow-[0_18px_40px_rgba(24,71,255,0.10)] sm:p-5">
      <div className="relative aspect-[5/4]">
        <Image
          alt={family.title}
          className="object-contain transition duration-500 group-hover:scale-105"
          fill
          sizes="(min-width:1280px) 14vw, (min-width:1024px) 28vw, 45vw"
          src={FAMILY_ILLUSTRATIONS[family.id] ?? family.image}
        />
      </div>
      <h3 className="mt-4 text-[17px] font-bold leading-tight tracking-[-0.02em] text-[#0b1533] sm:text-[19px]">{family.title}</h3>
      <ul className="mt-3 space-y-1.5">
        {family.items.map((item) => (
          <li key={item.label}>
            <Link className="text-[13px] transition hover:underline sm:text-[14px]" href={newRequestHref(item.category)}>
              <span className="text-slate-500 hover:text-[#1f5bff]">{categoryName(item.label)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        aria-label={`Solicitar cotización de ${family.title}`}
        className="mt-auto flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-full border border-[#e3e8f4] bg-white text-[#1f3fd6] shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition hover:border-[#1f5bff] group-hover:translate-x-0.5"
        href={newRequestHref(family.items[0]?.category)}
      >
        <ArrowIcon />
      </Link>
    </div>
  );
}

function mapCategory(record: RequestCatalogCategoryRecord): ProductCategory {
  const fallback = FALLBACK_CATEGORIES.find((item) => item.label === record.label);

  return {
    id: record.id,
    label: record.label,
    subtitle: record.subtitle ?? fallback?.subtitle ?? '',
    // Prioriza las imágenes locales con nombre de producto sobre las del API.
    imageSrc: fallback?.imageSrc ?? record.imageSrc ?? '/logoatar.png',
    imageClassName: record.imageClassName ?? 'object-cover',
  };
}
