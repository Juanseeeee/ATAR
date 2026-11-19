'use client';

import Link from 'next/link';
import { RegionButton } from '@/components/region/region-provider';
import type { WebSession } from '@/lib/session';
import BuyerAccountMenu from './buyer-account-menu';
import BuyerHomeSearch from './buyer-home-search';
import WorkspaceSwitcher from './workspace-switcher';

function Icon({ name }: { name: 'bell' | 'msg' }) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      {name === 'msg' ? (
        <path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z" />
      ) : (
        <>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </>
      )}
    </svg>
  );
}

/**
 * Barra superior del comprador en escritorio. La navegación vive en el menú
 * lateral (BuyerSidebar); acá quedan el buscador, los accesos rápidos y el
 * menú de perfil. Alto fijo de 64 px: las vistas a pantalla completa lo descuentan.
 */
export default function BuyerMarketplaceHeader({ notificationCount = 0, session = null }: { notificationCount?: number; session?: WebSession | null }) {
  const iconButton =
    'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50';

  return (
    <header className="sticky top-0 z-30 hidden h-16 border-b border-slate-300 bg-white/95 backdrop-blur lg:block">
      <div className="flex h-full items-center gap-4 px-4 xl:px-6">
        <div className="min-w-0 max-w-[680px] flex-1" data-tour="buyer-search">
          <BuyerHomeSearch size="header" tone="light" />
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <WorkspaceSwitcher className="hidden lg:inline-flex" />
          <RegionButton />
          <Link aria-label="Mensajes" className={iconButton} href="/dashboard/comprador/mensajes" title="Mensajes">
            <Icon name="msg" />
          </Link>
          <Link aria-label="Notificaciones" className={iconButton} href="/dashboard/comprador/notificaciones" title="Notificaciones">
            <Icon name="bell" />
            {notificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#ef4444] px-1 text-[10px] font-bold text-white">
                {Math.min(notificationCount, 9)}
              </span>
            ) : null}
          </Link>
          <BuyerAccountMenu session={session} />
        </div>
      </div>
    </header>
  );
}
