import { AR_PLACES } from '@/lib/ar-places';
import { PROVINCE_SHAPES } from '@/lib/ar-provinces';
import { ARGENTINA, inside, type Point } from './latam-map';

/**
 * Mapa de puntos de Argentina (con las Islas Malvinas) para el directorio de
 * proveedores: cada ciudad con empresas es un marcador que filtra el listado.
 */

const WEST = -75;
const NORTH = -20.5;
const SCALE = 14;
// Margen a la derecha para que entren los nombres de las ciudades del este.
const LABEL_SPACE = 130;
const WIDTH = (-52 - WEST) * SCALE + LABEL_SPACE;
const HEIGHT = (NORTH + 56.5) * SCALE;
const STEP = 0.78;

function project([lon, lat]: Point): Point {
  return [(lon - WEST) * SCALE, (NORTH - lat) * SCALE];
}

const DOTS: Point[] = (() => {
  const dots: Point[] = [];
  let row = 0;
  for (let lat = NORTH - 0.5; lat > -56; lat -= STEP * 0.87) {
    const offset = row % 2 === 0 ? 0 : STEP / 2;
    for (let lon = WEST + 0.5 + offset; lon < -52; lon += STEP) {
      if (inside([lon, lat], ARGENTINA)) {
        dots.push(project([lon, lat]));
      }
    }
    row += 1;
  }
  const [mx, my] = [-59.6, -51.75];
  for (const [dx, dy] of [[-0.8, 0], [0, 0], [0.8, 0], [-0.4, -0.68], [0.4, 0.68]]) {
    dots.push(project([mx + dx, my + dy]));
  }
  return dots;
})();

// Ubicación de las ciudades: ver lib/ar-places.
const CITIES = AR_PLACES;

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Vista de una provincia: su contorno en puntos, encuadrado como un zoom.
 * Devuelve los puntos, el viewBox y cuánto se achicó la escala (para que
 * marcadores y textos mantengan su tamaño en pantalla).
 */
function provinceView(name: string) {
  const rings = PROVINCE_SHAPES[name];
  if (!rings?.length) return null;
  const all = rings.flat();
  const lons = all.map(([lon]) => lon);
  const lats = all.map(([, lat]) => lat);
  const [minLon, maxLon, minLat, maxLat] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const span = Math.max(maxLon - minLon, maxLat - minLat);
  // Unas 26 filas de puntos a lo largo de la provincia, sea grande o chica.
  const step = span / 26;
  const dots: Point[] = [];
  let row = 0;
  for (let lat = maxLat - step / 2; lat > minLat; lat -= step * 0.87) {
    const offset = row % 2 === 0 ? 0 : step / 2;
    for (let lon = minLon + step / 2 + offset; lon < maxLon; lon += step) {
      if (rings.some((ring) => inside([lon, lat], ring))) dots.push(project([lon, lat]));
    }
    row += 1;
  }
  const zoom = step / STEP;
  const pad = span * 0.08;
  const [x0, y0] = project([minLon - pad, maxLat + pad]);
  const [x1, y1] = project([maxLon + pad, minLat - pad]);
  // Lugar a la derecha para los nombres de las localidades.
  const labels = LABEL_SPACE * zoom;
  return { dots, zoom, viewBox: `${x0} ${y0} ${x1 - x0 + labels} ${y1 - y0}` };
}

export default function ArgentinaMap({
  cities,
  onSelect,
  selected,
  province,
  className = '',
}: {
  /** `point`: coordenadas de la localidad si no está en la tabla de ciudades conocidas. */
  cities: { name: string; count: number; point?: { lat: number; lon: number } | null }[];
  onSelect: (city: string) => void;
  /** Ciudad activa en el filtro, para resaltar su marcador. */
  selected?: string;
  /** Provincia elegida: el mapa muestra solo esa provincia, como un zoom. */
  province?: string | null;
  className?: string;
}) {
  const [malvinasX, malvinasY] = project([-58.6, -51.75]);
  const view = province ? provinceView(province) : null;
  const k = view?.zoom ?? 1;
  return (
    <svg
      aria-label={view ? `Mapa de proveedores en ${province}` : 'Mapa de proveedores en Argentina'}
      className={className}
      role="img"
      viewBox={view?.viewBox ?? `0 0 ${WIDTH} ${HEIGHT}`}
    >
      <g key={province ?? 'pais'} className="animate-fade-up">
        {(view?.dots ?? DOTS).map(([x, y]) => (
          <circle key={`${x.toFixed(2)}-${y.toFixed(2)}`} cx={x} cy={y} fill="#a9bdf3" r={3.4 * k} />
        ))}
        {view ? null : (
          <text fill="#5b6b93" fontSize="11" fontWeight="600" letterSpacing="1" x={malvinasX + 6} y={malvinasY + 4}>
            ISLAS MALVINAS
          </text>
        )}
      </g>

      {cities.map((city, index) => {
        const at: Point | undefined = CITIES[normalize(city.name)] ?? (city.point ? [city.point.lon, city.point.lat] : undefined);
        if (!at) {
          return null;
        }
        const [x, y] = project(at);
        const active = selected === city.name;
        return (
          <g
            key={city.name}
            className="cursor-pointer"
            onClick={() => onSelect(city.name)}
            onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ' ? onSelect(city.name) : undefined)}
            role="button"
            tabIndex={0}
          >
            <title>{`${city.name} (${city.count})`}</title>
            <circle className="animate-map-pulse" cx={x} cy={y} fill="#1f5bff" r={11 * k} style={{ animationDelay: `${(index * 400) % 2400}ms` }} />
            <circle cx={x} cy={y} fill={active ? '#0b1530' : '#1f5bff'} r={8 * k} stroke="#fff" strokeWidth={2.5 * k} />
            <text fill="#0b1530" fontSize={13 * k} fontWeight="700" letterSpacing={0.6 * k} x={x + 14 * k} y={y + 4.5 * k}>
              {city.name.toUpperCase()}
              <tspan fill="#5b6b93" fontWeight="500">{` · ${city.count}`}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
