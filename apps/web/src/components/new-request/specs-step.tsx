'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import type { RequestCatalogFieldRecord } from '@/lib/atar-api';
import { TO_DEFINE, categoryIconFor, type ProductLine } from '@/lib/new-request';
import { getCategoryUnits } from '@/lib/request-units';

/**
 * "Especificaciones" como paso a paso: una pregunta por vez, con las opciones
 * estándar del rubro como tarjetas, "Otra…" para escribir un valor propio y
 * "No sé" para que lo defina el proveedor.
 */

type Question =
  | { kind: 'name' }
  | { kind: 'quantity' }
  | { kind: 'field'; field: RequestCatalogFieldRecord }
  | { kind: 'comments' };

const CUSTOM = 'A medida';

function questionsFor(line: ProductLine, fields: RequestCatalogFieldRecord[]): Question[] {
  const list: Question[] = [];
  if (!line.category || line.category === CUSTOM) list.push({ kind: 'name' });
  list.push({ kind: 'quantity' });
  for (const field of fields) list.push({ kind: 'field', field });
  list.push({ kind: 'comments' });
  return list;
}

function fieldValue(line: ProductLine, field: RequestCatalogFieldRecord) {
  return (line.specs[field.label] ?? '').trim();
}

function isAnswered(line: ProductLine, question: Question) {
  if (question.kind === 'name') return line.name.trim().length > 0;
  if (question.kind === 'quantity') return Number(line.quantity) > 0;
  if (question.kind === 'comments') return line.details.trim().length > 0;
  return fieldValue(line, question.field).length > 0;
}

function isRequired(question: Question) {
  if (question.kind === 'name' || question.kind === 'quantity') return true;
  if (question.kind === 'comments') return false;
  return question.field.required;
}

/** Título en forma de pregunta: "Material" → "¿De qué material?". */
function questionTitle(question: Question, line: ProductLine) {
  if (question.kind === 'name') return '¿Cómo se llama el producto?';
  if (question.kind === 'quantity') return `¿Cuánto necesitás de ${line.name || 'este producto'}?`;
  if (question.kind === 'comments') return '¿Algo más que deba saber el proveedor?';
  const label = question.field.label.trim();
  const lower = label.toLowerCase();
  const known: Record<string, string> = {
    material: '¿De qué material?',
    'material deseado': '¿De qué material lo querés?',
    capacidad: '¿Qué capacidad necesitás?',
    medidas: '¿Qué medidas tiene?',
    color: '¿De qué color?',
    impresion: '¿Lleva impresión?',
    impresión: '¿Lleva impresión?',
    gramaje: '¿Qué gramaje?',
    laminado: '¿Va laminado?',
    liner: '¿Lleva liner?',
    fuelle: '¿Lleva fuelle?',
    microperforado: '¿Va microperforado?',
    'tratamiento uv': '¿Necesita tratamiento UV?',
    ancho: '¿Qué ancho?',
    'ancho tubular': '¿Qué ancho tubular?',
    largo: '¿Qué largo?',
    espesor: '¿Qué espesor?',
    presentacion: '¿En qué presentación?',
    presentación: '¿En qué presentación?',
    'uso del producto': '¿Para qué se va a usar?',
    'fecha objetivo': '¿Para qué fecha lo necesitás?',
    'descripcion del producto': 'Contanos cómo es el producto',
    condicion: '¿Nuevo o usado?',
    condición: '¿Nuevo o usado?',
    medida: '¿Qué medida?',
    'medida útil (ancho x alto)': '¿Qué medida útil? (ancho x alto)',
    'medida útil (ancho x largo x alto)': '¿Qué medida útil? (ancho x largo x alto)',
    formato: '¿Plana o tubular?',
    'tipo de laminado': '¿Qué laminado?',
    'tipo de rejilla': '¿Qué tipo de rejilla?',
    'parte superior': '¿Cómo es la parte superior?',
    fondo: '¿Cómo es el fondo?',
    'caras impresas': '¿Qué caras van impresas?',
    denier: '¿Qué denier?',
    tenacidad: '¿Qué tenacidad?',
    producto: '¿Qué producto?',
    tipo: '¿Qué necesitás?',
    'archivo editable': 'Cargá el archivo editable',
  };
  if (known[lower]) return known[lower];
  if (lower.startsWith('tipo de ')) return `¿Qué ${lower}?`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Icon({ name, className = 'h-4 w-4' }: { name: 'check' | 'edit' | 'chev-left' | 'chev-right' | 'arrow' | 'help' | 'upload'; className?: string }) {
  const paths: Record<string, ReactNode> = {
    upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    edit: <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
    'chev-left': <path d="m15 6-6 6 6 6" />,
    'chev-right': <path d="m9 6 6 6-6 6" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

const textField =
  'h-12 w-full rounded-xl border border-[var(--field-border)] bg-white px-4 text-[16px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10';

function OptionTile({ label, selected, onClick, children }: { label: string; selected: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <button
      aria-pressed={selected}
      className={`relative flex min-h-[56px] items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[15px] font-semibold transition ${
        selected ? 'border-[#1f5bff] bg-[#f3f6ff] text-[#1238d6]' : 'border-slate-200 bg-white text-slate-800 hover:border-[#9db4ff] hover:bg-[#fafbff]'
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-[#1f5bff] bg-[#1f5bff] text-white' : 'border-slate-300 bg-white text-transparent'
        }`}
      >
        <Icon className="h-3 w-3" name="check" />
      </span>
      <span className="min-w-0 flex-1">{children ?? label}</span>
    </button>
  );
}

export default function SpecsStep({
  products,
  fieldsByLine,
  missingByLine,
  activeId,
  showErrors,
  onSelectProduct,
  onUpdateLine,
  onSetSpec,
  onAllDone,
  onAddProduct,
}: {
  products: ProductLine[];
  fieldsByLine: Record<string, RequestCatalogFieldRecord[]>;
  missingByLine: Record<string, number>;
  activeId: string | null;
  showErrors: boolean;
  onSelectProduct: (id: string) => void;
  onUpdateLine: (id: string, patch: Partial<ProductLine>) => void;
  onSetSpec: (id: string, label: string, value: string) => void;
  onAllDone: () => void;
  onAddProduct: () => void;
}) {
  // Pregunta actual de cada producto (si no hay, la primera sin responder).
  const [questionIndex, setQuestionIndex] = useState<Record<string, number>>({});
  // Valor de "Otra…" mientras se escribe, por pregunta.
  const [customDraft, setCustomDraft] = useState<Record<string, string>>({});
  const [customOpen, setCustomOpen] = useState<Record<string, boolean>>({});

  const line = products.find((item) => item.id === activeId) ?? products[0];
  if (!line) return null;

  const fields = fieldsByLine[line.id] ?? [];
  const questions = questionsFor(line, fields);
  // Arranca en la primera obligatoria sin responder; si están todas, en el resumen.
  const firstPending = questions.findIndex((question) => isRequired(question) && !isAnswered(line, question));
  const index = Math.min(questionIndex[line.id] ?? (firstPending === -1 ? questions.length : firstPending), questions.length);
  const finished = index >= questions.length;
  const question = finished ? null : questions[index];
  const answeredCount = questions.filter((item) => isAnswered(line, item)).length;
  const lineIndex = products.findIndex((item) => item.id === line.id);
  const nextIncomplete =
    products.slice(lineIndex + 1).find((item) => missingByLine[item.id] > 0) ?? products.find((item) => item.id !== line.id && missingByLine[item.id] > 0);

  // Al editar, la pregunta queda fija: si no, al responderla saltaría sola
  // a "la primera sin responder" mientras todavía se está escribiendo.
  function pin() {
    setQuestionIndex((current) => (line.id in current ? current : { ...current, [line.id]: index }));
  }

  function updateThis(patch: Partial<ProductLine>) {
    pin();
    onUpdateLine(line.id, patch);
  }

  function setThis(label: string, value: string) {
    pin();
    onSetSpec(line.id, label, value);
  }

  function goToQuestion(next: number) {
    setQuestionIndex((current) => ({ ...current, [line.id]: Math.max(0, Math.min(next, questions.length)) }));
  }

  function answerAndAdvance(apply: () => void) {
    apply();
    goToQuestion(index + 1);
  }

  const qKey = question ? `${line.id}:${question.kind === 'field' ? question.field.label : question.kind}` : '';

  // ---------- Contenido de la pregunta ----------
  let body: ReactNode = null;
  let canContinue = true;

  if (question?.kind === 'name') {
    canContinue = line.name.trim().length > 0;
    body = (
      <input
        autoFocus
        className={textField}
        onChange={(event) => updateThis({ name: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && canContinue) goToQuestion(index + 1);
        }}
        placeholder="Ej.: Bolsa valvulada para cemento"
        value={line.name}
      />
    );
  } else if (question?.kind === 'quantity') {
    canContinue = Number(line.quantity) > 0;
    const units = Array.from(new Set([...getCategoryUnits(line.category), line.unit].filter(Boolean)));
    body = (
      <div className="space-y-4">
        <input
          autoFocus
          className={`${textField} max-w-[320px] text-[20px] font-bold`}
          inputMode="numeric"
          onChange={(event) => updateThis({ quantity: event.target.value.replace(/[^\d]/g, '') })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && canContinue) goToQuestion(index + 1);
          }}
          placeholder="Ej.: 1.000"
          value={line.quantity ? Number(line.quantity).toLocaleString('es-AR') : ''}
        />
        <div>
          <p className="mb-2 text-[13px] font-semibold text-slate-500">Unidad</p>
          <div className="flex flex-wrap gap-2">
            {units.map((unit) => (
              <button
                key={unit}
                className={`h-10 rounded-full border-2 px-4 text-[14px] font-semibold transition ${
                  line.unit === unit ? 'border-[#1f5bff] bg-[#f3f6ff] text-[#1238d6]' : 'border-slate-200 text-slate-700 hover:border-[#9db4ff]'
                }`}
                onClick={() => updateThis({ unit })}
                type="button"
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (question?.kind === 'comments') {
    body = (
      <textarea
        autoFocus
        className="min-h-[110px] w-full resize-y rounded-xl border border-[var(--field-border)] px-4 py-3 text-[15px] outline-none placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10"
        onChange={(event) => updateThis({ details: event.target.value })}
        placeholder="Opcional: uso, plano, muestra, certificaciones, cómo lo recibís…"
        value={line.details}
      />
    );
  } else if (question?.kind === 'field') {
    const field = question.field;
    const value = fieldValue(line, field);
    const standard = field.options.filter((option) => option.toLowerCase() !== TO_DEFINE.toLowerCase());
    canContinue = !field.required || value.length > 0;

    if (field.type === 'uploader') {
      const hasFile = value.length > 0 && value !== TO_DEFINE;
      body = (
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
              hasFile ? 'border-[#1f5bff] bg-[#f3f6ff]' : 'border-slate-300 bg-white hover:border-[#9db4ff] hover:bg-[#fafbff]'
            }`}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${hasFile ? 'bg-[#1f5bff] text-white' : 'bg-[#eef3ff] text-[#1238d6]'}`}>
              <Icon className="h-5 w-5" name={hasFile ? 'check' : 'upload'} />
            </span>
            <span className="text-[15px] font-semibold text-slate-900">{hasFile ? value : 'Elegí el archivo'}</span>
            <span className="text-[13px] text-slate-500">{hasFile ? 'Tocá para cambiarlo' : field.helper ?? 'Subí el archivo'}</span>
            <input
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) answerAndAdvance(() => setThis(field.label, file.name));
                event.target.value = '';
              }}
              type="file"
            />
          </label>
        </div>
      );
    } else if (field.type === 'choices' || field.type === 'segmented') {
      const isCustom = value.length > 0 && value !== TO_DEFINE && !standard.includes(value);
      const showCustom = customOpen[qKey] || isCustom;
      const typed = customDraft[qKey] ?? (isCustom ? value : '');
      body = (
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {standard.map((option) => (
              <OptionTile
                key={option}
                label={option}
                onClick={() => {
                  setCustomOpen((current) => ({ ...current, [qKey]: false }));
                  answerAndAdvance(() => setThis(field.label, option));
                }}
                selected={value === option}
              />
            ))}
            <OptionTile label="Otra" onClick={() => setCustomOpen((current) => ({ ...current, [qKey]: true }))} selected={Boolean(showCustom)}>
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-400" name="edit" />
                {isCustom ? `Otra: ${value}` : 'Otra, la escribo yo'}
              </span>
            </OptionTile>
          </div>
          {showCustom ? (
            <div className="flex flex-col gap-2 rounded-xl bg-[#f6f8fd] p-3 sm:flex-row">
              <input
                autoFocus
                className={textField}
                onChange={(event) => setCustomDraft((current) => ({ ...current, [qKey]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && typed.trim()) answerAndAdvance(() => setThis(field.label, typed.trim()));
                }}
                placeholder={`Escribí ${field.label.toLowerCase()}…`}
                value={typed}
              />
              <button
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1847ff] px-5 text-[15px] font-semibold text-white transition hover:bg-[#0f3ff5] disabled:opacity-50"
                disabled={!typed.trim()}
                onClick={() => answerAndAdvance(() => setThis(field.label, typed.trim()))}
                type="button"
              >
                Usar este valor
              </button>
            </div>
          ) : null}
        </div>
      );
    } else {
      // Texto libre (medidas, ancho…) o fecha.
      body = (
        <input
          autoFocus
          className={`${textField} max-w-[420px]`}
          onChange={(event) => setThis(field.label, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && canContinue) goToQuestion(index + 1);
          }}
          placeholder={field.placeholder ?? ''}
          type={field.inputType === 'date' ? 'date' : 'text'}
          value={value === TO_DEFINE ? '' : (line.specs[field.label] ?? '')}
        />
      );
      if (field.type === 'textarea') {
        body = (
          <textarea
            autoFocus
            className="min-h-[120px] w-full resize-y rounded-xl border border-[var(--field-border)] px-4 py-3 text-[15px] outline-none placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10"
            onChange={(event) => setThis(field.label, event.target.value)}
            placeholder={field.placeholder ?? ''}
            value={line.specs[field.label] ?? ''}
          />
        );
      }
    }
  }

  const required = question ? isRequired(question) : false;
  const answered = question ? isAnswered(line, question) : false;
  const canDefer = question?.kind === 'field';
  const deferred = question?.kind === 'field' && fieldValue(line, question.field) === TO_DEFINE;

  // ---------- Respuestas dadas (para volver a una) ----------
  const answers = questions
    .map((item, position) => ({ item, position }))
    .filter(({ item }) => isAnswered(line, item) && item.kind !== 'name')
    .map(({ item, position }) => {
      const label = item.kind === 'field' ? item.field.label : item.kind === 'quantity' ? 'Cantidad' : 'Comentarios';
      const value =
        item.kind === 'field'
          ? fieldValue(line, item.field)
          : item.kind === 'quantity'
            ? `${Number(line.quantity).toLocaleString('es-AR')} ${line.unit}`
            : line.details.trim();
      return { label, value, position };
    });

  return (
    <div className="space-y-4">
      {/* Productos de la solicitud */}
      {products.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {products.map((item) => {
            const active = item.id === line.id;
            const missing = missingByLine[item.id];
            return (
              <button
                key={item.id}
                className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-[13.5px] font-semibold transition ${
                  active
                    ? 'border-[#1f5bff] bg-white text-[#1238d6] shadow-[0_0_0_3px_rgba(31,91,255,0.12)]'
                    : showErrors && missing > 0
                      ? 'border-rose-300 bg-white text-slate-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-[#9db4ff]'
                }`}
                onClick={() => onSelectProduct(item.id)}
                type="button"
              >
                <Image alt="" className="h-7 w-7 rounded-full bg-[#f3f6fc] object-contain p-0.5" height={28} src={categoryIconFor(item.category)} width={28} />
                <span className="max-w-[160px] truncate">{item.name || 'Sin nombre'}</span>
                {missing === 0 ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Icon className="h-3 w-3" name="check" />
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-1.5 text-[11.5px] font-bold text-amber-700">{missing}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border-2 border-[#1f5bff] bg-white">
        {/* Encabezado del producto con avance */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3f6fc]">
            <Image alt="" className="h-9 w-9 object-contain" height={36} src={categoryIconFor(line.category)} width={36} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold text-slate-950">{line.name || 'Producto a medida'}</p>
            <p className="text-[12.5px] text-slate-500">
              {finished ? 'Todas las preguntas respondidas' : `Pregunta ${index + 1} de ${questions.length}`}
            </p>
          </div>
          <span className="hidden text-[13px] font-semibold text-slate-500 sm:block">
            {answeredCount}/{questions.length}
          </span>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-[#1f5bff] transition-all" style={{ width: `${(Math.min(index, questions.length) / questions.length) * 100}%` }} />
        </div>

        {question ? (
          <div className="px-5 py-6 sm:px-7">
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-[#1f5bff]">{required ? 'Obligatorio' : 'Opcional'}</p>
            <h2 className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] text-slate-950">{questionTitle(question, line)}</h2>
            {question.kind === 'field' && (question.field.type === 'choices' || question.field.type === 'segmented') ? (
              <p className="mt-1 text-[14px] text-slate-500">Elegí una de las opciones estándar o escribí la tuya.</p>
            ) : null}
            <div className="mt-5">{body}</div>
            {showErrors && required && !answered ? <p className="mt-3 text-[13.5px] font-medium text-rose-600">Esta respuesta es obligatoria.</p> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
              <button
                className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-[14px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                disabled={index === 0}
                onClick={() => goToQuestion(index - 1)}
                type="button"
              >
                <Icon name="chev-left" />
                Anterior
              </button>
              {canDefer ? (
                <button
                  className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[14px] font-semibold transition ${
                    deferred ? 'bg-amber-50 text-amber-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => answerAndAdvance(() => setThis((question as { field: RequestCatalogFieldRecord }).field.label, TO_DEFINE))}
                  type="button"
                >
                  <Icon name="help" />
                  {question.kind === 'field' && question.field.type === 'uploader' ? 'Lo envío más adelante' : 'No sé, a definir'}
                </button>
              ) : null}
              <div className="flex-1" />
              <button
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  answered || !required ? 'bg-[#1847ff] text-white hover:bg-[#0f3ff5]' : 'bg-slate-200 text-slate-500'
                }`}
                disabled={!canContinue}
                onClick={() => goToQuestion(index + 1)}
                type="button"
              >
                {!answered && !required ? 'Saltar' : 'Siguiente'}
                <Icon name="chev-right" />
              </button>
            </div>
          </div>
        ) : (
          // Producto terminado
          <div className="px-5 py-7 text-center sm:px-7">
            <span
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                missingByLine[line.id] === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <Icon className="h-6 w-6" name={missingByLine[line.id] === 0 ? 'check' : 'help'} />
            </span>
            <h2 className="mt-3 text-[20px] font-extrabold text-slate-950">
              {missingByLine[line.id] === 0 ? `${line.name} está listo` : `A ${line.name} le faltan ${missingByLine[line.id]} datos`}
            </h2>
            <p className="mt-1 text-[14px] text-slate-500">
              {missingByLine[line.id] === 0 ? 'Podés cambiar cualquier respuesta tocándola abajo.' : 'Volvé a las preguntas marcadas como obligatorias.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {missingByLine[line.id] > 0 ? (
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1847ff] px-5 text-[15px] font-semibold text-white hover:bg-[#0f3ff5]"
                  onClick={() => goToQuestion(questions.findIndex((item) => isRequired(item) && !isAnswered(line, item)))}
                  type="button"
                >
                  Completar lo que falta
                </button>
              ) : nextIncomplete ? (
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1847ff] px-5 text-[15px] font-semibold text-white hover:bg-[#0f3ff5]"
                  onClick={() => onSelectProduct(nextIncomplete.id)}
                  type="button"
                >
                  Seguir con {nextIncomplete.name || 'el siguiente'}
                  <Icon name="arrow" />
                </button>
              ) : (
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1847ff] px-5 text-[15px] font-semibold text-white hover:bg-[#0f3ff5]"
                  onClick={onAllDone}
                  type="button"
                >
                  Todo listo, continuar a entrega
                  <Icon name="arrow" />
                </button>
              )}
              <button
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-[15px] font-semibold text-slate-700 hover:bg-slate-50"
                onClick={onAddProduct}
                type="button"
              >
                Agregar otro producto
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Lo que ya eligió */}
      {answers.length > 0 ? (
        <div className="rounded-2xl border border-slate-300 bg-white px-5 py-4">
          <p className="text-[13px] font-bold text-slate-700">Lo que elegiste para {line.name || 'este producto'}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {answers.map((answer) => (
              <button
                key={answer.label}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition hover:border-[#1f5bff] ${
                  answer.position === index ? 'border-[#1f5bff] bg-[#f3f6ff]' : 'border-slate-200 bg-slate-50'
                }`}
                onClick={() => goToQuestion(answer.position)}
                title="Cambiar"
                type="button"
              >
                <span className="text-slate-500">{answer.label}:</span>
                <span className={`truncate font-semibold ${answer.value === TO_DEFINE ? 'text-amber-700' : 'text-slate-900'}`}>{answer.value}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
