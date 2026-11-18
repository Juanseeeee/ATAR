'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clearSession, getPrimaryCompanyName, getUserFullName, type WebSession } from '@/lib/session';
import { ASSISTANT_OPEN_EVENT } from './assistant-fab';

type IconName = 'plus' | 'home' | 'panel' | 'users' | 'file' | 'tag' | 'box' | 'chat' | 'heart' | 'bell' | 'gear' | 'logout' | 'dots';

function Icon({ name, className = 'h-[19px] w-[19px]' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </>
    ),
    panel: (
      <>
        <rect height="18" rx="3" width="18" x="3" y="3" />
        <path d="M8 16v-4M12 16V8M16 16v-6" />
      </>
    ),
    users: (
      <>
        <path d="M4 21V8l8-5 8 5v13" />
        <path d="M9 21v-6h6v6M9 10h.01M15 10h.01" />
      </>
    ),
    file: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </>
    ),
    tag: (
      <>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
        <path d="M7.5 7.5h.01" />
      </>
    ),
    box: (
      <>
        <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z" />
        <path d="M3.3 7.3 12 12l8.7-4.7M12 22V12" />
      </>
    ),
    chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
    heart: <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
      </>
    ),
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
    dots: <path d="M12 6h.01M12 12h.01M12 18h.01" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.9}
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Destino de los recorridos de ATARIA (data-tour). */
  tour?: string;
  exact?: boolean;
  badge?: number;
};

type NavGroup = { title?: string; items: NavItem[] };

/**
 * Menú lateral del comprador (solo escritorio; en el celular está la barra
 * inferior). Entre 1024 y 1280 px queda como una columna de íconos para no
 * quitarle ancho al contenido; desde 1280 px muestra los textos.
 */
export default function BuyerSidebar({
  session,
  notificationCount = 0,
}: {
  session: WebSession | null;
  notificationCount?: number;
}) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAccountOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setIsAccountOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsAccountOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAccountOpen]);

  const profileName = session ? getUserFullName(session.user) : 'Tu cuenta';
  const profileCompany = session ? getPrimaryCompanyName(session.user) : 'Tu empresa';
  const profileInitials =
    profileName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '·';

  const groups: NavGroup[] = [
    {
      items: [
        { label: 'Inicio', href: '/dashboard/comprador', icon: 'home', exact: true, tour: 'nav-inicio' },
        { label: 'Panel', href: '/dashboard/comprador/panel', icon: 'panel', tour: 'nav-panel' },
        { label: 'Proveedores', href: '/dashboard/comprador/proveedores', icon: 'users', tour: 'nav-proveedores' },
      ],
    },
    {
      title: 'Mis compras',
      items: [
        { label: 'Solicitudes', href: '/dashboard/comprador/solicitudes', icon: 'file', tour: 'nav-solicitudes' },
        { label: 'Cotizaciones', href: '/dashboard/comprador/cotizaciones', icon: 'tag', tour: 'nav-cotizaciones' },
        { label: 'Pedidos', href: '/dashboard/comprador/pedidos', icon: 'box', tour: 'nav-pedidos' },
        { label: 'Mensajes', href: '/dashboard/comprador/mensajes', icon: 'chat', tour: 'nav-mensajes' },
        { label: 'Favoritos', href: '/dashboard/comprador/favoritos', icon: 'heart', tour: 'nav-favoritos' },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        {
          label: 'Notificaciones',
          href: '/dashboard/comprador/notificaciones',
          icon: 'bell',
          badge: notificationCount,
        },
        { label: 'Configuración', href: '/dashboard/comprador/configuracion', icon: 'gear' },
      ],
    },
  ];

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    // "Solicitar cotización" tiene su propio botón: no marca "Solicitudes".
    if (pathname.startsWith('/dashboard/comprador/solicitudes/nueva')) return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function handleLogout() {
    clearSession();
    setIsAccountOpen(false);
    router.push('/acceso');
  }

  const isNewRequest = pathname.startsWith('/dashboard/comprador/solicitudes/nueva');

  return (
    <aside className="sticky top-0 z-40 hidden h-[100dvh] w-[76px] shrink-0 flex-col border-r border-slate-300 bg-white px-3 py-4 lg:flex xl:w-[248px] xl:px-4">
      <Link className="mb-4 flex items-center justify-center gap-2.5 px-1 xl:justify-start xl:px-2" href="/dashboard/comprador">
        <Image alt="ATAR" height={28} src="/logoatar.png" width={28} />
        <span className="hidden text-[18px] font-extrabold tracking-[-0.02em] text-slate-950 xl:inline">ATAR</span>
      </Link>

      <Link
        aria-label="Solicitar cotización"
        className={`mb-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1847ff] text-white shadow-[0_6px_16px_rgba(24,71,255,0.28)] transition hover:bg-[#0f3ff5] ${
          isNewRequest ? 'ring-2 ring-[#1847ff]/30 ring-offset-2' : ''
        }`}
        data-tour="buyer-cta"
        href="/dashboard/comprador/solicitudes/nueva"
        title="Solicitar cotización"
      >
        {/* globals.css: el color de los <a> va en un hijo. */}
        <span className="inline-flex items-center gap-2 text-white">
          <Icon className="h-[18px] w-[18px]" name="plus" />
          <span className="hidden text-[14px] font-bold xl:inline">Solicitar cotización</span>
        </span>
      </Link>

      <nav aria-label="Menú del comprador" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {groups.map((group, groupIndex) => (
          <div key={group.title ?? groupIndex} className={groupIndex > 0 ? 'mt-2 border-t border-slate-200 pt-2 xl:border-0 xl:pt-0' : ''}>
            {group.title ? (
              <p className="hidden px-3 pb-1.5 pt-3 text-[11.5px] font-semibold text-slate-500 xl:block">{group.title}</p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const badge = item.badge && item.badge > 0 ? Math.min(item.badge, 99) : null;
                return (
                  <li key={item.href}>
                    <Link
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex h-10 items-center justify-center rounded-[10px] px-3 transition xl:justify-start ${
                        active ? 'bg-[#eef3ff] shadow-[inset_3px_0_0_#1f5bff]' : 'hover:bg-slate-100'
                      }`}
                      data-tour={item.tour}
                      href={item.href}
                      title={item.label}
                    >
                      <span
                        className={`flex w-full items-center justify-center gap-3 text-[14px] xl:justify-start ${
                          active ? 'font-bold text-[#1238d6]' : 'font-medium text-slate-600 group-hover:text-slate-950'
                        }`}
                      >
                        <Icon name={item.icon} />
                        <span className="hidden xl:inline">{item.label}</span>
                        {badge ? (
                          <span className="absolute right-1.5 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1f5bff] px-1 text-[10.5px] font-bold text-white xl:static xl:ml-auto xl:h-[22px] xl:min-w-[22px] xl:px-1.5 xl:text-[12px]">
                            {badge}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        className="relative mt-3 hidden overflow-hidden rounded-2xl bg-[linear-gradient(140deg,#0b1f66,#1f5bff)] p-3.5 text-left text-white transition hover:brightness-110 xl:block"
        onClick={() => window.dispatchEvent(new Event(ASSISTANT_OPEN_EVENT))}
        type="button"
      >
        <Image
          alt=""
          className="pointer-events-none absolute -bottom-2 -right-1.5 h-[70px] w-[70px] object-contain"
          height={70}
          src="/botatar.png?v=2"
          unoptimized
          width={70}
        />
        <p className="text-[13.5px] font-bold">¿Te ayudo a cotizar?</p>
        <p className="mt-0.5 max-w-[130px] text-[12px] leading-snug text-[#c4d4ff]">ATARIA arma tu solicitud en un minuto.</p>
        <span className="mt-2.5 inline-block rounded-lg bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#1238d6]">Hablar con ATARIA</span>
      </button>

      <div className="relative mt-3" ref={accountRef}>
        <button
          aria-expanded={isAccountOpen}
          aria-label="Tu cuenta"
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 p-1.5 text-left transition hover:bg-slate-50 xl:justify-start xl:p-2"
          onClick={() => setIsAccountOpen((current) => !current)}
          title={`${profileName} · ${profileCompany}`}
          type="button"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[12.5px] font-extrabold text-[#1238d6]">
            {profileInitials}
          </span>
          <span className="hidden min-w-0 flex-1 xl:block">
            <span className="block truncate text-[13.5px] font-semibold text-slate-950">{profileName}</span>
            <span className="block truncate text-[12px] text-slate-500">{profileCompany}</span>
          </span>
          <Icon className="hidden h-[18px] w-[18px] text-slate-400 xl:block" name="dots" />
        </button>

        {isAccountOpen ? (
          <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[240px] rounded-2xl border border-slate-300 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <div className="rounded-xl bg-[#eef1f7] px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-slate-950">{profileName}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{profileCompany}</p>
            </div>
            <Link
              className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/dashboard/comprador/configuracion"
              onClick={() => setIsAccountOpen(false)}
            >
              <Icon className="h-4 w-4 text-slate-400" name="gear" />
              Configuración
            </Link>
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              onClick={handleLogout}
              type="button"
            >
              <Icon className="h-4 w-4 text-rose-500" name="logout" />
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
