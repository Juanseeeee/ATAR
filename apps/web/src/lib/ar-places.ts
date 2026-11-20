/**
 * Localidades de Argentina con coordenadas, para buscar proveedores cercanos.
 *
 * Las sugerencias y las coordenadas de cualquier localidad salen de Georef, la
 * API pública de localidades del Estado argentino (apis.datos.gob.ar, sin clave
 * y con CORS abierto). Las ciudades más habituales están acá para no depender
 * de la red; lo que se consulta queda en memoria mientras dura la visita.
 */

// Ubicación (longitud, latitud) de las ciudades y provincias más habituales.
// Una ciudad que no esté acá aparece en la lista pero no en el mapa.
export const AR_PLACES: Record<string, [number, number]> = {
  'buenos aires': [-58.4, -34.6],
  caba: [-58.4, -34.6],
  'la plata': [-57.95, -34.92],
  rosario: [-60.65, -32.95],
  'santa fe': [-60.7, -31.63],
  cordoba: [-64.18, -31.42],
  mendoza: [-68.83, -32.89],
  'san juan': [-68.52, -31.54],
  'san luis': [-66.34, -33.3],
  tucuman: [-65.22, -26.82],
  'san miguel de tucuman': [-65.22, -26.82],
  salta: [-65.41, -24.79],
  jujuy: [-65.3, -24.19],
  resistencia: [-58.99, -27.45],
  chaco: [-58.99, -27.45],
  corrientes: [-58.83, -27.47],
  posadas: [-55.9, -27.37],
  misiones: [-55.9, -27.37],
  parana: [-60.52, -31.73],
  'entre rios': [-59.2, -32],
  colon: [-58.14, -32.22],
  neuquen: [-68.06, -38.95],
  'bahia blanca': [-62.27, -38.72],
  'mar del plata': [-57.55, -38],
  'la pampa': [-64.29, -36.62],
  'santa rosa': [-64.29, -36.62],
  bariloche: [-71.3, -41.13],
  'rio negro': [-67.5, -40],
  chubut: [-67.5, -43.5],
  'comodoro rivadavia': [-67.5, -45.86],
  'rio gallegos': [-69.22, -51.62],
  'santa cruz': [-69.5, -49],
  ushuaia: [-68.3, -54.8],
  'tierra del fuego': [-68, -54],
};

export type Place = { name: string; province: string; lat: number; lon: number };

const GEOREF = 'https://apis.datos.gob.ar/georef/api/localidades';

export function normalizePlace(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

type GeorefResponse = {
  localidades?: { nombre: string; provincia?: { nombre?: string }; centroide?: { lat: number; lon: number } }[];
};

const searchCache = new Map<string, Promise<Place[]>>();

/** Localidades cuyo nombre coincide con lo escrito ("rafa" → Rafaela, Santa Fe). */
export function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const key = normalizePlace(query);
  if (key.length < 2) return Promise.resolve([]);
  const cached = searchCache.get(key);
  if (cached) return cached;
  const url = `${GEOREF}?nombre=${encodeURIComponent(query.trim())}&max=8&campos=nombre,provincia.nombre,centroide`;
  const request = fetch(url, { signal })
    .then((response) => (response.ok ? (response.json() as Promise<GeorefResponse>) : { localidades: [] }))
    .then((data) => {
      const seen = new Set<string>();
      const places: Place[] = [];
      for (const item of data.localidades ?? []) {
        if (!item.centroide) continue;
        const province = item.provincia?.nombre ?? '';
        const id = `${normalizePlace(item.nombre)}|${normalizePlace(province)}`;
        if (seen.has(id)) continue;
        seen.add(id);
        places.push({ name: titleCase(item.nombre), province: shortProvince(province), lat: item.centroide.lat, lon: item.centroide.lon });
      }
      return places;
    })
    .catch((error) => {
      searchCache.delete(key);
      throw error;
    });
  searchCache.set(key, request);
  return request;
}

/** Provincia de las ciudades de la tabla, para no consultar la red. */
const PROVINCE_OF: Record<string, string> = {
  'buenos aires': 'CABA',
  caba: 'CABA',
  'la plata': 'Buenos Aires',
  rosario: 'Santa Fe',
  'santa fe': 'Santa Fe',
  cordoba: 'Córdoba',
  mendoza: 'Mendoza',
  'san juan': 'San Juan',
  'san luis': 'San Luis',
  tucuman: 'Tucumán',
  'san miguel de tucuman': 'Tucumán',
  salta: 'Salta',
  jujuy: 'Jujuy',
  resistencia: 'Chaco',
  corrientes: 'Corrientes',
  posadas: 'Misiones',
  parana: 'Entre Ríos',
  colon: 'Entre Ríos',
  neuquen: 'Neuquén',
  'bahia blanca': 'Buenos Aires',
  'mar del plata': 'Buenos Aires',
  'santa rosa': 'La Pampa',
  bariloche: 'Río Negro',
  'comodoro rivadavia': 'Chubut',
  'rio gallegos': 'Santa Cruz',
  ushuaia: 'Tierra del Fuego',
};

export type Located = { lat: number; lon: number; province: string | null };

const pointCache = new Map<string, Promise<Located | null>>();

/** Coordenadas y provincia de una ciudad (primero la tabla local, después Georef). */
export function locatePlace(name: string): Promise<Located | null> {
  const key = normalizePlace(name);
  const known = AR_PLACES[key];
  if (known && PROVINCE_OF[key]) return Promise.resolve({ lon: known[0], lat: known[1], province: PROVINCE_OF[key] });
  const cached = pointCache.get(key);
  if (cached) return cached;
  const request = searchPlaces(name)
    .then((places) => {
      // Entre las del mismo nombre, la que es capital de su provincia ("Córdoba, Córdoba").
      const sameName = places.filter((place) => normalizePlace(place.name) === key);
      const match = sameName.find((place) => normalizePlace(place.province) === key) ?? sameName[0] ?? places[0];
      if (match) return { lat: match.lat, lon: match.lon, province: match.province || null };
      return known ? { lon: known[0], lat: known[1], province: null } : null;
    })
    .catch(() => (known ? { lon: known[0], lat: known[1], province: null } : null));
  pointCache.set(key, request);
  return request;
}

/** Distancia en km entre dos puntos (fórmula del haversine). */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Georef devuelve nombres en mayúsculas ("RAFAELA"): se muestran como "Rafaela". */
function titleCase(value: string) {
  if (value !== value.toUpperCase()) return value;
  const lower = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el']);
  return value
    .toLowerCase()
    .split(' ')
    .map((word, index) => (index > 0 && lower.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

function shortProvince(value: string) {
  if (/^tierra del fuego/i.test(value)) return 'Tierra del Fuego';
  if (/^ciudad aut[oó]noma/i.test(value)) return 'CABA';
  return value;
}
