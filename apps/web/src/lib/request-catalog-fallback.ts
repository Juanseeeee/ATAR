import type {
  RequestCatalogCategoryRecord,
  RequestCatalogFieldRecord,
  RequestCatalogFieldType,
} from './atar-api';
import { isCategoryHidden } from './hidden-categories';

// Catálogo de respaldo del wizard de solicitudes. Espeja el seed del backend
// (apps/api/prisma/seed.js) para que el paso 1 y el paso 2 funcionen aunque
// el endpoint /catalog/request-categories devuelva vacío o falle.

type FieldInput = {
  key: string;
  label: string;
  type: RequestCatalogFieldType;
  options?: string[];
  placeholder?: string;
  helper?: string;
  required?: boolean;
  fullWidth?: boolean;
  inputType?: 'text' | 'date';
  showWhen?: { label: string; values: string[] };
};

type CategoryInput = {
  label: string;
  subtitle: string;
  imageSrc: string;
  imageClassName: string;
  searchKeywords: string[];
  fields: FieldInput[];
};

function toField(categoryId: string, input: FieldInput): RequestCatalogFieldRecord {
  return {
    id: `${categoryId}-${input.key}`,
    label: input.label,
    type: input.type,
    options: input.options ?? [],
    placeholder: input.placeholder ?? null,
    helper: input.helper ?? null,
    required: input.required ?? false,
    fullWidth: input.fullWidth ?? false,
    inputType: input.inputType ?? null,
    showWhen: input.showWhen ?? null,
  };
}

function toCategory(input: CategoryInput): RequestCatalogCategoryRecord {
  const id = input.label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return {
    id,
    label: input.label,
    subtitle: input.subtitle,
    imageSrc: input.imageSrc,
    imageClassName: input.imageClassName,
    searchKeywords: input.searchKeywords,
    fields: input.fields.map((field) => toField(id, field)),
  };
}

/* Piezas que comparten varios rubros ------------------------------------- */

const TIPO_TELA = 'Tipo de tela';
const LAMINADA = 'Laminada / Coteada';
const REJILLA = 'Rejilla';
const IMPRESA = 'Impresa';

/** Tipo de tela y, según cuál, la variante (laminado o rejilla). */
function tipoTelaFields(options: string[] = ['Convencional', LAMINADA, 'Ventilada', REJILLA]): FieldInput[] {
  const fields: FieldInput[] = [{ key: 'tipo-tela', label: TIPO_TELA, type: 'choices', options, required: true }];
  if (options.includes(LAMINADA)) {
    fields.push({ key: 'tipo-laminado', label: 'Tipo de laminado', type: 'segmented', options: ['Común', 'BOPP', 'Polipapel'], required: true, showWhen: { label: TIPO_TELA, values: [LAMINADA] } });
  }
  if (options.includes(REJILLA)) {
    fields.push({ key: 'tipo-rejilla', label: 'Tipo de rejilla', type: 'segmented', options: ['Monofilamento', 'Rafia', 'Mono / Rafia'], required: true, showWhen: { label: TIPO_TELA, values: [REJILLA] } });
  }
  return fields;
}

const GRAMAJE: FieldInput = { key: 'gramaje', label: 'Gramaje', type: 'choices', options: ['60 g/m²', '70 g/m²', '80 g/m²', '90 g/m²', '100 g/m²', '120 g/m²'], required: true };
const CANTIDAD: FieldInput = { key: 'cantidad', label: 'Cantidad', type: 'quantity', required: true };

function observaciones(placeholder: string): FieldInput {
  return { key: 'observaciones', label: 'Observaciones', type: 'textarea', placeholder, fullWidth: true };
}

/** Telas: medida, tipo de tela (con su variante) y gramaje. Son siempre de PP. */
function telaFields(medidaPlaceholder: string, withFormat = false): FieldInput[] {
  return [
    ...(withFormat ? [{ key: 'formato', label: 'Formato', type: 'segmented', options: ['Plana', 'Tubular'], required: true } as FieldInput] : []),
    { key: 'medida', label: 'Medida', type: 'input', placeholder: medidaPlaceholder, required: true },
    ...tipoTelaFields(),
    GRAMAJE,
    CANTIDAD,
    observaciones('Indicá aplicación, color, tratamiento UV o terminaciones.'),
  ];
}

const CATALOG: CategoryInput[] = [
  {
    label: 'Big Bags',
    subtitle: 'FIBC 500 - 2000 kg',
    imageSrc: '/bigbags.png',
    imageClassName: 'scale-[1.1]',
    searchKeywords: ['big bag', 'bolsas', 'fibc', 'polipropileno'],
    fields: [
      { key: 'medida-util', label: 'Medida útil (ancho x largo x alto)', type: 'input', placeholder: 'Ej: 90 x 90 x 110 cm', required: true },
      { key: 'parte-superior', label: 'Parte superior', type: 'choices', options: ['Boca abierta', 'Faldón de carga', 'Pico de carga', 'Tapa'], required: true },
      { key: 'fondo', label: 'Fondo', type: 'choices', options: ['Fondo plano', 'Pico de descarga', 'Descarga total'], required: true },
      ...tipoTelaFields(['Convencional', LAMINADA, 'Ventilada']),
      { key: 'impresion', label: 'Impresión', type: 'segmented', options: ['Sin impresión', IMPRESA], required: true },
      CANTIDAD,
      observaciones('Indicá capacidad, tipo de asa, liner o cualquier detalle clave.'),
    ],
  },
  {
    label: 'Bolsas PP',
    subtitle: 'Tejidas y laminadas',
    imageSrc: '/bolsaspp.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['costales', 'bolsas', 'sacos', 'packaging', 'polipropileno'],
    fields: [
      { key: 'medida-util', label: 'Medida útil (ancho x alto)', type: 'input', placeholder: 'Ej: 50 x 80 cm', required: true },
      ...tipoTelaFields(),
      { key: 'impresion', label: 'Impresión', type: 'segmented', options: ['Sin impresión', IMPRESA], required: true },
      { key: 'caras-impresas', label: 'Caras impresas', type: 'segmented', options: ['Solo frente', 'Frente y dorso'], required: true, showWhen: { label: 'Impresión', values: [IMPRESA] } },
      CANTIDAD,
      observaciones('Indicá capacidad, tipo de cierre, colores de impresión o uso.'),
    ],
  },
  {
    label: 'Polipropileno',
    subtitle: 'Tejidos, rafia y laminados',
    imageSrc: '/polimero.png',
    imageClassName: 'scale-[1.25]',
    searchKeywords: ['polipropileno', 'plasticos', 'rafia', 'polimeros'],
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'choices', options: ['Homopolimero', 'Copolimero', 'Rafia', 'Fibra'], required: true },
      { key: 'presentacion', label: 'Presentacion', type: 'segmented', options: ['Pellets', 'Rollo', 'Tejido', 'Bobina'], required: true },
      { key: 'color', label: 'Color', type: 'segmented', options: ['Natural', 'Blanco', 'Negro', 'Personalizado'] },
      { key: 'indice-fluidez', label: 'Indice de fluidez', type: 'input', placeholder: 'Ej: 3.5 g/10 min' },
      { key: 'cantidad', label: 'Cantidad', type: 'quantity', required: true },
      { key: 'frecuencia', label: 'Frecuencia de compra', type: 'segmented', options: ['Unica', 'Mensual', 'Trimestral', 'Programada'] },
      { key: 'adjuntos', label: 'Adjuntar especificaciones', type: 'uploader', helper: 'Subí ficha técnica o requerimientos.' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea', placeholder: 'Especificá aplicaciones, normas o propiedades buscadas.', fullWidth: true },
    ],
  },
  {
    label: 'Polietileno',
    subtitle: 'Films, mangas y bobinas',
    imageSrc: '/polietileno.png',
    imageClassName: 'scale-[1.25]',
    searchKeywords: ['plasticos', 'filmes', 'envases', 'polimeros'],
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'choices', options: ['PEAD', 'PEBD', 'PEBDL', 'Reciclado'], required: true },
      { key: 'presentacion', label: 'Presentacion', type: 'segmented', options: ['Film', 'Manga', 'Bobina', 'Lamina'], required: true },
      { key: 'espesor', label: 'Espesor', type: 'input', placeholder: 'Ej: 80 micrones' },
      { key: 'ancho', label: 'Ancho', type: 'input', placeholder: 'Ej: 1200 mm' },
      { key: 'color', label: 'Color', type: 'segmented', options: ['Natural', 'Blanco', 'Negro', 'Color custom'] },
      { key: 'uso', label: 'Uso', type: 'choices', options: ['Packaging', 'Industrial', 'Agro', 'Construccion'] },
      { key: 'cantidad', label: 'Cantidad', type: 'quantity', required: true },
      { key: 'adjuntos', label: 'Adjuntar ficha tecnica', type: 'uploader', helper: 'Incluí tolerancias o fichas de calidad.' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea', placeholder: 'Agregá requerimientos de aplicación, espesor o acabado.', fullWidth: true },
    ],
  },
  {
    label: 'Rollos y Telas',
    subtitle: 'Polipropileno y otros',
    imageSrc: '/telasweb.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['filmes', 'packaging', 'plasticos', 'telas', 'mallas'],
    fields: telaFields('Ej: 160 cm de ancho', true),
  },
  {
    label: 'Sacos',
    subtitle: 'De papel, rafia y mas',
    imageSrc: '/sacos.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['bolsas', 'packaging', 'industriales', 'sacos'],
    fields: [
      { key: 'material', label: 'Material', type: 'choices', options: ['Papel', 'Rafia', 'Mixto', 'Laminado'], required: true },
      { key: 'capacidad', label: 'Capacidad', type: 'segmented', options: ['10 kg', '25 kg', '40 kg', '50 kg', 'Custom'], required: true },
      { key: 'medidas', label: 'Medidas', type: 'input', placeholder: 'Ej: 45 x 75 cm' },
      { key: 'costura', label: 'Costura', type: 'segmented', options: ['Simple', 'Doble', 'Termosellada'] },
      { key: 'valvula', label: 'Valvula', type: 'segmented', options: ['Sin valvula', 'Interna', 'Externa'] },
      { key: 'impresion', label: 'Impresion', type: 'choices', options: ['Sin impresion', '1 color', '2 colores', '3 colores'] },
      { key: 'paletizado', label: 'Paletizado', type: 'segmented', options: ['Sin paletizar', 'Estandar', 'Reforzado'] },
      { key: 'cantidad', label: 'Cantidad', type: 'quantity', required: true },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea', placeholder: 'Agregá detalles sobre carga, almacenamiento o despacho.', fullWidth: true },
    ],
  },
  {
    label: 'Tintas',
    subtitle: 'Flexografia e impresion industrial',
    imageSrc: '/tintasweb.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['impresiones', 'packaging', 'conversion', 'tintas', 'aditivos'],
    fields: [
      { key: 'color', label: 'Color', type: 'choices', options: ['Blanco', 'Negro', 'Azul', 'Rojo', 'Amarillo', 'Verde'], required: true },
      CANTIDAD,
      observaciones('Indicá el Pantone, el sustrato o la máquina en la que se usa.'),
    ],
  },
  {
    label: 'Fotopolímeros',
    subtitle: 'Clisés a partir de tu archivo',
    imageSrc: '/polimero.png',
    imageClassName: 'object-cover',
    searchKeywords: ['fotopolimero', 'clise', 'cliche', 'plancha', 'flexografia', 'impresion'],
    fields: [
      { key: 'archivo-editable', label: 'Archivo editable', type: 'uploader', helper: 'AI, PDF, EPS, SVG o CDR', required: true },
      CANTIDAD,
      observaciones('Indicá medidas, espesor, máquina o cualquier requerimiento de montaje.'),
    ],
  },
  {
    label: 'Cuerdas/Cordones',
    subtitle: 'Polipropileno y multifilamento',
    imageSrc: '/cuerdas.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['cuerdas', 'cordones', 'sogas', 'atado'],
    fields: [
      { key: 'material', label: 'Material', type: 'choices', options: ['Polipropileno', 'Polietileno', 'Poliester', 'Nylon'], required: true },
      { key: 'diametro', label: 'Diametro', type: 'input', placeholder: 'Ej: 6 mm', required: true },
      { key: 'resistencia', label: 'Resistencia', type: 'input', placeholder: 'Ej: 250 kg' },
      { key: 'construccion', label: 'Construccion', type: 'segmented', options: ['Torcida', 'Trenzada', 'Cableada'] },
      { key: 'color', label: 'Color', type: 'segmented', options: ['Natural', 'Blanco', 'Negro', 'Custom'] },
      { key: 'presentacion', label: 'Presentacion', type: 'segmented', options: ['Rollo', 'Madeja', 'Bobina'] },
      { key: 'cantidad', label: 'Cantidad', type: 'quantity', required: true },
      { key: 'adjuntos', label: 'Adjuntar especificaciones', type: 'uploader', helper: 'Subí ficha técnica o referencias.' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea', placeholder: 'Indicá uso, normas o requerimientos.', fullWidth: true },
    ],
  },
  {
    label: 'Cintas/Cintillas',
    subtitle: 'Flejado y aseguramiento',
    imageSrc: '/cintas.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['cintas', 'cintillas', 'flejado', 'strapping'],
    fields: [
      { key: 'producto', label: 'Producto', type: 'segmented', options: ['Cintillas', 'Cintas'], required: true },
      { key: 'ancho', label: 'Ancho', type: 'input', placeholder: 'Ej: 12 mm', required: true, showWhen: { label: 'Producto', values: ['Cintas'] } },
      { key: 'color', label: 'Color', type: 'segmented', options: ['Blanca', 'Color'], required: true, showWhen: { label: 'Producto', values: ['Cintas'] } },
      CANTIDAD,
      observaciones('Indicá uso, resistencia o terminaciones.'),
    ],
  },
  {
    label: 'Hilo multifilamento de PP',
    subtitle: 'Alta tenacidad',
    imageSrc: '/hilomulti.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['hilo', 'multifilamento', 'polipropileno', 'tejeduria'],
    fields: [
      { key: 'denier', label: 'Denier', type: 'input', placeholder: 'Ej: 1000 den', required: true },
      { key: 'tenacidad', label: 'Tenacidad', type: 'segmented', options: ['Media tenacidad (MT)', 'Alta tenacidad (AT)'], required: true },
      { key: 'color', label: 'Color', type: 'choices', options: ['Natural', 'Blanco', 'Negro'], required: true },
      CANTIDAD,
      observaciones('Indicá aplicación, presentación o requerimientos técnicos.'),
    ],
  },
  {
    label: 'Hilo retorcido y Mallas',
    subtitle: 'Arrolladora y empaque agrícola',
    imageSrc: '/hiloretor.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['hilo', 'retorcido', 'mallas', 'arrolladora', 'agro'],
    fields: [
      { key: 'producto', label: 'Producto', type: 'segmented', options: ['Hilo retorcido', 'Malla'], required: true },
      { key: 'presentacion', label: 'Presentación', type: 'segmented', options: ['Fardo', 'Megafardo'], required: true, showWhen: { label: 'Producto', values: ['Hilo retorcido'] } },
      { key: 'ancho', label: 'Ancho', type: 'input', placeholder: 'Ej: 1,23 m', required: true, showWhen: { label: 'Producto', values: ['Malla'] } },
      CANTIDAD,
      observaciones('Indicá tipo de rollo, largo o requerimientos.'),
    ],
  },
  {
    label: 'Telas Tubulares',
    subtitle: 'Para bolsas y Big Bags',
    imageSrc: '/telatubular.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['telas', 'tubulares', 'polipropileno', 'tejido'],
    fields: telaFields('Ej: 60 cm de ancho del tubo'),
  },
  {
    label: 'Telas planas',
    subtitle: 'Coberturas y multiuso',
    imageSrc: '/telaplana.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['telas', 'planas', 'polipropileno', 'coberturas'],
    fields: telaFields('Ej: 320 cm de ancho'),
  },
  {
    label: 'Maquinarias',
    subtitle: 'Equipos y líneas de producción',
    imageSrc: '/maquinariaweb.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['maquinas', 'equipos', 'extrusion', 'impresion', 'conversion'],
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'choices', options: ['Equipos', 'Líneas de producción', 'Accesorios'], required: true },
      CANTIDAD,
      observaciones('Contá qué máquina necesitás: proceso, capacidad, nueva o usada, voltaje.'),
    ],
  },
  {
    label: 'A medida',
    subtitle: 'Desarrollos especiales',
    imageSrc: '/amedida.png',
    imageClassName: 'scale-[1.05]',
    searchKeywords: ['atencion personalizada', 'integracion', 'premium', 'maquinas', 'equipos'],
    fields: [
      { key: 'descripcion-producto', label: 'Descripcion del producto', type: 'textarea', placeholder: 'Contanos qué producto necesitás desarrollar.', required: true, fullWidth: true },
      { key: 'uso-producto', label: 'Uso del producto', type: 'choices', options: ['Agro', 'Construccion', 'Logistica', 'Retail'], required: true },
      { key: 'material-deseado', label: 'Material deseado', type: 'choices', options: ['PP', 'PE', 'Papel', 'A definir'] },
      { key: 'cantidad-estimada', label: 'Cantidad estimada', type: 'quantity', required: true },
      { key: 'fecha-objetivo', label: 'Fecha objetivo', type: 'input', inputType: 'date', required: true },
      { key: 'adjuntar-planos', label: 'Adjuntar planos', type: 'uploader', helper: 'PDF, CAD o documentación técnica.' },
      { key: 'adjuntar-imagenes', label: 'Adjuntar imágenes', type: 'uploader', helper: 'Fotos, renders o referencias visuales.' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea', placeholder: 'Indicá condicionantes, normativas o hitos del proyecto.', fullWidth: true },
    ],
  },
];

export const FALLBACK_REQUEST_CATEGORIES: RequestCatalogCategoryRecord[] = CATALOG.filter(
  (category) => !isCategoryHidden(category.label),
).map(toCategory);
