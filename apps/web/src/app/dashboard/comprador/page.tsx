'use client';

import Image from 'next/image';
import { useRegion } from '@/components/region/region-provider';
import { categorySearchTerms } from '@/lib/regional-terms';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import BuyerHomeSearch, { BUYER_HOME_HREF } from '@/components/dashboard/buyer-home-search';
import CompanyLogo from '@/components/dashboard/company-logo';
import { PageLoader } from '@/components/ui/spinner';
import {
  atarApi,
  type RequestCatalogCategoryRecord,
  type RequestRecord,
  type SupplierDirectoryRecord,
} from '@/lib/atar-api';
import { useBuyerDashboardData } from '@/lib/dashboard-hooks';
import { getSupplierLocation } from '@/lib/provider-directory';
import { FALLBACK_REQUEST_CATEGORIES } from '@/lib/request-catalog-fallback';

/* Rutas del flujo de cotización existente ---------------------------------- */

const NUEVA_HREF = '/dashboard/comprador/solicitudes/nueva';
const PROVEEDORES_HREF = '/dashboard/comprador/proveedores';
const SOLICITUDES_HREF = '/dashboard/comprador/solicitudes';

/** Paso 1 del wizard mostrando solo esos productos del catálogo. */
function stepOneFilterHref(labels: string[]) {
  return `${NUEVA_HREF}?step=1&only=${encodeURIComponent(labels.join(','))}`;
}

/** Paso 2 del wizard, con la categoría ya elegida. */
function stepTwoHref(category: string) {
  return `${NUEVA_HREF}?step=2&category=${encodeURIComponent(category)}`;
}

/** Solicitud nueva con la categoría del catálogo preseleccionada. */
function quoteHref(category?: string | null) {
  return category ? `${NUEVA_HREF}?category=${encodeURIComponent(category)}` : NUEVA_HREF;
}

function categoryHref(label: string) {
  return normalize(label) === 'a medida' ? stepTwoHref(label) : stepOneFilterHref([label]);
}

function supplierHref(slug: string) {
  return `${PROVEEDORES_HREF}/${slug}`;
}

/* Datos --------------------------------------------------------------------- */

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Íconos de rubro (los mismos del inicio público). Varios rubros del catálogo
 * comparten ícono: todos los hilos/cuerdas usan el de hilos, las telas el de telas.
 */
const ICONS: Record<string, string> = {
  'big bags': '/categorias/ico-bigbags.png',
  'bolsas pp': '/categorias/ico-bolsas.png',
  sacos: '/categorias/ico-bolsas.png',
  polipropileno: '/categorias/ico-polimeros.png',
  polietileno: '/categorias/ico-polimeros.png',
  'rollos y telas': '/categorias/ico-telas.png',
  'telas tubulares': '/categorias/ico-telas.png',
  'telas planas': '/categorias/ico-telas.png',
  tintas: '/categorias/ico-tintas.png',
  fotopolímeros: '/categorias/ico-polimeros.png',
  fotopolimeros: '/categorias/ico-polimeros.png',
  'cuerdas/cordones': '/categorias/ico-hilos.png',
  'cintas/cintillas': '/categorias/ico-hilos.png',
  'hilo multifilamento de pp': '/categorias/ico-hilos.png',
  'hilo retorcido y mallas': '/categorias/ico-hilos.png',
  maquinarias: '/categorias/ico-maquinaria.png',
  'a medida': '/categorias/ico-amedida.png',
};

/** Rubros de la fila del home, en orden. */
const HOME_ROW = ['big bags', 'bolsas pp', 'rollos y telas', 'maquinarias', 'tintas', 'cuerdas/cordones', 'a medida'];

/** Recortes PNG (producto solo, sin fondo) para los rubros que todavía no tienen ícono. */
const CUTOUTS: Record<string, string> = {
  'a medida': '/amedida.png',
};

type HomeCategory = {
  id: string;
  label: string;
  subtitle: string;
  image: string;
  /** true = ícono de rubro sobre fondo blanco. */
  icon: boolean;
  /** true = PNG recortado: se muestra entero y agrandado, sin recortar. */
  cutout: boolean;
  /** Texto contra el que se compara la búsqueda. */
  haystack: string;
};

function mapCategory(record: RequestCatalogCategoryRecord): HomeCategory {
  // Sin recorte, las fotos locales con nombre de producto tienen prioridad sobre las del API.
  const local = FALLBACK_REQUEST_CATEGORIES.find((item) => normalize(item.label) === normalize(record.label));
  const icon = ICONS[normalize(record.label)];
  const cutout = CUTOUTS[normalize(record.label)];
  return {
    id: record.id,
    label: record.label,
    subtitle: record.subtitle ?? local?.subtitle ?? '',
    image: icon ?? cutout ?? local?.imageSrc ?? record.imageSrc ?? '/logoatar.png',
    icon: Boolean(icon),
    cutout: Boolean(cutout),
    haystack: normalize(
      [
        record.label,
        // Nombres de otros países (maxisaco, costal, bolsón…) para que también encuentren el rubro.
        ...categorySearchTerms(record.label),
        record.subtitle ?? '',
        ...record.searchKeywords,
        ...record.fields.flatMap((field) => [field.label, ...field.options]),
      ].join(' '),
    ),
  };
}

function supplierHaystack(supplier: SupplierDirectoryRecord) {
  return normalize(
    [
      supplier.name,
      supplier.city ?? '',
      supplier.description ?? '',
      ...supplier.mainProducts,
      ...supplier.categories,
      ...supplier.certifications,
    ].join(' '),
  );
}

function requestActivity(request: RequestRecord) {
  const quotes = request._count?.quotes ?? request.quotes?.length ?? 0;
  const quotesLabel = `${quotes} ${quotes === 1 ? 'cotización' : 'cotizaciones'}`;
  if (request.status === 'DRAFT') {
    return { badge: 'Borrador', tone: 'bg-slate-200 text-slate-700', action: 'Continuar solicitud' };
  }
  if (request.status === 'CANCELLED') {
    return { badge: 'Cancelada', tone: 'bg-rose-100 text-rose-700', action: 'Ver solicitud' };
  }
  if (['AWARDED', 'ORDER_ISSUED', 'COMPLETED'].includes(request.status)) {
    return { badge: 'Adjudicada', tone: 'bg-emerald-100 text-emerald-700', action: 'Ver pedido' };
  }
  if (quotes > 0) {
    return { badge: 'Con respuestas', tone: 'bg-blue-100 text-blue-700', action: `Comparar ${quotesLabel}` };
  }
  return { badge: 'Esperando respuestas', tone: 'bg-amber-100 text-amber-800', action: 'Ver solicitud' };
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (date.toDateString() === new Date().toDateString()) {
    return `Hoy, ${new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)}`;
  }
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(date);
}

/* Piezas -------------------------------------------------------------------- */

function ArrowRight({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg aria-label="Proveedor verificado" className="h-4 w-4 shrink-0 text-[#1847ff]" role="img" viewBox="0 0 24 24">
      <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2L12 2z" fill="currentColor" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.7" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#1847ff] font-semibold text-white transition hover:bg-[#0f3ff5]';
const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-slate-400 bg-white font-semibold text-slate-950 transition hover:border-slate-950';

function CategoryCell({ category, className = 'flex' }: { category: HomeCategory; className?: string }) {
  const { categoryName } = useRegion();
  const label = categoryName(category.label);
  return (
    <Link
      className={`group relative ${className} items-center gap-3 border-b border-r border-slate-300 bg-white p-2.5 transition hover:z-10 hover:shadow-[0_8px_24px_rgba(15,23,42,0.16)] sm:flex-col sm:gap-2.5 sm:px-3 sm:py-5 sm:text-center`}
      href={categoryHref(category.label)}
    >
      {/* Ícono suelto, sin círculo que lo contenga. */}
      <span className="relative h-12 w-12 shrink-0 sm:h-[92px] sm:w-[92px]">
        <Image
          alt=""
          className={
            'object-contain transition group-hover:scale-105'
          }
          fill
          sizes="92px"
          src={category.image}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold leading-[1.25] text-slate-950 group-hover:text-[#1847ff] sm:text-[14px]">
          {/* Espacio de ancho cero: deja cortar "Cuerdas/Cordones" después de la barra. */}
          {label.replace(/\//g, '/\u200b')}
        </span>
        {category.subtitle ? (
          <span className="mt-0.5 hidden text-[12px] text-slate-600 sm:line-clamp-2">{category.subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}

type ShortcutIcon = 'plus' | 'file' | 'tag' | 'box' | 'building' | 'heart' | 'ruler' | 'chat' | 'repeat';

function ShortcutGlyph({ name }: { name: ShortcutIcon }) {
  const paths: Record<ShortcutIcon, string> = {
    plus: 'M12 5v14M5 12h14',
    file: 'M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-5-6zM14 2v6h5M9 13h6M9 17h4',
    tag: 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8zM7 7h.01',
    box: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.3 7.3L12 12l8.7-4.7M12 22V12',
    building: 'M4 21V5a2 2 0 012-2h7a2 2 0 012 2v16M15 9h3a2 2 0 012 2v10M2 21h20M8 7h3M8 11h3M8 15h3',
    heart: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21.3l7.8-7.8 1-1.1a5.5 5.5 0 000-7.8z',
    ruler: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
    chat: 'M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z',
    repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3',
  };
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d={paths[name]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

type Shortcut = {
  title: string;
  /** Nombre corto para la grilla de mobile. */
  short: string;
  text: string;
  action: string;
  href: string;
  icon: ShortcutIcon;
  primary?: boolean;
  /** Pendientes que se marcan sobre el ícono en mobile. */
  badge?: number;
  /** Algo nuevo (mensajes sin leer): la tarjeta se pinta de azul claro. */
  highlight?: boolean;
};

/** Mobile: los seis accesos a la vista, en una grilla de 3×2 con ícono y nombre. */
function ShortcutTile({ shortcut }: { shortcut: Shortcut }) {
  return (
    <Link
      className="group flex flex-col items-center gap-2 rounded-[10px] px-1 py-3 text-center transition active:bg-slate-50"
      href={shortcut.href}
    >
      <span
        className={`relative flex h-11 w-11 items-center justify-center rounded-full ${
          shortcut.primary || shortcut.highlight ? 'bg-[#1847ff] text-white shadow-[0_6px_14px_rgba(24,71,255,0.35)]' : 'bg-[#dbe6ff] text-[#1238d6]'
        }`}
      >
        <ShortcutGlyph name={shortcut.icon} />
        {shortcut.badge ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d4f] px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {shortcut.badge > 9 ? '9+' : shortcut.badge}
          </span>
        ) : null}
      </span>
      <span className={`text-[12px] font-semibold leading-tight ${shortcut.primary || shortcut.highlight ? 'text-[#1847ff]' : 'text-slate-800'}`}>
        {shortcut.short}
      </span>
    </Link>
  );
}

/** Acceso rápido de escritorio: ícono, nombre y una línea de estado. */
function ShortcutCard({ shortcut }: { shortcut: Shortcut }) {
  return (
    <Link
      className={`group flex min-w-[170px] shrink-0 items-center gap-2.5 rounded-[12px] border px-2.5 py-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition xl:min-w-0 ${
        shortcut.primary
          ? 'border-[#1847ff] bg-[#1847ff] hover:bg-[#0f3ff5]'
          : shortcut.highlight
            ? 'border-[#1847ff] bg-[#dbe6ff] shadow-[0_0_0_3px_rgba(24,71,255,0.15)] hover:bg-[#cfdcff]'
            : 'border-slate-300 bg-white hover:border-[#1847ff]'
      }`}
      href={shortcut.href}
    >
      <span
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          shortcut.primary ? 'bg-white/15 text-white' : shortcut.highlight ? 'bg-[#1847ff] text-white' : 'bg-[#dbe6ff] text-[#1238d6]'
        }`}
      >
        <ShortcutGlyph name={shortcut.icon} />
        {shortcut.badge ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d4f] px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {shortcut.badge > 9 ? '9+' : shortcut.badge}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 max-w-full">
        <span className={`block truncate text-[13.5px] font-bold leading-5 ${shortcut.primary ? 'text-white' : shortcut.highlight ? 'text-[#1238d6]' : 'text-slate-950 group-hover:text-[#1847ff]'}`}>
          {shortcut.short}
        </span>
        <span className={`block truncate text-[12px] leading-4 ${shortcut.primary ? 'text-white/80' : shortcut.highlight ? 'font-semibold text-[#1238d6]' : 'text-slate-500'}`}>{shortcut.text}</span>
      </span>
    </Link>
  );
}

function SupplierCell({ supplier }: { supplier: SupplierDirectoryRecord }) {
  const { categoryName } = useRegion();
  const specialties = Array.from(new Set([...supplier.mainProducts, ...supplier.categories].map(categoryName))).slice(0, 4);
  const terms = [
    typeof supplier.minimumOrder === 'number' ? `Pedido mín. ${supplier.minimumOrder.toLocaleString('es-AR')}` : null,
    typeof supplier.leadTimeDays === 'number' ? `Entrega en ${supplier.leadTimeDays} días` : null,
  ].filter(Boolean);
  return (
    <article className="flex flex-col border-b border-r border-slate-300 bg-white p-4 lg:p-5">
      <div className="flex items-center gap-3">
        <CompanyLogo
          className="h-14 w-14"
          logoUrl={supplier.logoUrl}
          name={supplier.name}
          rounded="rounded-full"
          textClassName="text-[15px] font-bold"
          tone="bg-[#dbe6ff] text-[#1238d6]"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[16px] font-bold text-slate-950">
            <span className="truncate">{supplier.name}</span>
            {supplier.isVerified ? <VerifiedIcon /> : null}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-600">
            <PinIcon />
            <span className="truncate">{getSupplierLocation(supplier.city, supplier.country)}</span>
          </p>
        </div>
      </div>
      {specialties.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {specialties.map((item) => (
            <span key={item} className="rounded-md border border-slate-300 bg-[#eef1f7] px-2 py-0.5 text-[12px] font-medium text-slate-800">
              {item}
            </span>
          ))}
        </div>
      ) : null}
      {terms.length > 0 ? <p className="mt-2.5 text-[13px] text-slate-600">{terms.join(' · ')}</p> : null}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <Link className={`${primaryButton} h-10 px-2 text-[13px]`} href={quoteHref(supplier.categories[0])}>
          Solicitar cotización
        </Link>
        <Link className={`${secondaryButton} h-10 px-2 text-[13px]`} href={supplierHref(supplier.slug)}>
          Ver perfil
        </Link>
      </div>
    </article>
  );
}

/** Contenedor blanco de cada bloque del home, con su encabezado separado por una línea. */
function Shelf({
  title,
  href,
  linkLabel,
  tourId,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  /** Nombre del bloque para los recorridos guiados (`data-tour`). */
  tourId?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-slate-300 bg-white shadow-[0_2px_6px_rgba(15,23,42,0.06)]" data-tour={tourId}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-300 px-4 py-3.5 lg:px-5">
        <h2 className="text-[18px] font-bold tracking-tight text-slate-950 lg:text-[20px]">{title}</h2>
        {href && linkLabel ? (
          <Link className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-[#1847ff] hover:underline" href={href}>
            {linkLabel}
            <ArrowRight />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/* Página -------------------------------------------------------------------- */

export default function DashboardCompradorPage() {
  // El término de búsqueda llega por la URL (?q=) desde el buscador del header.
  return (
    <Suspense fallback={<PageLoader label="Preparando tu inicio…" />}>
      <BuyerHome />
    </Suspense>
  );
}

function BuyerHome() {
  const { session, requests, loading } = useBuyerDashboardData();
  const searchParams = useSearchParams();
  const query = (searchParams?.get('q') ?? '').trim();
  const needle = normalize(query);

  const [suppliers, setSuppliers] = useState<SupplierDirectoryRecord[]>([]);
  const [catalog, setCatalog] = useState<RequestCatalogCategoryRecord[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  // Mensajes sin leer, para el acceso rápido a Mensajes.
  const [unreadMessages, setUnreadMessages] = useState(0);
  const accessToken = session?.accessToken;

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;

    async function load(token: string) {
      const [directory, categories, conversations] = await Promise.allSettled([
        atarApi.getSuppliers(token),
        atarApi.getRequestCategories(),
        atarApi.getConversations(undefined, token),
      ]);
      if (cancelled) {
        return;
      }
      setUnreadMessages(
        conversations.status === 'fulfilled'
          ? conversations.value.filter((item) => item.contextType !== 'DIRECT').reduce((total, item) => total + item.unreadCount, 0)
          : 0,
      );
      // Verificados primero: son los que se recomiendan.
      setSuppliers(
        directory.status === 'fulfilled'
          ? [...directory.value].sort((left, right) => Number(right.isVerified) - Number(left.isVerified))
          : [],
      );
      setCatalog(
        categories.status === 'fulfilled' && categories.value.length > 0 ? categories.value : FALLBACK_REQUEST_CATEGORIES,
      );
      setCatalogLoaded(true);
    }

    void load(accessToken);

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const categories = useMemo(() => catalog.map(mapCategory), [catalog]);
  // Sin búsqueda, el home muestra una sola fila con estos rubros, en este orden
  // (Maquinarias en el medio); el resto queda detrás de "Ver todo el catálogo".
  const visibleCategories = needle
    ? categories.filter((item) => item.haystack.includes(needle))
    : HOME_ROW.map((label) => categories.find((item) => normalize(item.label) === label)).filter(
        (item): item is HomeCategory => Boolean(item),
      );
  const matchedSuppliers = needle ? suppliers.filter((item) => supplierHaystack(item).includes(needle)) : suppliers;
  const visibleSuppliers = needle ? matchedSuppliers : matchedSuppliers.slice(0, 4);
  const noResults = Boolean(needle) && catalogLoaded && visibleCategories.length + visibleSuppliers.length === 0;

  const recentRequests = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [requests],
  );
  // Pedidos para repetir: solicitudes ya enviadas, las más nuevas primero.
  const repeatable = useMemo(
    () =>
      [...requests]
        .filter((item) => item.status !== 'DRAFT')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [requests],
  );


  // Cifras reales de las solicitudes del comprador, para los accesos.
  const counts = useMemo(() => {
    const open = requests.filter((item) => ['PUBLISHED', 'REVIEWING', 'NEGOTIATING'].includes(item.status));
    return {
      open: open.length,
      withQuotes: open.filter((item) => (item._count?.quotes ?? item.quotes?.length ?? 0) > 0).length,
      orders: requests.filter((item) => ['AWARDED', 'ORDER_ISSUED', 'COMPLETED'].includes(item.status)).length,
    };
  }, [requests]);

  if (loading) {
    return <PageLoader label="Preparando tu inicio…" />;
  }

  const firstName = session?.user.firstName ?? '';
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  const shortcuts: Shortcut[] = [
    { title: 'Solicitar cotización', short: 'Cotizar', text: 'Gratis, sin compromiso', action: '', href: NUEVA_HREF, icon: 'plus', primary: true },
    {
      title: 'Mensajes',
      short: 'Mensajes',
      text: unreadMessages > 0 ? `${unreadMessages} sin leer` : 'Todo leído',
      action: '',
      href: '/dashboard/comprador/mensajes',
      icon: 'chat',
      badge: unreadMessages,
      highlight: unreadMessages > 0,
    },
    {
      title: 'Cotizaciones',
      short: 'Cotizaciones',
      text: counts.withQuotes > 0 ? `${counts.withQuotes} para comparar` : 'Sin novedades',
      action: '',
      href: '/dashboard/comprador/cotizaciones',
      icon: 'tag',
      badge: counts.withQuotes,
    },
    {
      title: 'Solicitudes',
      short: 'Solicitudes',
      text: counts.open > 0 ? plural(counts.open, 'abierta', 'abiertas') : 'Ninguna abierta',
      action: '',
      href: SOLICITUDES_HREF,
      icon: 'file',
    },
    {
      title: 'Pedidos',
      short: 'Pedidos',
      text: counts.orders > 0 ? plural(counts.orders, 'en curso', 'en curso') : 'Sin pedidos',
      action: '',
      href: '/dashboard/comprador/pedidos',
      icon: 'box',
    },
    { title: 'Favoritos', short: 'Favoritos', text: 'Guardados', action: '', href: '/dashboard/comprador/favoritos', icon: 'heart' },
  ];

  return (
    <div className="pb-10">
      {/* En mobile el header de escritorio no se muestra: la barra azul con el buscador vive acá. */}
      <div className="border-b border-[#0f2fb8] bg-[#1847ff] px-4 pb-3 pt-3 lg:hidden" data-tour="buyer-search">
        <div className="mb-2.5 flex items-center gap-2">
          <Image alt="" height={24} src="/logoatarblanco.png" width={26} />
          <span className="text-[15px] font-bold text-white">ATAR</span>
        </div>
        <BuyerHomeSearch />
      </div>

      {needle ? (
        /* ==================== RESULTADOS ==================== */
        <div className="px-4 pt-4 xl:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-slate-300 bg-white px-4 py-3.5">
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-bold tracking-tight text-slate-950 lg:text-[24px]">
                Resultados para “{query}”
              </h1>
              <p className="mt-0.5 text-[14px] text-slate-600">
                {plural(visibleCategories.length, 'categoría', 'categorías')} ·{' '}
                {plural(visibleSuppliers.length, 'proveedor', 'proveedores')}
              </p>
            </div>
            <Link className={`${secondaryButton} h-10 px-4 text-[13px]`} href={BUYER_HOME_HREF} scroll={false}>
              Limpiar búsqueda
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ==================== BANNER ==================== */}
          <section className="relative isolate overflow-hidden bg-[#0b1f66] text-white">
            {/* Productos recortados (PNG), no fotos de fondo. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block">
              <div className="absolute left-[76%] top-[-4%] aspect-[3/2] h-[108%] -translate-x-1/2">
                <Image alt="" className="object-contain" fill sizes="50vw" src="/rollo.png" />
              </div>
              <div className="absolute left-[40%] top-[-14%] aspect-[3/2] h-[118%] -translate-x-1/2">
                <Image alt="" className="object-contain" fill priority sizes="50vw" src="/bigbag.png" />
              </div>
            </div>

            <div className="relative px-4 pb-14 pt-5 lg:max-w-[54%] lg:pb-16 lg:pt-7 xl:px-6">
              {firstName ? <p className="text-[14px] font-semibold text-[#9db8ff]">Hola, {firstName}</p> : null}
              <h1 className="mt-1 max-w-[720px] text-[24px] font-extrabold leading-[1.1] tracking-tight sm:text-[28px] lg:text-[34px]">
                Encontrá proveedores industriales y cotizá en un solo lugar
              </h1>
              <p className="mt-2 max-w-[520px] text-[14.5px] leading-6 text-white/85 lg:text-[16px]">
                Descubrí productos, compará alternativas y conectá con fabricantes y distribuidores.
              </p>
            </div>
          </section>

          {/* ==================== ACCESOS ==================== */}
          <div className="relative -mt-9 lg:-mt-10" data-tour="home-shortcuts">
            <div className="mx-4 grid grid-cols-4 gap-1 rounded-[14px] border border-slate-300 bg-white p-1.5 shadow-[0_6px_18px_rgba(15,23,42,0.10)] sm:hidden">
              {shortcuts.map((shortcut) => (
                <ShortcutTile key={shortcut.title} shortcut={shortcut} />
              ))}
            </div>
            <div className="hidden gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:flex xl:grid xl:grid-cols-6 xl:overflow-visible xl:px-6 [&::-webkit-scrollbar]:hidden">
              {shortcuts.map((shortcut) => (
                <ShortcutCard key={shortcut.title} shortcut={shortcut} />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="w-full space-y-4 px-4 pt-4 xl:px-6">
        {noResults ? (
          <div className="rounded-[10px] border border-dashed border-slate-400 bg-white px-5 py-10 text-center">
            <p className="text-[17px] font-bold text-slate-950">No encontramos nada para “{query}”</p>
            <p className="mx-auto mt-1 max-w-md text-[14px] text-slate-600">
              Probá con otro producto, material o proveedor. Si es algo específico, pedilo a medida y los proveedores te
              responden con su propuesta.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Link className={`${primaryButton} h-11 px-5 text-[14px]`} href={stepTwoHref('A medida')}>
                Solicitar producto a medida
              </Link>
              <Link className={`${secondaryButton} h-11 px-5 text-[14px]`} href={BUYER_HOME_HREF} scroll={false}>
                Ver todo el catálogo
              </Link>
            </div>
          </div>
        ) : null}

        {/* ==================== PRODUCTOS (rubros con su ícono) ==================== */}
        {!catalogLoaded || visibleCategories.length > 0 ? (
          <div className="scroll-mt-4" data-tour="home-categories" id="categorias">
            <Shelf href={needle ? undefined : NUEVA_HREF} linkLabel="Ver todo el catálogo" title="Productos">
              {/* Cada celda dibuja su línea derecha e inferior; el margen negativo esconde las del borde. */}
              <div className="-mb-px -mr-px grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
                {catalogLoaded
                  ? visibleCategories.map((category, index) => (
                      // La fila entra completa desde 1280 px; antes van 3 rubros más el acceso al catálogo.
                      <CategoryCell
                        key={category.id}
                        category={category}
                        className={!needle && index >= 3 ? 'hidden xl:flex' : 'flex'}
                      />
                    ))
                  : Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} aria-hidden="true" className="h-[92px] animate-pulse border-b border-r border-slate-300 bg-white sm:h-[176px]" />
                    ))}
                {catalogLoaded && !needle ? (
                  <Link
                    className="group flex items-center gap-3 border-b border-r border-slate-300 bg-[#eef3ff] p-2.5 transition hover:bg-[#dbe6ff] sm:flex-col sm:justify-center sm:gap-2.5 sm:px-3 sm:py-5 sm:text-center"
                    href={NUEVA_HREF}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1847ff] text-white sm:h-[92px] sm:w-[92px]">
                      <ArrowRight className="h-6 w-6 transition group-hover:translate-x-0.5 sm:h-8 sm:w-8" />
                    </span>
                    <span className="text-[13px] font-bold leading-[1.25] text-[#1238d6] sm:text-[14px]">Ver todo el catálogo</span>
                  </Link>
                ) : null}
              </div>
            </Shelf>
          </div>
        ) : null}

        {/* ==================== PROVEEDORES ==================== */}
        {needle && catalogLoaded && visibleSuppliers.length > 0 ? (
          <Shelf href={PROVEEDORES_HREF} linkLabel="Ver todos" title="Proveedores" tourId="home-suppliers">
            <div className="-mb-px -mr-px grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {visibleSuppliers.map((supplier) => (
                <SupplierCell key={supplier.id} supplier={supplier} />
              ))}
            </div>
          </Shelf>
        ) : null}

        {/* ==================== RETOMÁ Y REPETÍ ==================== */}
        {!needle ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Shelf href={recentRequests.length > 0 ? SOLICITUDES_HREF : undefined} linkLabel="Ver todas" title="Retomá donde dejaste" tourId="home-activity">
              {recentRequests.length === 0 ? (
                <p className="px-4 py-5 text-[14px] text-slate-600 lg:px-5">
                  Todavía no tenés solicitudes. Cuando pidas una cotización, la vas a poder seguir desde acá.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {recentRequests.map((request) => {
                    const activity = requestActivity(request);
                    return (
                      <li key={request.id}>
                        <Link className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-[#eef3ff] lg:px-5" href={`${SOLICITUDES_HREF}/${request.id}`}>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${activity.tone}`}>{activity.badge}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-bold text-slate-950">{request.title}</span>
                            <span className="block truncate text-[12.5px] text-slate-500">
                              {request.category} · {formatWhen(request.createdAt)}
                            </span>
                          </span>
                          <span className="hidden shrink-0 items-center gap-1 text-[13px] font-semibold text-[#1847ff] sm:inline-flex">
                            {activity.action}
                            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Shelf>

            <Shelf title="Repetir un pedido" tourId="home-repeat">
              {repeatable.length === 0 ? (
                <p className="px-4 py-5 text-[14px] text-slate-600 lg:px-5">Cuando hagas tu primera solicitud, la vas a poder repetir en un clic.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {repeatable.map((request) => {
                    const items = request.items ?? [];
                    const detail =
                      items.length > 1
                        ? `${items.length} productos`
                        : items[0]?.quantity
                          ? `${items[0].quantity.toLocaleString('es-AR')} ${items[0].unit ?? 'unidades'}`
                          : request.category;
                    return (
                      <li key={request.id} className="flex items-center gap-3 px-4 py-2.5 lg:px-5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold text-slate-950">{request.title}</span>
                          <span className="block truncate text-[12.5px] text-slate-500">
                            {detail} · {formatWhen(request.createdAt)}
                          </span>
                        </span>
                        <Link
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-[12.5px] font-semibold text-slate-800 transition hover:border-[#1847ff] hover:text-[#1238d6]"
                          href={`${NUEVA_HREF}?repetir=${request.id}`}
                        >
                          <ShortcutGlyph name="repeat" />
                          Repetir
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Shelf>
          </div>
        ) : null}
      </div>
    </div>
  );
}
