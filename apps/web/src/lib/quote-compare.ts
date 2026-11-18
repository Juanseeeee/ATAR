import type { QuoteRecord, RequestItemRecord, RequestRecord } from '@/lib/atar-api';
import { FALLBACK_REQUEST_CATEGORIES } from '@/lib/request-catalog-fallback';
import { supplierLogoUrl } from '@/lib/supplier-logos';

/**
 * Lógica compartida entre el detalle de una solicitud y el comparador de
 * propuestas: formato de montos, mejores ofertas, cobertura de productos y
 * datos derivados (llegada estimada, diferencia de precio).
 */

export function formatMoney(value: number | null | undefined, currency = 'ARS') {
  if (typeof value !== 'number') {
    return 'A consultar';
  }
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

/** Monto abreviado para rangos: "$13,9 M". */
export function formatMoneyShort(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 0 })} mil`;
  }
  return formatMoney(value);
}

export function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Logo de la empresa proveedora (si tiene) a partir de su nombre. */
export function supplierLogoFor(name: string | undefined | null) {
  return name ? supplierLogoUrl({ slug: slugify(name) }) : null;
}

export function supplierInitials(name: string | undefined | null) {
  const words = (name ?? 'Proveedor')
    .replace(/\b(SA|SRL|SAS|S\.A\.|S\.R\.L\.)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter((word) => word && !/^(de|del|la|las|los|el|y|e)$/i.test(word));
  return ((words[0]?.[0] ?? 'P') + (words[1]?.[0] ?? '')).toUpperCase();
}

/** Imagen de la categoría de la solicitud (o el logo de ATAR si no hay). */
export function requestImageFor(request: Pick<RequestRecord, 'category' | 'items'>) {
  const labels = [request.items?.[0]?.category, request.category].filter(Boolean);
  for (const label of labels) {
    const match = FALLBACK_REQUEST_CATEGORIES.find((category) => category.label === label);
    if (match?.imageSrc) return match.imageSrc;
  }
  return '/logoatar.png';
}

/** Cotizaciones que siguen en juego (las rechazadas quedan afuera). */
export function comparableQuotesOf(quotes: QuoteRecord[]) {
  return quotes
    .filter((quote) => quote.status !== 'REJECTED' && quote.status !== 'DRAFT' && quote.status !== 'WITHDRAWN')
    .sort((a, b) => (a.amount ?? Number.MAX_SAFE_INTEGER) - (b.amount ?? Number.MAX_SAFE_INTEGER));
}

/**
 * Mejor precio. Con varios productos, una propuesta que no cotiza todo sale
 * "más barata" sin serlo: si hay propuestas completas, solo compiten esas.
 */
export function bestPriceOf(quotes: QuoteRecord[], items: RequestItemRecord[] = []) {
  const priced = quotes.filter((q) => typeof q.amount === 'number');
  const complete = items.length > 1 ? priced.filter((q) => coverageOf(q, items).kind !== 'partial') : priced;
  const pool = complete.length > 0 ? complete : priced;
  return pool.slice().sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0))[0] ?? null;
}

export function fastestOf(quotes: QuoteRecord[]) {
  const timed = quotes.filter((q) => typeof q.leadTimeDays === 'number');
  if (timed.length < 2) return null;
  const sorted = timed.sort((a, b) => (a.leadTimeDays ?? 0) - (b.leadTimeDays ?? 0));
  // Si empatan en el más rápido, no destacamos a ninguno.
  return sorted[0].leadTimeDays === sorted[1].leadTimeDays ? null : sorted[0];
}

/** Cantidad total pedida (suma de los productos o el campo legacy). */
export function requestedQuantity(request: Pick<RequestRecord, 'items' | 'quantityRequested'>) {
  const items = request.items ?? [];
  if (items.length === 1 && items[0].quantity) {
    return { value: items[0].quantity, unit: items[0].unit ?? 'unidades' };
  }
  if (items.length > 1) {
    return { value: items.length, unit: items.length === 1 ? 'producto' : 'productos' };
  }
  return request.quantityRequested ? { value: request.quantityRequested, unit: 'unidades' } : null;
}

/** Precio por unidad: el de la línea si es un solo producto, o total / cantidad. */
export function unitPriceOf(quote: QuoteRecord, items: RequestItemRecord[]) {
  if (items.length !== 1) return null;
  const line = quote.items?.find((l) => l.requestItemId === items[0].id);
  if (line?.unitPrice != null) return line.unitPrice;
  if (quote.amount != null && items[0].quantity) return quote.amount / items[0].quantity;
  return null;
}

export type Coverage =
  | { kind: 'full' }
  | { kind: 'alternative'; notes: string[] }
  | { kind: 'partial'; covered: number; total: number; notes: string[] }
  | { kind: 'unknown' };

/** Si la propuesta cubre lo que se pidió, ofrece alternativas o le falta algo. */
export function coverageOf(quote: QuoteRecord, items: RequestItemRecord[]): Coverage {
  if (items.length === 0 || !quote.items || quote.items.length === 0) return { kind: 'unknown' };
  const lines = items.map((item) => quote.items?.find((l) => l.requestItemId === item.id) ?? null);
  const notes = lines.filter((l) => l && l.availability !== 'QUOTED' && l.note).map((l) => l!.note as string);
  const covered = lines.filter((l) => l && l.availability !== 'UNAVAILABLE' && l.unitPrice != null).length;
  if (covered < items.length) return { kind: 'partial', covered, total: items.length, notes };
  if (lines.some((l) => l?.availability === 'ALTERNATIVE')) return { kind: 'alternative', notes };
  return { kind: 'full' };
}

/** Fecha de llegada si la compra se asigna hoy. */
export function estimatedArrival(leadTimeDays: number | null) {
  if (typeof leadTimeDays !== 'number') return null;
  const date = new Date();
  date.setDate(date.getDate() + leadTimeDays);
  return date;
}

/** Proveedores a los que se envió la solicitud (por nombre, sin duplicados). */
export function invitedSupplierNames(request: Pick<RequestRecord, 'preferredSupplierName'>, quotes: QuoteRecord[]) {
  const names = new Map<string, string>();
  for (const raw of (request.preferredSupplierName ?? '').split('|')) {
    const name = raw.trim();
    if (name) names.set(name.toLowerCase(), name);
  }
  for (const quote of quotes) {
    const name = quote.supplierCompany?.name;
    if (name) names.set(name.toLowerCase(), name);
  }
  return Array.from(names.values());
}
