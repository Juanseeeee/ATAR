'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import ConversationListItem from '@/components/chat/conversation-list-item';
import ConversationPanel from '@/components/chat/conversation-panel';
import SupplierMiniCard from '@/components/chat/supplier-mini-card';
import { atarApi, type ConversationRecord, type SupplierDirectoryRecord } from '@/lib/atar-api';
import { LoadingState } from '@/components/ui/spinner';
import { useBuyerDashboardData } from '@/lib/dashboard-hooks';

export default function BuyerMessagesPage() {
  return (
    <Suspense fallback={null}>
      <BuyerMessagesWithParams />
    </Suspense>
  );
}

function BuyerMessagesWithParams() {
  // ?c= abre directamente una conversación (desde una notificación de mensaje).
  const target = useSearchParams()?.get('c') ?? null;
  return <BuyerMessagesContent key={target ?? 'todas'} initialConversationId={target} />;
}

function BuyerMessagesContent({ initialConversationId }: { initialConversationId: string | null }) {
  const { session, loading: dashboardLoading, error: dashboardError } = useBuyerDashboardData();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Directorio de proveedores, para la ficha del costado.
  const [suppliers, setSuppliers] = useState<SupplierDirectoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  // Conversación elegida a mano (o la del enlace ?c=).
  const [pickedId, setSelectedId] = useState<string | null>(initialConversationId);
  // En mobile el chat funciona como Instagram: se ve la lista y, al tocar una
  // conversación, se abre a pantalla completa. En desktop conviven los 2 paneles.
  const [mobileChatOpen, setMobileChatOpen] = useState(Boolean(initialConversationId));

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    const accessToken = session.accessToken;
    let cancelled = false;

    async function loadConversations() {
      try {
        setLoading(true);
        setError(null);
        const items = await atarApi.getConversations(undefined, accessToken);
        if (!cancelled) {
          // Los chats directos son entre proveedoras: van en la bandeja de proveedor.
          setConversations(items.filter((item) => item.contextType !== 'DIRECT'));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las conversaciones.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadConversations();
    atarApi
      .getSuppliers(accessToken)
      .then((list) => !cancelled && setSuppliers(list))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const unreadTotal = conversations.filter((conversation) => conversation.unreadCount > 0).length;

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...conversations]
      // Las conversaciones abiertas sin ningún mensaje no se listan (salvo la elegida).
      .filter((conversation) => Boolean(conversation.lastMessage) || conversation.id === pickedId)
      .filter((conversation) => {
        if (activeTab === 'unread' && conversation.unreadCount === 0) {
          return false;
        }
        if (!query) {
          return true;
        }
        return [conversation.supplierCompanyName, conversation.contextTitle, conversation.lastMessage?.body ?? '']
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const leftTime = new Date(left.lastMessageAt ?? left.lastMessage?.createdAt ?? 0).getTime();
        const rightTime = new Date(right.lastMessageAt ?? right.lastMessage?.createdAt ?? 0).getTime();
        return rightTime - leftTime;
      });
  }, [conversations, search, activeTab, pickedId]);

  // La elegida si sigue en la lista (o si todavía está cargando, para no perder
  // la del enlace); si no, la primera de la lista.
  const selectedId =
    pickedId && (loading || conversations.some((conversation) => conversation.id === pickedId))
      ? pickedId
      : (filteredConversations[0]?.id ?? null);

  const activeConversation = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  const detailLink = useMemo(() => {
    if (!activeConversation) {
      return null;
    }
    if (activeConversation.contextType === 'REQUEST' && activeConversation.requestId) {
      return { href: `/dashboard/comprador/solicitudes/${activeConversation.requestId}`, label: 'Ver solicitud' };
    }
    if (activeConversation.contextType === 'QUOTE' && activeConversation.quoteId) {
      return { href: `/dashboard/comprador/cotizaciones/${activeConversation.quoteId}`, label: 'Ver cotización' };
    }
    return null;
  }, [activeConversation]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error ?? dashboardError ? (
        <div className="shrink-0 border-b border-rose-200 bg-rose-100 px-5 py-3 text-sm text-rose-700">
          {error ?? dashboardError}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden border-t border-slate-300 bg-white xl:grid-cols-[320px_minmax(0,1fr)_290px] 2xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <section data-tour="messages-list" className={`min-h-0 flex-col border-b border-slate-300 bg-white p-4 xl:flex xl:border-b-0 xl:border-r ${mobileChatOpen ? 'hidden' : 'flex'}`}>
          <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5">
            <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <input
              className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar conversaciones..."
              value={search}
            />
          </div>

          <div className="mt-4 flex items-center gap-6 border-b border-slate-300 pb-3 text-xs font-semibold">
            {[
              { key: 'all' as const, label: 'Todas', count: conversations.filter((item) => item.lastMessage).length },
              { key: 'unread' as const, label: 'No leídos', count: unreadTotal },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`relative pb-2 transition ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab(tab.key)}
                  type="button"
                >
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{tab.count}</span>
                  </span>
                  {isActive ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-indigo-600" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {dashboardLoading || loading ? (
              <div className="rounded-2xl bg-[#eef1f7] px-4 py-8"><LoadingState label="Cargando conversaciones..." /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-[#eef1f7] px-4 py-8 text-sm text-slate-500">
                Todavía no hay conversaciones.
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  active={activeConversation?.id === conversation.id}
                  conversation={conversation}
                  logoUrl={conversation.supplierCompanyLogoUrl}
                  name={conversation.supplierCompanyName}
                  onSelect={() => {
                    setSelectedId(conversation.id);
                    setMobileChatOpen(true);
                  }}
                />
              ))
            )}
          </div>
        </section>

        <section data-tour="messages-chat" className={`min-h-0 flex-col overflow-hidden bg-white xl:flex ${mobileChatOpen ? 'flex' : 'hidden'}`}>
          {selectedId ? (
            <>
              <div className="min-h-0 flex-1">
                <ConversationPanel
                  conversationId={selectedId}
                  description={activeConversation ? `Conversación con ${activeConversation.supplierCompanyName}.` : 'Conversación'}
                  mode="existing"
                  session={session}
                  title={activeConversation?.contextTitle ?? 'Conversación'}
                  onBack={() => setMobileChatOpen(false)}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
              Seleccioná una conversación para ver el detalle.
            </div>
          )}
        </section>

        {/* Ficha del proveedor con el que se está hablando (solo en escritorio ancho). */}
        <div className="hidden min-h-0 xl:block">
          {activeConversation ? (
            <SupplierMiniCard
              context={
                detailLink
                  ? { label: detailLink.label.replace(/^Ver /, ''), title: activeConversation.contextTitle, href: detailLink.href }
                  : null
              }
              fallbackLogoUrl={activeConversation.supplierCompanyLogoUrl}
              fallbackName={activeConversation.supplierCompanyName}
              supplier={suppliers.find((item) => item.id === activeConversation.supplierCompanyId) ?? null}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
