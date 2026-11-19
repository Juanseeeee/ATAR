'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/auth/auth-provider';
import CompanyLogo from '@/components/dashboard/company-logo';
import { useRegion } from '@/components/region/region-provider';
import { atarApi, type SupplierDirectoryRecord } from '@/lib/atar-api';
import { parseFreeText } from '@/lib/new-request';
import { FALLBACK_REQUEST_CATEGORIES } from '@/lib/request-catalog-fallback';
import { categorySearchTerms } from '@/lib/regional-terms';
import { supplierLogoUrl } from '@/lib/supplier-logos';

/**
 * ATARIA para visitantes, sin iniciar sesión: el visitante cuenta qué necesita,
 * ATARIA reconoce los productos y le muestra qué proveedores los trabajan. Para
 * pedir la cotización formal hace falta cuenta; lo que escribió se guarda y se
 * carga solo en "Contárselo a ATARIA" del panel del comprador.
 */

/** Lo último que el visitante le contó a ATARIA, para retomarlo después de registrarse. */
export const ATARIA_PENDING_KEY = 'atar:ataria:pending';

type Found = { category: string; quantity: string; unit: string };
type Message =
  | { id: number; from: 'user'; text: string }
  | { id: number; from: 'bot'; text: string; found?: Found[]; suppliers?: SupplierDirectoryRecord[]; categoryChips?: boolean };

/** Rubros con sus nombres de cada país sumados a la búsqueda ("bolsones", "costales", "maxisacos"…). */
const CATEGORIES = FALLBACK_REQUEST_CATEGORIES.map((category) => ({
  ...category,
  searchKeywords: [...(category.searchKeywords ?? []), ...categorySearchTerms(category.label)],
}));

const EXAMPLES = ['1000 bolsones de 1 tonelada', '5000 bolsas de rafia 50x80', 'Tela tubular laminada', 'Clisés para flexografía'];

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function suppliersFor(categories: string[], suppliers: SupplierDirectoryRecord[]) {
  const wanted = new Set(categories.map(normalize));
  return suppliers
    .map((supplier) => ({
      supplier,
      hits: [...supplier.categories, ...supplier.mainProducts].filter((label) => wanted.has(normalize(label))).length,
    }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits || Number(b.supplier.isVerified) - Number(a.supplier.isVerified))
    .slice(0, 3)
    .map((item) => item.supplier);
}

function Avatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-0.5">
      <Image alt="ATARIA" className="h-full w-full object-contain" height={32} src="/botatar.png?v=2" unoptimized width={32} />
    </span>
  );
}

function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <Avatar />
      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] leading-6 text-slate-700 shadow-sm">{children}</div>
    </div>
  );
}

export default function PublicAtariaChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth();
  const { categoryName } = useRegion();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierDirectoryRecord[] | null>(null);
  const [lastRequest, setLastRequest] = useState('');
  const [requested, setRequested] = useState<string[]>([]);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Los proveedores se cargan la primera vez que se abre el chat.
  useEffect(() => {
    if (!open || suppliers) return;
    let cancelled = false;
    atarApi
      .getMarketplaceSuppliers()
      .then((list) => !cancelled && setSuppliers(list))
      .catch(() => !cancelled && setSuppliers([]));
    return () => {
      cancelled = true;
    };
  }, [open, suppliers]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  function reply(text: string): Omit<Extract<Message, { from: 'bot' }>, 'id' | 'from'> {
    const plain = normalize(text);
    if (/^(hola|buenas|buen dia|que tal)\b/.test(plain) && plain.split(' ').length <= 3) {
      return { text: '¡Hola! Contame qué producto necesitás y, si sabés, la cantidad. Te digo qué proveedores lo trabajan.' };
    }
    if (plain.includes('gracias')) {
      return { text: '¡De nada! Si necesitás algo más, escribime.' };
    }
    const lines = parseFreeText(text, CATEGORIES).filter((line) => line.category);
    if (lines.length === 0) {
      return {
        text: 'No llegué a identificar el producto. Probá contándomelo de otra forma o elegí una categoría:',
        categoryChips: true,
      };
    }
    const found = lines.map((line) => ({ category: line.category, quantity: line.quantity, unit: line.unit }));
    const matches = suppliersFor(
      found.map((item) => item.category),
      suppliers ?? [],
    );
    return {
      text: matches.length
        ? `Esto es lo que entendí. Estos proveedores trabajan ${found.length === 1 ? 'ese producto' : 'esos productos'}:`
        : 'Esto es lo que entendí. Todavía no tengo proveedores para mostrarte, pero podés pedir la cotización y la enviamos a todo el rubro.',
      found,
      suppliers: matches,
    };
  }

  function send(value?: string) {
    const text = (value ?? draft).trim();
    if (!text || typing) return;
    setDraft('');
    setLastRequest(text);
    setMessages((current) => [...current, { id: ++idRef.current, from: 'user', text }]);
    setTyping(true);
    window.setTimeout(() => {
      const answer = reply(text);
      // Se guarda solo lo que ATARIA entendió, para cargarlo en el panel después de registrarse.
      if (answer.found?.length) {
        const next = [...requested, text];
        setRequested(next);
        try {
          window.localStorage.setItem(ATARIA_PENDING_KEY, next.join('\n'));
        } catch {
          // Sin almacenamiento: igual puede escribirlo de nuevo en el panel.
        }
      }
      setMessages((current) => [...current, { id: ++idRef.current, from: 'bot', ...answer }]);
      setTyping(false);
    }, 700);
  }

  if (!open) return null;

  const quoteHref = session ? '/dashboard/comprador/solicitudes/nueva?modo=ataria' : '/acceso?perfil=cliente';

  // Va al <body>: si se dibujara dentro de la sección, la taparía el contenido de abajo.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div aria-label="Charlá con ATARIA" aria-modal="true" className="flex h-[min(88svh,680px)] w-full max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_30px_80px_rgba(2,6,23,0.35)] sm:rounded-3xl" role="dialog">
        <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#1238d6,#1f5bff)] px-5 py-4 text-white">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white/15 p-1">
            <Image alt="" className="h-full w-full object-contain" height={44} src="/botatar.png?v=2" unoptimized width={44} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold leading-tight">ATARIA</p>
            <p className="flex items-center gap-1.5 text-[12px] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Agente de ATAR · sin registrarte
            </p>
          </div>
          <button aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15" onClick={onClose} type="button">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#f5f7fc] px-4 py-5">
          <BotBubble>
            ¡Hola! Soy <b className="text-[#1238d6]">ATARIA</b>. Contame qué necesitás comprar (producto y cantidad) y te digo qué proveedores lo trabajan.
          </BotBubble>
          {messages.length === 0 ? (
            <div className="flex flex-wrap gap-2 pl-10">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  className="rounded-full border border-[#c9d6ff] bg-white px-3 py-1.5 text-[13px] font-medium text-[#1238d6] transition hover:border-[#1f5bff] hover:bg-[#f3f6ff]"
                  onClick={() => send(example)}
                  type="button"
                >
                  {example}
                </button>
              ))}
            </div>
          ) : null}

          {messages.map((message) =>
            message.from === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-[#1f5bff] px-3.5 py-2.5 text-[14px] leading-6 text-white">{message.text}</div>
              </div>
            ) : (
              <BotBubble key={message.id}>
                {message.text}
                {message.found?.length ? (
                  <ul className="mt-2 space-y-1">
                    {message.found.map((item, index) => (
                      <li key={`${item.category}-${index}`} className="flex items-center gap-2 rounded-lg bg-[#f3f6ff] px-2.5 py-1.5 text-[13px]">
                        <span className="font-semibold text-slate-900">{categoryName(item.category)}</span>
                        {Number(item.quantity) > 0 ? (
                          <span className="text-slate-500">
                            · {Number(item.quantity).toLocaleString('es-AR')} {item.unit}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {message.suppliers?.length ? (
                  <div className="mt-2 space-y-1.5">
                    {message.suppliers.map((supplier) => (
                      <Link
                        key={supplier.id}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 transition hover:border-[#1f5bff]"
                        href={`/productos/${supplier.slug}`}
                      >
                        <CompanyLogo className="h-9 w-9" logoUrl={supplierLogoUrl(supplier)} name={supplier.name} rounded="rounded-lg" textClassName="text-[12px] font-bold" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-slate-900">{supplier.name}</span>
                          <span className="block truncate text-[12px] text-slate-500">{[supplier.city, supplier.country].filter(Boolean).join(', ')}</span>
                        </span>
                        <span className="text-[12px] font-semibold text-[#1238d6]">Ver</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {message.found?.length ? (
                  <Link className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#1f5bff] px-4 text-[13.5px] font-semibold" href={quoteHref}>
                    <span className="text-white">{session ? 'Pedir cotización' : 'Pedir cotización gratis'}</span>
                  </Link>
                ) : null}
                {message.found?.length && !session ? (
                  <p className="mt-1.5 text-[12px] text-slate-500">Creás tu cuenta en un minuto y lo que me contaste queda cargado.</p>
                ) : null}
                {message.categoryChips ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {FALLBACK_REQUEST_CATEGORIES.filter((category) => category.label !== 'A medida').map((category) => (
                      <button
                        key={category.label}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12.5px] font-medium text-slate-700 transition hover:border-[#1f5bff] hover:text-[#1238d6]"
                        onClick={() => send(categoryName(category.label))}
                        type="button"
                      >
                        {categoryName(category.label)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </BotBubble>
            ),
          )}

          {typing ? (
            <div aria-label="ATARIA está escribiendo" className="flex items-end gap-2" role="status">
              <Avatar />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-3">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <input
            aria-label="Mensaje para ATARIA"
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 text-[15px] text-slate-950 outline-none placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={lastRequest ? 'Escribí otro producto…' : 'Ej.: 2000 bolsas de rafia de 50 kg'}
            ref={inputRef}
            value={draft}
          />
          <button
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f5bff] text-white transition hover:bg-[#194ee6] disabled:opacity-40"
            disabled={!draft.trim() || typing}
            type="submit"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
