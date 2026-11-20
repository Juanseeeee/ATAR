'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useRegion } from '@/components/region/region-provider';
import { atarApi, type RequestCatalogCategoryRecord } from '@/lib/atar-api';
import {
  categoryIconFor,
  newLine,
  parseFreeText,
  parseSheet,
  startDraftWith,
  type ProductLine,
} from '@/lib/new-request';
import { ATARIA_PENDING_KEY } from '@/components/marketing/public-ataria-chat';
import { FALLBACK_REQUEST_CATEGORIES } from '@/lib/request-catalog-fallback';
import { getCategoryUnits } from '@/lib/request-units';
import { StartIcon } from './start-screen';

/**
 * Formas de empezar que no son el catálogo: cada una arma la lista de
 * productos a su manera y después sigue en el asistente, directo en
 * "Especificaciones".
 */

const BASE = '/dashboard/comprador/solicitudes/nueva';

const primaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1847ff] px-5 text-[14.5px] font-semibold text-white transition hover:bg-[#0f3ff5] disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[14.5px] font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const fieldClass =
  'h-11 w-full rounded-xl border border-[var(--field-border)] bg-white px-3.5 text-[14.5px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10';

function useCategories() {
  const [categories, setCategories] = useState<RequestCatalogCategoryRecord[]>(FALLBACK_REQUEST_CATEGORIES);
  useEffect(() => {
    let cancelled = false;
    atarApi
      .getRequestCategories()
      .then((list) => {
        if (!cancelled && list.length > 0) setCategories(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return categories;
}

function useContinue() {
  const router = useRouter();
  const { session } = useAuth();
  return (lines: ProductLine[]) => {
    const contactName = [session?.user.firstName, session?.user.lastName].filter(Boolean).join(' ');
    startDraftWith(lines, contactName);
    router.push(`${BASE}?modo=seguir`);
  };
}

function FlowHeader({ crumb, title, text }: { crumb: string; title: string; text: string }) {
  return (
    <>
      <nav className="flex items-center gap-2 text-[14px]">
        <Link className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900" href={BASE}>
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m15 6-6 6 6 6" />
          </svg>
          Nueva solicitud
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">{crumb}</span>
      </nav>
      <h1 className="mt-4 text-[26px] font-extrabold tracking-[-0.03em] text-slate-950 lg:text-[28px]">{title}</h1>
      <p className="mt-1 text-[14.5px] text-slate-600">{text}</p>
    </>
  );
}

function AtariaAvatar() {
  return <Image alt="ATARIA" className="h-10 w-10 shrink-0 object-contain" height={40} src="/botatar.png?v=2" unoptimized width={40} />;
}

function Bubble({ from, children }: { from: 'ataria' | 'me'; children: ReactNode }) {
  if (from === 'me') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-md bg-[#1847ff] px-4 py-2.5 text-[14.5px] leading-relaxed text-white">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5">
      <AtariaAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-[#f1f4ff] px-4 py-2.5 text-[14.5px] leading-relaxed text-slate-800">{children}</div>
    </div>
  );
}

function ProductPreview({ lines }: { lines: ProductLine[] }) {
  const { categoryName } = useRegion();
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {lines.map((line) => (
        <li key={line.id} className="flex items-center gap-3 px-3.5 py-2.5">
          <Image alt="" className="h-9 w-9 shrink-0 object-contain" height={36} src={categoryIconFor(line.category)} width={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-slate-900">{line.name}</span>
            <span className="block truncate text-[12px] text-slate-500">{line.category ? categoryName(line.category) : 'Sin rubro: lo describís en el paso siguiente'}</span>
          </span>
          <span className={`shrink-0 text-[13.5px] font-semibold ${Number(line.quantity) > 0 ? 'text-slate-700' : 'text-amber-600'}`}>
            {Number(line.quantity) > 0 ? `${Number(line.quantity).toLocaleString('es-AR')} ${line.unit}` : 'Falta la cantidad'}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// ATARIA: se escribe el pedido y ATARIA arma la lista.
// ---------------------------------------------------------------------------

export function AtariaFlow() {
  const categories = useCategories();
  const goOn = useContinue();
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [lines, setLines] = useState<ProductLine[] | null>(null);

  // Si antes de registrarse le contó a ATARIA qué necesitaba (en la web
  // pública), ese texto queda cargado para enviarlo.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const pending = window.localStorage.getItem(ATARIA_PENDING_KEY);
        if (pending) {
          setText(pending);
          window.localStorage.removeItem(ATARIA_PENDING_KEY);
        }
      } catch {
        // Sin almacenamiento: no hay nada que retomar.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function send() {
    const message = text.trim();
    if (!message) return;
    setSent(message);
    setLines(parseFreeText(message, categories));
    setText('');
  }

  const missing = lines?.filter((line) => !(Number(line.quantity) > 0)).length ?? 0;

  return (
    <div className="mx-auto w-full max-w-[820px] pb-10 pt-2">
      <FlowHeader crumb="Contárselo a ATARIA" text="Escribí lo que necesitás como se lo dirías a un vendedor. Yo armo la lista." title="Contale a ATARIA qué necesitás" />
      <div className="mt-5 rounded-2xl border border-slate-300 bg-white">
        <div className="space-y-4 p-5">
          <Bubble from="ataria">
            ¡Hola! Contame qué querés cotizar: productos y cantidades. Por ejemplo:
            <i className="mt-1 block text-slate-600">“1000 big bags de 1 tonelada, 5000 bolsas de rafia y 2000 metros de tela tubular”</i>
          </Bubble>
          {sent ? <Bubble from="me">{sent}</Bubble> : null}
          {lines ? (
            lines.length === 0 ? (
              <Bubble from="ataria">No llegué a reconocer productos. ¿Me lo escribís con la cantidad adelante? Por ejemplo: “500 kg de hilo de PP”.</Bubble>
            ) : (
              <div className="flex items-start gap-2.5">
                <AtariaAvatar />
                <div className="min-w-0 flex-1 space-y-3 rounded-2xl rounded-tl-md bg-[#f1f4ff] p-3.5 text-[14.5px] text-slate-800">
                  <p>
                    Entendí {lines.length} producto{lines.length === 1 ? '' : 's'}.
                    {missing > 0 ? ` A ${missing === 1 ? 'uno le falta' : `${missing} les falta`} la cantidad: la completás en el paso siguiente.` : ' ¿Está bien así?'}
                  </p>
                  <ProductPreview lines={lines} />
                  <div className="flex flex-wrap gap-2">
                    <button className={primaryButton} onClick={() => goOn(lines)} type="button">
                      Sí, sigamos con los detalles
                    </button>
                    <button
                      className={secondaryButton}
                      onClick={() => {
                        setText(sent ?? '');
                        setLines(null);
                        setSent(null);
                      }}
                      type="button"
                    >
                      Corregir el pedido
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>
        {!lines || lines.length === 0 ? (
          <div className="border-t border-slate-200 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-[var(--field-border)] p-2 focus-within:border-[#1f5bff] focus-within:ring-4 focus-within:ring-[#1f5bff]/10">
              <textarea
                autoFocus
                className="min-h-[52px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14.5px] outline-none placeholder:text-slate-400"
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="Escribí tu pedido…"
                value={text}
              />
              <button aria-label="Enviar" className={`${primaryButton} w-11 px-0`} disabled={!text.trim()} onClick={send} type="button">
                <StartIcon className="h-5 w-5" name="arrow" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planilla: filas pegadas de Excel o un CSV.
// ---------------------------------------------------------------------------

export function SheetFlow() {
  const categories = useCategories();
  const goOn = useContinue();
  const [text, setText] = useState('');
  const [lines, setLines] = useState<ProductLine[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function importText(value: string) {
    const parsed = parseSheet(value, categories);
    if (parsed.length === 0) {
      setMessage('No encontramos filas con producto y cantidad. La primera columna tiene que ser el producto y la segunda, la cantidad.');
      return;
    }
    setMessage(null);
    setLines(parsed);
  }

  async function importFile(file: File) {
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      setMessage('Por ahora leemos archivos CSV. Desde Excel: Archivo → Guardar como → CSV. O copiá las filas y pegalas acá.');
      return;
    }
    importText(await file.text());
  }

  return (
    <div className="mx-auto w-full max-w-[820px] pb-10 pt-2">
      <FlowHeader crumb="Subir una planilla" text="Ideal si ya tenés la lista armada. Después completás los detalles de cada producto." title="Cargá tu planilla" />
      {lines ? (
        <div className="mt-5 rounded-2xl border border-slate-300 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-slate-950">
              Encontramos {lines.length} producto{lines.length === 1 ? '' : 's'}
            </h2>
            <button className="text-[13.5px] font-semibold text-[#1238d6] hover:underline" onClick={() => setLines(null)} type="button">
              Usar otra planilla
            </button>
          </div>
          <div className="mt-3">
            <ProductPreview lines={lines} />
          </div>
          <div className="mt-4 flex justify-end">
            <button className={primaryButton} onClick={() => goOn(lines)} type="button">
              Continuar con {lines.length} producto{lines.length === 1 ? '' : 's'}
              <StartIcon className="h-4 w-4" name="arrow" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-300 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <textarea
              className="min-h-[200px] w-full resize-none rounded-2xl border border-[var(--field-border)] px-4 py-3 font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-[14px] placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10"
              onChange={(event) => setText(event.target.value)}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData('text');
                if (pasted.includes('\t')) {
                  event.preventDefault();
                  importText(pasted);
                }
              }}
              placeholder="Pegá acá las filas copiadas de Excel o Google Sheets"
              value={text}
            />
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-[#1f5bff] hover:bg-[#f7f9ff]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <StartIcon name="sheet" />
              </span>
              <span className="text-[14px] font-semibold text-slate-800">Subir archivo CSV</span>
              <span className="text-[12.5px] text-slate-500">o guardá tu Excel como CSV</span>
              <input
                accept=".csv,.tsv,.txt,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importFile(file);
                  event.target.value = '';
                }}
                type="file"
              />
            </label>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[13px] font-semibold text-slate-700">Así tiene que estar armada</p>
            <table className="mt-2 w-full max-w-[520px] text-left text-[12.5px]">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-1 font-semibold">Producto</th>
                  <th className="pb-1 font-semibold">Cantidad</th>
                  <th className="pb-1 font-semibold">Unidad (opcional)</th>
                  <th className="pb-1 font-semibold">Detalle (opcional)</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr>
                  <td>Big bags 1000 kg</td>
                  <td>1000</td>
                  <td>unidades</td>
                  <td>asa cruzada</td>
                </tr>
                <tr>
                  <td>Tela tubular</td>
                  <td>2000</td>
                  <td>metros</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          {message ? <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">{message}</p> : null}
          <div className="mt-4 flex justify-end">
            <button className={primaryButton} disabled={!text.trim()} onClick={() => importText(text)} type="button">
              Leer la planilla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Producto a medida: nombre, descripción y cantidad.
// ---------------------------------------------------------------------------

export function CustomFlow() {
  const goOn = useContinue();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('unidades');
  const [showErrors, setShowErrors] = useState(false);

  const ok = name.trim() && description.trim() && Number(quantity) > 0;

  function submit() {
    if (!ok) {
      setShowErrors(true);
      return;
    }
    goOn([
      newLine({
        name: name.trim(),
        category: 'A medida',
        quantity,
        unit,
        specs: { 'Descripcion del producto': description.trim() },
      }),
    ]);
  }

  return (
    <div className="mx-auto w-full max-w-[820px] pb-10 pt-2">
      <FlowHeader crumb="Producto a medida" text="Para lo que no está en el catálogo o necesita un desarrollo especial." title="Contanos qué necesitás" />
      <div className="mt-5 rounded-2xl border border-slate-300 bg-white p-5">
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">¿Cómo se llama el producto?</span>
            <input autoFocus className={fieldClass} onChange={(event) => setName(event.target.value)} placeholder="Ej.: Bolsa valvulada para cemento" value={name} />
            {showErrors && !name.trim() ? <span className="mt-1 block text-[12.5px] font-medium text-rose-600">Poné un nombre.</span> : null}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">Describilo</span>
            <textarea
              className="min-h-[120px] w-full resize-y rounded-xl border border-[var(--field-border)] px-3.5 py-3 text-[14.5px] outline-none placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Medidas, material, color, para qué lo usás, si tenés una muestra…"
              value={description}
            />
            {showErrors && !description.trim() ? <span className="mt-1 block text-[12.5px] font-medium text-rose-600">Contanos cómo es.</span> : null}
          </label>
          <div className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">¿Cuánto necesitás?</span>
            <div className="flex max-w-[360px] gap-2">
              <input
                aria-label="Cantidad"
                className={fieldClass}
                inputMode="numeric"
                onChange={(event) => setQuantity(event.target.value.replace(/[^\d]/g, ''))}
                placeholder="Cantidad"
                value={quantity}
              />
              <select aria-label="Unidad" className={`${fieldClass} w-[150px] shrink-0`} onChange={(event) => setUnit(event.target.value)} value={unit}>
                {getCategoryUnits('A medida').map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            {showErrors && !(Number(quantity) > 0) ? <span className="mt-1 block text-[12.5px] font-medium text-rose-600">Indicá la cantidad.</span> : null}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-[12.5px] text-slate-500">En el paso siguiente podés sumar más datos y otros productos.</p>
          <button className={primaryButton} onClick={submit} type="button">
            Continuar
            <StartIcon className="h-4 w-4" name="arrow" />
          </button>
        </div>
      </div>
    </div>
  );
}
