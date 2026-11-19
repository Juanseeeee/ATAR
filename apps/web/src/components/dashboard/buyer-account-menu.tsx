'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { clearSession, getPrimaryCompanyName, getUserFullName, type WebSession } from '@/lib/session';

/** Menú de perfil del cliente en la barra superior: nombre, empresa, configuración y cerrar sesión. */
export default function BuyerAccountMenu({ session }: { session: WebSession | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = session ? getUserFullName(session.user) : 'Tu cuenta';
  const company = session ? getPrimaryCompanyName(session.user) : 'Tu empresa';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '·';

  function logout() {
    clearSession();
    setOpen(false);
    router.push('/acceso');
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tu cuenta"
        className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white py-1 pl-1 pr-2.5 text-left transition hover:bg-slate-50"
        onClick={() => setOpen((current) => !current)}
        title={`${name} · ${company}`}
        type="button"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef3ff] text-[12px] font-extrabold text-[#1238d6]">{initials}</span>
        <span className="hidden max-w-[150px] min-w-0 xl:block">
          <span className="block truncate text-[13px] font-semibold leading-tight text-slate-950">{name}</span>
          <span className="block truncate text-[11.5px] leading-tight text-slate-500">{company}</span>
        </span>
        <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] rounded-2xl border border-slate-300 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]" role="menu">
          <div className="rounded-xl bg-[#eef1f7] px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{company}</p>
          </div>
          <Link
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href="/dashboard/comprador/configuracion"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            Configuración
          </Link>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            onClick={logout}
            role="menuitem"
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
