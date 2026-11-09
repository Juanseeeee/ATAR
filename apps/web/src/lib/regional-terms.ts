/**
 * Nombres regionales de categorías e ítems.
 *
 * El catálogo guarda un nombre canónico (el que viene del API, p. ej. "Big Bags").
 * Cada país puede tener su propio nombre para lo mismo: en México un Big Bag es un
 * "Maxisaco", en Argentina un "Bolsón". Acá solo se cambia lo que se MUESTRA; los
 * valores que se guardan y se envían al API siguen siendo los canónicos.
 */

export type CountryCode =
  | 'AR'
  | 'BO'
  | 'CA'
  | 'CL'
  | 'CO'
  | 'DO'
  | 'EC'
  | 'MX'
  | 'PE'
  | 'PY'
  | 'UY'
  | 'VE';

/** "Otro país": se usan los nombres canónicos. */
export type RegionChoice = CountryCode | 'XX';

/** Países de Centroamérica: comparten nombres, así que se eligen como una sola región. */
export const CENTRAL_AMERICA_FLAGS = ['gt', 'sv', 'hn', 'ni', 'cr', 'pa'];

export const COUNTRIES: { code: CountryCode; name: string; detail?: string }[] = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'CA', name: 'Centroamérica', detail: 'Guatemala, El Salvador, Honduras, Nicaragua, Costa Rica y Panamá' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'MX', name: 'México' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'DO', name: 'Rep. Dominicana' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
];

/** Banderas de la región: una para cada país, seis para Centroamérica. */
export function flagSources(code: CountryCode): string[] {
  const codes = code === 'CA' ? CENTRAL_AMERICA_FLAGS : [code.toLowerCase()];
  return codes.map((item) => `/flags/${item}.png`);
}

export function countryName(choice: RegionChoice | null) {
  return COUNTRIES.find((item) => item.code === choice)?.name ?? 'Otro país';
}

/* Grupos según cómo se nombra cada producto en la región. Paraguay y Bolivia
   siguen al Río de la Plata; Venezuela a Colombia; Rep. Dominicana a
   Centroamérica, que comparte nombres con México en casi todo. */
const RIO_DE_LA_PLATA: CountryCode[] = ['AR', 'UY', 'PY', 'BO'];
const CENTROAMERICA: CountryCode[] = ['CA', 'DO'];

type ByCountry = { default: string } & Partial<Record<CountryCode, string>>;

function group(codes: CountryCode[], value: string): Partial<Record<CountryCode, string>> {
  return Object.fromEntries(codes.map((code) => [code, value]));
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Nombre de cada categoría del catálogo por país, indexado por el nombre
 * canónico normalizado. Lo que no figura se muestra con el nombre canónico.
 */
const CATEGORY_NAMES: Record<string, ByCountry> = {
  'big bags': {
    default: 'Big Bags',
    MX: 'Maxisacos',
    CL: 'Maxisacos',
    ...group(RIO_DE_LA_PLATA, 'Bolsones'),
    ...group(CENTROAMERICA, 'Súper sacos'),
  },
  sacos: {
    default: 'Sacos',
    MX: 'Costales',
    ...group(CENTROAMERICA, 'Costales'),
    CO: 'Bultos',
  },
  'bolsas pp': {
    default: 'Bolsas PP',
    ...group(RIO_DE_LA_PLATA, 'Bolsas de rafia'),
    CL: 'Bolsas de rafia',
  },
  'rollos y telas': {
    default: 'Rollos y Telas',
    MX: 'Tela de rafia',
    ...group(CENTROAMERICA, 'Tela de rafia'),
    ...group(['CO', 'PE', 'EC', 'VE'], 'Tela de polipropileno'),
    ...group(RIO_DE_LA_PLATA, 'Tela de rafia'),
    CL: 'Tela de rafia',
  },
  'hilo retorcido y mallas': {
    default: 'Hilo retorcido y Mallas',
    MX: 'Hilo retorcido y Arpillas',
    ...group(CENTROAMERICA, 'Hilo retorcido y Arpillas'),
  },
  'hilo multifilamento de pp': {
    default: 'Hilo multifilamento de PP',
    MX: 'Hilo para costura',
    ...group(CENTROAMERICA, 'Hilo para costura'),
    ...group(['CO', 'VE'], 'Hilaza de polipropileno'),
    ...group(RIO_DE_LA_PLATA, 'Hilo de coser industrial'),
    ...group(['CL', 'PE'], 'Hilo industrial'),
  },
  'cintas/cintillas': {
    default: 'Cintas/Cintillas',
    MX: 'Cinta de rafia',
    ...group(CENTROAMERICA, 'Cinta de rafia'),
  },
  tintas: {
    default: 'Tintas',
    MX: 'Tintas para flexografía',
    ...group(CENTROAMERICA, 'Tintas para flexografía'),
    ...group(['CO', 'EC', 'VE'], 'Tintas flexográficas'),
    ...group(['AR', 'CL', 'PE', 'UY', 'PY', 'BO'], 'Tintas para flexografía'),
  },
};

/**
 * Otros nombres con los que se busca cada categoría (en cualquier país). Se usan
 * para que "maxisaco" o "costal" encuentren la categoría correcta en el buscador.
 */
const CATEGORY_ALIASES: Record<string, string[]> = {
  'big bags': ['big bag', 'fibc', 'maxisaco', 'super saco', 'bolson', 'saco industrial', 'saco jumbo', 'tula industrial', 'saco gigante', 'jumbo'],
  sacos: ['costal', 'bulto', 'saco de rafia'],
  'bolsas pp': ['bolsa de rafia', 'bolsa de polipropileno', 'costal'],
  'rollos y telas': ['tela de rafia', 'tela de polipropileno', 'tejido de polipropileno', 'lona de polipropileno', 'arpilla', 'tela tubular'],
  'hilo retorcido y mallas': ['arpilla', 'malla'],
  'hilo multifilamento de pp': ['hilo de rafia', 'hilo para costura', 'hilaza', 'hilo de polipropileno', 'hilo de coser', 'hilado', 'hilo industrial', 'fibras'],
  'cintas/cintillas': ['cinta de rafia'],
  'cuerdas/cordones': ['rafia', 'cordel'],
  tintas: ['tinta para flexografia', 'tinta flexografica', 'tinta para costal', 'tinta para plastico', 'tinta para polipropileno'],
};

export function localizeCategory(label: string, choice: RegionChoice | null): string {
  const entry = CATEGORY_NAMES[normalize(label)];
  if (!entry || !choice || choice === 'XX') {
    return entry?.default ?? label;
  }
  return entry[choice] ?? entry.default;
}

/** Todos los nombres conocidos de una categoría, para sumar a la búsqueda. */
export function categorySearchTerms(label: string): string[] {
  const key = normalize(label);
  const entry = CATEGORY_NAMES[key];
  const names = entry ? Object.values(entry) : [];
  return Array.from(new Set([...names, ...(CATEGORY_ALIASES[key] ?? [])]));
}

/* ======================= Tarjetas del inicio público ======================= */

export type HomeCardKey = 'telas' | 'sacos' | 'maquinaria' | 'bigbags' | 'insumos';

type CardText = { title: string; text: string };

const HOME_CARDS: Record<HomeCardKey, { default: CardText } & Partial<Record<CountryCode, CardText>>> = {
  telas: {
    default: { title: 'Telas', text: 'Rafia y tejidos industriales' },
    MX: { title: 'Tela de rafia', text: 'Tela de rafia, arpilla y tejidos industriales' },
    ...groupCard(CENTROAMERICA, { title: 'Tela de rafia', text: 'Tela de rafia, arpilla y tejidos industriales' }),
    ...groupCard(['CO', 'PE', 'EC', 'VE'], { title: 'Tela de polipropileno', text: 'Tejido de polipropileno plano y tubular' }),
    ...groupCard([...RIO_DE_LA_PLATA, 'CL'], { title: 'Tela de rafia', text: 'Lona de polipropileno y tela tubular' }),
  },
  sacos: {
    default: { title: 'Sacos / Bolsas PP', text: 'Sacos, bolsas y envases de polipropileno' },
    MX: { title: 'Costales', text: 'Costales y bolsas de rafia de 25 a 50 kg' },
    ...groupCard(CENTROAMERICA, { title: 'Costales', text: 'Costales y bolsas de rafia de 25 a 50 kg' }),
    CO: { title: 'Bultos / Bolsas PP', text: 'Bultos y bolsas de polipropileno' },
    ...groupCard([...RIO_DE_LA_PLATA, 'CL'], { title: 'Sacos / Bolsas de rafia', text: 'Sacos y bolsas de rafia de 25 a 50 kg' }),
  },
  bigbags: {
    default: { title: 'BigBags', text: 'Bolsones, jumbo y supersacos' },
    MX: { title: 'Maxisacos', text: 'Súper sacos y big bags de 500 a 2000 kg' },
    ...groupCard(['AR', 'UY', 'PY', 'BO'], { title: 'Bolsones', text: 'Bolsones big bag y sacos industriales' }),
    CO: { title: 'Big Bags', text: 'Sacos jumbo y tulas industriales' },
    ...groupCard(['PE', 'EC'], { title: 'Big Bags', text: 'Maxisacos y sacos gigantes' }),
    CL: { title: 'Maxisacos', text: 'Maxisacos y big bags de 500 a 2000 kg' },
    ...groupCard(CENTROAMERICA, { title: 'Súper sacos', text: 'Súper sacos y sacos jumbo' }),
  },
  insumos: {
    default: { title: 'Insumos', text: 'Polímeros, tintas, hilos, cintas y aditivos' },
    ...groupCard(['CO', 'VE'], { title: 'Insumos', text: 'Polímeros, tintas, hilaza, cintas y aditivos' }),
  },
  maquinaria: {
    default: { title: 'Maquinaria', text: 'Equipos y soluciones para tu planta' },
  },
};

function groupCard(codes: CountryCode[], value: CardText): Partial<Record<CountryCode, CardText>> {
  return Object.fromEntries(codes.map((code) => [code, value]));
}

export function homeCardText(key: HomeCardKey, choice: RegionChoice | null): CardText {
  const entry = HOME_CARDS[key];
  if (!choice || choice === 'XX') {
    return entry.default;
  }
  return entry[choice] ?? entry.default;
}

/** Sugerencia inicial a partir del idioma del navegador (es-MX → MX, es-GT → CA). */
export function guessCountry(languages: readonly string[]): CountryCode | null {
  for (const language of languages) {
    const region = language.split('-')[1]?.toLowerCase();
    if (!region) {
      continue;
    }
    if (CENTRAL_AMERICA_FLAGS.includes(region)) {
      return 'CA';
    }
    const match = COUNTRIES.find((item) => item.code.toLowerCase() === region);
    if (match) {
      return match.code;
    }
  }
  return null;
}

/** Ejemplos para la vista previa de la pantalla de países. */
export const PREVIEW_TERMS: { concept: string; label: string }[] = [
  { concept: 'Big bag (FIBC)', label: 'Big Bags' },
  { concept: 'Saco de 25 a 50 kg', label: 'Sacos' },
  { concept: 'Tela tejida de PP', label: 'Rollos y Telas' },
  { concept: 'Hilo de costura', label: 'Hilo multifilamento de PP' },
  { concept: 'Tintas de impresión', label: 'Tintas' },
];
