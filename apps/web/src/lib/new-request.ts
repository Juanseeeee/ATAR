import type { RequestCatalogCategoryRecord, RequestCatalogFieldRecord, RequestRecord } from '@/lib/atar-api';
import { getDefaultUnit } from '@/lib/request-units';

/**
 * Datos y utilidades del flujo "Solicitar cotización": el borrador simple que
 * se guarda en el navegador y los lectores que convierten texto libre (lo que
 * se le cuenta a ATARIA) o una planilla en una lista de productos.
 */

export type StartMode = 'catalogo' | 'ataria' | 'planilla' | 'medida';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type ProductLine = {
  id: string;
  name: string;
  /** Rubro del catálogo, si el producto salió de ahí (o se reconoció). */
  category: string;
  quantity: string;
  unit: string;
  /** Comentarios libres para el proveedor. */
  details: string;
  /** Especificaciones del rubro, por nombre del campo ("Material" → "PP"). */
  specs: Record<string, string>;
};

export type DeliveryWhen = 'asap' | '15' | '30' | 'date';

export type NewRequestDraft = {
  /** Paso del asistente en el que quedó (para retomar). */
  step: WizardStep;
  products: ProductLine[];
  address: string;
  city: string;
  when: DeliveryWhen;
  date: string;
  contactName: string;
  phone: string;
  notes: string;
  supplierIds: string[];
  /** Además de los elegidos, la ven todos los proveedores del rubro. */
  openToAll: boolean;
};

const DRAFT_KEY = 'atar:buyer:new-request:v2';

export function emptyDraft(): NewRequestDraft {
  return {
    step: 1,
    products: [],
    address: '',
    city: '',
    when: 'asap',
    date: '',
    contactName: '',
    phone: '',
    notes: '',
    supplierIds: [],
    openToAll: false,
  };
}

export function loadDraft(): NewRequestDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NewRequestDraft>;
    const products = Array.isArray(parsed.products) ? parsed.products.map((line) => ({ ...line, specs: line.specs ?? {} })) : [];
    return { ...emptyDraft(), ...parsed, products };
  } catch {
    return null;
  }
}

export function saveDraft(draft: NewRequestDraft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Sin almacenamiento: el borrador vive solo en esta pestaña.
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nada que borrar.
  }
}

let lineCounter = 0;

export function newLine(partial: Partial<ProductLine> = {}): ProductLine {
  lineCounter += 1;
  return {
    id: `p${Date.now().toString(36)}${lineCounter}`,
    name: '',
    category: '',
    quantity: '',
    unit: getDefaultUnit(partial.category),
    details: '',
    specs: {},
    ...partial,
  };
}

export function hasBasics(line: ProductLine) {
  return line.name.trim().length > 0 && Number(line.quantity) > 0;
}

// ---------- Especificaciones por rubro ----------

export const TO_DEFINE = 'A definir';

/**
 * Campos que se completan en "Especificaciones". La cantidad tiene su propio
 * control; los adjuntos solo si el rubro los pide (el archivo editable de los
 * clisés) y "Observaciones" es el campo de comentarios que tiene todo producto.
 */
export function specFieldsFor(categories: RequestCatalogCategoryRecord[], category: string): RequestCatalogFieldRecord[] {
  const match = categories.find((item) => item.label === category);
  const fixed = fixedSpecsFor(category);
  return (match?.fields ?? []).filter(
    (field) =>
      field.type !== 'quantity' &&
      (field.type !== 'uploader' || field.required) &&
      !/^observaciones$/i.test(field.label) &&
      !Object.keys(fixed).some((label) => normalize(label) === normalize(field.label)),
  );
}

/** Un campo condicional se pregunta solo si el campo del que depende tiene uno de sus valores. */
export function isFieldVisible(field: RequestCatalogFieldRecord, specs: Record<string, string>) {
  if (!field.showWhen) return true;
  return field.showWhen.values.includes((specs[field.showWhen.label] ?? '').trim());
}

/** Los campos que corresponden a este producto según lo que ya respondió. */
export function visibleSpecFields(categories: RequestCatalogCategoryRecord[], line: ProductLine) {
  return specFieldsFor(categories, line.category).filter((field) => isFieldVisible(field, line.specs));
}

/**
 * Datos que no se preguntan porque en ese rubro son siempre iguales: las telas
 * (rollos, tubulares y planas) son solo de polipropileno. Igual se guardan en
 * la solicitud para que el proveedor los vea.
 */
export function fixedSpecsFor(category: string | null | undefined): Record<string, string> {
  return /tela/i.test(category ?? '') ? { Material: 'PP' } : {};
}

/** Opciones de un campo de elección, con "A definir" al final. */
export function fieldOptions(field: RequestCatalogFieldRecord) {
  return field.options.some((option) => option.toLowerCase() === TO_DEFINE.toLowerCase())
    ? field.options
    : [...field.options, TO_DEFINE];
}

/** Datos obligatorios que faltan (la cantidad cuenta como uno). */
export function missingCount(line: ProductLine, fields: RequestCatalogFieldRecord[]) {
  const missingFields = fields.filter((field) => field.required && !(line.specs[field.label] ?? '').trim()).length;
  return missingFields + (Number(line.quantity) > 0 ? 0 : 1) + (line.name.trim() ? 0 : 1);
}

export function isLineComplete(line: ProductLine, fields: RequestCatalogFieldRecord[] = []) {
  return missingCount(line, fields) === 0;
}

/** Resumen corto de lo elegido: "1000 kg · Cruzada · Faldon". */
export function specSummary(line: ProductLine, fields: RequestCatalogFieldRecord[]) {
  return fields
    .map((field) => (line.specs[field.label] ?? '').trim())
    .filter((value) => value && value !== TO_DEFINE && value.length <= 40)
    .join(' · ');
}

/** Texto de especificaciones que se guarda en el item ("Material: PP"). */
export function specificationText(line: ProductLine, fields: RequestCatalogFieldRecord[]) {
  const fixed = Object.entries(fixedSpecsFor(line.category)).map(([label, value]) => `${label}: ${value}`);
  const lines = fields
    .map((field) => [field.label, (line.specs[field.label] ?? '').trim()] as const)
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);
  lines.unshift(...fixed);
  if (line.details.trim()) lines.push(`Comentarios: ${line.details.trim()}`);
  return lines.join('\n');
}

/** Lo inverso: reparte un texto guardado entre los campos y los comentarios. */
function specsFromText(text: string, fields: RequestCatalogFieldRecord[], fixed: Record<string, string> = {}) {
  const specs: Record<string, string> = {};
  const rest: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const separator = row.indexOf(':');
    const label = separator > 0 ? row.slice(0, separator).trim() : '';
    const value = separator > 0 ? row.slice(separator + 1).trim() : '';
    const field = fields.find((item) => normalize(item.label) === normalize(label));
    if (Object.keys(fixed).some((key) => normalize(key) === normalize(label))) continue;
    if (field && value) specs[field.label] = value;
    else if (/^(comentarios|observaciones)$/i.test(label)) rest.push(value);
    else rest.push(row);
  }
  return { specs, details: rest.join('\n') };
}

const CATEGORY_ICONS: Record<string, string> = {
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
  'a medida': '/amedida.png',
};

/** Ícono del rubro (los mismos del inicio). */
export function categoryIconFor(category: string | null | undefined) {
  return CATEGORY_ICONS[(category ?? '').toLowerCase()] ?? '/categorias/ico-bolsas.png';
}

export function deliveryWhenLabel(draft: Pick<NewRequestDraft, 'when' | 'date'>) {
  if (draft.when === '15') return 'En 15 días';
  if (draft.when === '30') return 'En 30 días';
  if (draft.when === 'date' && draft.date) {
    const date = new Date(`${draft.date}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? draft.date
      : `Para el ${new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' }).format(date)}`;
  }
  return 'Lo antes posible';
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'para', 'con', 'en', 'a']);

/** Palabras sin acentos, en singular aproximado ("tubulares" → "tubular"). */
function stems(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map((word) => (word.length > 4 ? word.replace(/(es|s)$/, '') : word));
}

/**
 * Rubro del catálogo que mejor coincide con un texto ("bolsas de rafia" →
 * "Bolsas PP"). Pesa más que coincidan las palabras del nombre del rubro que
 * sus palabras clave, que se repiten entre rubros ("bolsas", "polipropileno").
 */
export function matchCategory(text: string, categories: RequestCatalogCategoryRecord[]) {
  const haystack = ` ${normalize(text)} `;
  const words = new Set(stems(text));
  let best: { label: string; score: number } | null = null;
  for (const category of categories) {
    if (category.label === 'A medida') continue;
    const labelHits = stems(category.label).filter((word) => words.has(word)).length;
    const keywordScore = (category.searchKeywords ?? [])
      .map(normalize)
      .filter((term) => term.length > 2 && haystack.includes(term))
      .reduce((total, term) => total + term.length, 0);
    const score = labelHits * 20 + keywordScore;
    if (score > 0 && (!best || score > best.score)) best = { label: category.label, score };
  }
  return best?.label ?? '';
}

const UNIT_ALIASES: Array<[RegExp, string]> = [
  [/^(unidades|unidad|u|un|uds?)$/, 'unidades'],
  [/^(kg|kgs|kilos?|kilogramos?)$/, 'kg'],
  [/^(tn|t|toneladas?)$/, 'toneladas'],
  [/^(metros lineales|ml)$/, 'metros lineales'],
  [/^(m|mts?|metros?)$/, 'metros'],
  [/^(m2|m²|metros cuadrados)$/, 'm²'],
  [/^(rollos?)$/, 'rollos'],
  [/^(bobinas?)$/, 'bobinas'],
  [/^(litros?|lts?)$/, 'litros'],
  [/^(millar|millares)$/, 'millar'],
  [/^(conos?)$/, 'conos'],
  [/^(tambor|tambores)$/, 'tambores'],
];

function canonicalUnit(raw: string | undefined) {
  if (!raw) return null;
  const value = normalize(raw.trim());
  return UNIT_ALIASES.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

function parseNumber(raw: string, thousands?: string) {
  const clean = raw.replace(/[.\s]/g, '').replace(',', '.');
  const value = Number(clean);
  if (!Number.isFinite(value)) return null;
  return Math.round(thousands ? value * 1000 : value);
}

function capitalize(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

const UNIT_PATTERN =
  'metros lineales|metros cuadrados|unidades|unidad|uds?|un|u|kgs?|kilos?|kilogramos?|toneladas?|tn|t|ml|m2|m²|mts?|metros?|m|rollos?|bobinas?|litros?|lts?|millar(?:es)?|conos?|tambor(?:es)?';

/**
 * Convierte un pedido escrito en lenguaje natural en productos:
 * "1000 big bags de 1 tonelada y 5.000 bolsas pp, 2000 metros de tela tubular"
 */
export function parseFreeText(text: string, categories: RequestCatalogCategoryRecord[]): ProductLine[] {
  const segments = text
    .split(/\n|;|,(?!\d)|\s+y\s+(?=\d)|\s+\+\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const lines: ProductLine[] = [];
  for (const segment of segments) {
    const cleaned = segment.replace(/^(necesito|quiero|quisiera|cotizar|cotizame|pedir|precio de|presupuesto de)\s+/i, '');
    const match = cleaned.match(
      new RegExp(`(\\d{1,3}(?:[.\\s]\\d{3})+|\\d+(?:,\\d+)?)\\s*(mil)?\\s*(?:(${UNIT_PATTERN})\\b\\.?)?\\s*(?:de\\s+)?`, 'i'),
    );
    let quantity = '';
    let unit: string | null = null;
    let name = cleaned;
    if (match && match.index !== undefined) {
      const value = parseNumber(match[1], match[2]);
      if (value) quantity = String(value);
      unit = canonicalUnit(match[3]);
      name = `${cleaned.slice(0, match.index)} ${cleaned.slice(match.index + match[0].length)}`;
    }
    name = name.replace(/^\s*(de|x|por)\s+/i, '').replace(/\s+(x|por)\s*$/i, '');
    if (!name.trim()) continue;
    const category = matchCategory(name, categories);
    lines.push(newLine({ name: capitalize(name), category, quantity, unit: unit ?? getDefaultUnit(category) }));
  }
  return lines;
}

/**
 * Lee filas copiadas de Excel (separadas por tabulación) o un CSV con
 * columnas: producto, cantidad, unidad (opcional), detalle (opcional).
 */
export function parseSheet(text: string, categories: RequestCatalogCategoryRecord[]): ProductLine[] {
  const rows = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (rows.length === 0) return [];
  const delimiter = rows[0].includes('\t') ? '\t' : rows[0].split(';').length > rows[0].split(',').length ? ';' : ',';

  const lines: ProductLine[] = [];
  for (const row of rows) {
    const cells = row.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));
    const [rawName = '', rawQuantity = '', rawUnit = '', ...rest] = cells;
    const quantity = parseNumber(rawQuantity);
    // Encabezado ("Producto | Cantidad") o fila sin cantidad numérica.
    if (!rawName || quantity === null) continue;
    const category = matchCategory(rawName, categories);
    lines.push(
      newLine({
        name: capitalize(rawName),
        category,
        quantity: String(quantity),
        unit: canonicalUnit(rawUnit) ?? (rawUnit ? rawUnit.toLowerCase() : getDefaultUnit(category)),
        details: rest.filter(Boolean).join(' · '),
      }),
    );
  }
  return lines;
}

/** Arma el borrador a partir de una solicitud existente (repetir o editar). */
export function draftFromRequest(request: RequestRecord, categories: RequestCatalogCategoryRecord[]): NewRequestDraft {
  const items = request.items ?? [];
  const products =
    items.length > 0
      ? items.map((item) => {
          const category = item.category ?? '';
          const { specs, details } = specsFromText(item.specifications ?? '', specFieldsFor(categories, category), fixedSpecsFor(category));
          return newLine({
            name: item.productName,
            category,
            quantity: item.quantity ? String(item.quantity) : '',
            unit: item.unit ?? getDefaultUnit(category),
            details,
            specs,
          });
        })
      : [
          newLine({
            name: request.title,
            category: request.category ?? '',
            quantity: request.quantityRequested ? String(request.quantityRequested) : '',
          }),
        ];
  return {
    ...emptyDraft(),
    step: 2,
    products,
    address: request.deliveryAddress ?? '',
    city: request.deliveryCity ?? '',
    contactName: request.deliveryContactName ?? '',
    phone: request.deliveryPhone ?? '',
    notes: request.deliveryNotes ?? '',
    openToAll: !request.privateRequest,
  };
}

/** Guarda la lista armada en ATARIA, planilla o a medida y sigue en el asistente. */
export function startDraftWith(products: ProductLine[], contactName = '') {
  saveDraft({ ...emptyDraft(), contactName, products, step: 2 });
}
