'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { RegionButton } from '@/components/region/region-provider';
import { Spinner } from '@/components/ui/spinner';
import { getPrimaryCompanyName, type WebSession } from '@/lib/session';

const marketingNav = [
  { label: 'Inicio', href: '/' },
  { label: 'Productos', href: '/productos' },
  { label: 'Proveedores', href: '/proveedores' },
  { label: 'Cómo funciona', href: '/como-funciona' },
];

function AtarMark() {
  return (
    <div className="flex items-center gap-2.5">
      <Image alt="ATAR" className="h-9 w-9" height={36} src="/logoatar.png" width={36} />
      <div className="leading-tight">
        <p className="text-lg font-bold tracking-tight text-slate-950">ATAR</p>
      </div>
    </div>
  );
}

function ArrowIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function MenuIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

/** Iniciales de la empresa para el botón de cuenta (máx. 2 letras). */
function initialsOf(name: string) {
  const words = name.replace(/\b(s\.?a\.?|s\.?r\.?l\.?)\b/gi, '').trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || 'A';
}

/**
 * Menú de cuenta: agrupa la empresa, el email y "Cerrar sesión" detrás de un
 * solo botón, para que el header tenga una única acción destacada (ir al panel).
 */
function AccountMenu({ session, onSignOut }: { session: WebSession; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const company = getPrimaryCompanyName(session.user);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Cuenta de ${company}`}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white/60 pl-1.5 pr-2.5 text-slate-700 transition hover:bg-white"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#eef3ff] text-[11px] font-bold text-[#1f5bff]">
          {initialsOf(company)}
        </span>
        <svg aria-hidden="true" className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[14px] border border-[#e3e8f4] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.14)]"
          role="menu"
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#eef3ff] text-[12px] font-bold text-[#1f5bff]">
              {initialsOf(company)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{company}</p>
              <p className="truncate text-xs text-slate-500">{session.user.email}</p>
            </div>
          </div>
          <div className="border-t border-slate-100 p-1.5">
            <button
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              role="menuitem"
              type="button"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { isHydrated, isAuthenticated, session, signOut, getDefaultPath } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Cierra el menú mobile al navegar.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const inDashboard = pathname?.startsWith('/dashboard');
  const inAccess = pathname?.startsWith('/acceso');
  if (inDashboard || inAccess) {
    return null;
  }

  const isActiveLink = (href: string) =>
    (href === '/' && pathname === '/') || (href !== '/' && pathname === href);

  // En el inicio el hero sube detrás del header: el header queda translúcido sobre
  // el mismo celeste, sin línea divisoria.
  const isHome = pathname === '/';
  return (
    <header
      className={`theme-public sticky top-0 z-30 border-b backdrop-blur ${
        isHome ? 'border-transparent bg-white/35' : 'border-slate-200 bg-white/80'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-12">
        <Link href="/" className="shrink-0">
          <AtarMark />
        </Link>

        {/* Navegación desktop */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-700 lg:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.label}
              className={`inline-flex items-center gap-1 border-b-2 pb-1 transition ${
                isActiveLink(item.href)
                  ? 'border-[#1f5bff] text-slate-950'
                  : 'border-transparent hover:border-slate-200 hover:text-slate-950'
              }`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <RegionButton />
          {!isHydrated ? (
            <div className="hidden h-10 items-center gap-2 rounded-[10px] border border-slate-200 px-4 text-sm text-slate-500 lg:flex">
              <Spinner className="h-4 w-4" />
              Cargando
            </div>
          ) : isAuthenticated && session ? (
            <>
              <AccountMenu
                onSignOut={() => {
                  signOut();
                  router.push('/acceso');
                }}
                session={session}
              />
              <button
                className="hidden h-10 items-center gap-2 rounded-[10px] bg-[#1f5bff] px-4 text-sm font-semibold text-white transition hover:bg-[#194ee6] lg:inline-flex"
                onClick={() => router.push(getDefaultPath())}
                type="button"
              >
                Ir a mi panel
                <ArrowIcon />
              </button>
            </>
          ) : (
            <>
              <Link
                className="hidden h-10 items-center rounded-[10px] border border-slate-200 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 lg:inline-flex"
                href="/acceso"
              >
                Iniciar sesión
              </Link>
              {/* globals.css fija `a { color: inherit }` fuera de las capas de
                  Tailwind: el color del texto va en un hijo. */}
              <Link
                className="hidden h-10 items-center rounded-[10px] bg-[#1f5bff] px-4 text-sm font-semibold transition hover:bg-[#194ee6] sm:inline-flex"
                href="/acceso"
              >
                <span className="inline-flex items-center gap-2 text-white">
                  Crear cuenta
                  <ArrowIcon />
                </span>
              </Link>
            </>
          )}

          {/* Botón hamburguesa (mobile/tablet) */}
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Menú mobile: expande/colapsa con animación */}
      <div
        className={`grid bg-white transition-[grid-template-rows] duration-300 ease-out lg:hidden ${
          menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <nav
            className={`flex flex-col border-t border-slate-200 px-4 py-3 transition-all duration-300 ease-out sm:px-6 ${
              menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
            }`}
          >
            {marketingNav.map((item) => (
              <Link
                key={item.label}
                className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActiveLink(item.href)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-4">
              {!isHydrated ? null : isAuthenticated && session ? (
                <>
                  <div className="px-3 pb-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{getPrimaryCompanyName(session.user)}</p>
                    <p className="truncate text-xs text-slate-500">{session.user.email}</p>
                  </div>
                  <button
                    className="rounded-xl bg-[#1f5bff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#194ee6]"
                    onClick={() => router.push(getDefaultPath())}
                    type="button"
                  >
                    Ir a mi panel
                  </button>
                  <button
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => {
                      signOut();
                      router.push('/acceso');
                    }}
                    type="button"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link
                    className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    href="/acceso"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    className="rounded-xl bg-[#1f5bff] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#194ee6]"
                    href="/acceso"
                  >
                    Crear cuenta gratis
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
