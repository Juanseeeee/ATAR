'use client';

import CompanyLogo from '@/components/dashboard/company-logo';
import type { ConversationRecord } from '@/lib/atar-api';

/**
 * Fila de la bandeja de mensajes (cliente y proveedor), al estilo de una app de
 * chat: logo, nombre, último mensaje y hora; lo no leído va en negrita con su
 * contador. Debajo, de qué trata la conversación.
 */

function contextLabel(contextType: ConversationRecord['contextType']) {
  if (contextType === 'DIRECT') return 'Chat directo';
  if (contextType === 'QUOTE') return 'Cotización';
  if (contextType === 'REQUEST') return 'Solicitud';
  return 'Producto';
}

/** "14:05" si es de hoy, "ayer", o "12/11". */
function formatWhen(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days === 0) return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date);
  if (days === 1) return 'ayer';
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(date);
}

export default function ConversationListItem({
  conversation,
  name,
  logoUrl,
  active,
  onSelect,
}: {
  conversation: ConversationRecord;
  /** Nombre de la otra empresa. */
  name: string;
  logoUrl: string | null;
  active: boolean;
  onSelect: () => void;
}) {
  const unread = conversation.unreadCount > 0;
  const about =
    conversation.contextType === 'DIRECT' ? contextLabel(conversation.contextType) : `${contextLabel(conversation.contextType)} · ${conversation.contextTitle}`;
  return (
    <button
      aria-current={active ? 'true' : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
        active ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'
      }`}
      onClick={onSelect}
      type="button"
    >
      <CompanyLogo
        className="h-11 w-11 shrink-0"
        logoUrl={logoUrl}
        name={name}
        rounded="rounded-full"
        textClassName="text-[12px] font-bold"
        tone="border border-slate-200 bg-white text-slate-700"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[14px] text-slate-950 ${unread ? 'font-bold' : 'font-semibold'}`}>{name}</span>
          <span className={`shrink-0 text-[11px] ${unread ? 'font-semibold text-indigo-600' : 'text-slate-400'}`}>
            {formatWhen(conversation.lastMessageAt ?? conversation.lastMessage?.createdAt)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={`truncate text-[13px] ${unread ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
            {conversation.lastMessage?.body || 'Todavía no hay mensajes'}
          </span>
          {unread ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10.5px] font-bold text-white">
              {conversation.unreadCount}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-slate-400">{about}</span>
      </span>
    </button>
  );
}
