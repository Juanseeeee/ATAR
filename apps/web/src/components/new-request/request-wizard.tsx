'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useRegion } from '@/components/region/region-provider';
import { SupplierAvatar } from '@/components/quotes/supplier-avatar';
import { atarApi, type RequestCatalogCategoryRecord, type RequestCatalogFieldRecord } from '@/lib/atar-api';
import {
  categoryIconFor,
  clearDraft,
  deliveryWhenLabel,
  draftFromRequest,
  emptyDraft,
  fixedSpecsFor,
  loadDraft,
  missingCount,
  newLine,
  saveDraft,
  visibleSpecFields,
  specificationText,
  type DeliveryWhen,
  type NewRequestDraft,
  type ProductLine,
  type WizardStep,
} from '@/lib/new-request';
import { mapSupplierToProviderDirectoryItem, type ProviderDirectoryItem } from '@/lib/provider-directory';
import { getRequestCatalogKeywords } from '@/lib/request-catalog';
import { FALLBACK_REQUEST_CATEGORIES } from '@/lib/request-catalog-fallback';
import { formatRequestCode } from '@/lib/request-code';
import SpecsStep from './specs-step';

const BASE = '/dashboard/comprador/solicitudes/nueva';
const CUSTOM = 'A medida';

const STEPS: Array<{ key: WizardStep; label: string; title: string; text: string }> = [
  { key: 1, label: 'Productos', title: '¿Qué querés cotizar?', text: 'Elegí uno o varios productos del catálogo. Después completás los detalles de cada uno.' },
  { key: 2, label: 'Especificaciones', title: 'Completá las especificaciones', text: 'Te hacemos unas preguntas por producto. Elegí una opción estándar o escribí la tuya.' },
  { key: 3, label: 'Entrega', title: '¿Dónde y cuándo lo recibís?', text: 'Con esto los proveedores calculan el flete y el plazo.' },
  { key: 4, label: 'Proveedores', title: '¿A quién se la mandás?', text: 'Elegí uno o más proveedores. Arriba están los que trabajan lo que pediste.' },
  { key: 5, label: 'Revisar y enviar', title: 'Revisá y enviá', text: 'Así la van a ver los proveedores. Enviarla es gratis y no te compromete a comprar.' },
];

const WHEN_OPTIONS: Array<{ key: DeliveryWhen; label: string }> = [
  { key: 'asap', label: 'Lo antes posible' },
  { key: '15', label: 'En 15 días' },
  { key: '30', label: 'En 30 días' },
  { key: 'date', label: 'Elegir fecha' },
];

type IconName = 'check' | 'plus' | 'trash' | 'search' | 'edit' | 'lock' | 'globe' | 'verified' | 'chev-left' | 'chev-right' | 'chev-down' | 'chev-up' | 'arrow' | 'building';

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    check: <path d="m5 12 4.5 4.5L19 7" />,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    search: <path d="M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />,
    edit: <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
    lock: (
      <>
        <rect height="10" rx="2" width="16" x="4" y="11" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    verified: <path d="m9 12 2 2 4-4M12 3l2.4 1.8 3 .2.9 2.9 2 2.2-1 2.9.2 3-2.7 1.4-1.5 2.6-3-.4L12 21l-2.3-1.4-3 .4-1.5-2.6-2.7-1.4.2-3-1-2.9 2-2.2.9-2.9 3-.2z" />,
    'chev-left': <path d="m15 6-6 6 6 6" />,
    'chev-right': <path d="m9 6 6 6-6 6" />,
    'chev-down': <path d="m6 9 6 6 6-6" />,
    'chev-up': <path d="m6 15 6-6 6 6" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    building: <path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M9 10h.01M15 10h.01" />,
  };
  return (
    <svg
      aria-hidden="true"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

const card = 'rounded-2xl border border-slate-300 bg-white';
const field =
  'h-11 rounded-xl border border-[var(--field-border)] bg-white px-3.5 text-[14.5px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10';
const input = `${field} w-full`;
const textareaClass =
  'w-full resize-y rounded-xl border border-[var(--field-border)] bg-white px-3.5 py-2.5 text-[14.5px] outline-none placeholder:text-slate-400 focus:border-[#1f5bff] focus:ring-4 focus:ring-[#1f5bff]/10';
const primaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1847ff] px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(24,71,255,0.22)] transition hover:bg-[#0f3ff5] disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-[15px] font-semibold text-slate-800 transition hover:bg-slate-50';

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-[13.5px] font-semibold text-slate-800">
      {text}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </span>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-[12.5px] font-medium text-rose-600">{children}</span>;
}

function quantityLabel(line: ProductLine) {
  const value = Number(line.quantity);
  return value > 0 ? `${value.toLocaleString('es-AR')} ${line.unit}` : 'Sin cantidad';
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export default function RequestWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  // Nombre del rubro como se dice en el país del usuario (el valor guardado
  // sigue siendo el nombre canónico del catálogo).
  const { categoryName } = useRegion();

  const [draft, setDraft] = useState<NewRequestDraft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [categories, setCategories] = useState<RequestCatalogCategoryRecord[]>(FALLBACK_REQUEST_CATEGORIES);
  const [providers, setProviders] = useState<ProviderDirectoryItem[] | null>(null);
  const [prefillSupplierNames, setPrefillSupplierNames] = useState<string[]>([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [providerQuery, setProviderQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const step = draft.step;

  // ---------- Carga inicial: de dónde sale el borrador ----------
  const initKey = searchParams?.toString() ?? '';
  const initializedFor = useRef<string | null>(null);
  useEffect(() => {
    if (initializedFor.current === initKey || !session) return;
    const params = new URLSearchParams(initKey);
    const mode = params.get('modo');
    // El cambio a "?modo=seguir" lo hace este mismo efecto: no reinicia nada.
    const alreadyLoaded = initializedFor.current !== null;
    initializedFor.current = initKey;
    if (alreadyLoaded && mode === 'seguir') return;

    const editParam = params.get('edit');
    const repeatParam = params.get('repetir');
    const categoryParam = params.get('category');
    const contactName = [session.user.firstName, session.user.lastName].filter(Boolean).join(' ');

    void (async () => {
      await Promise.resolve();
      let next: NewRequestDraft = { ...emptyDraft(), contactName };
      const sourceId = editParam ?? repeatParam;

      if (sourceId) {
        try {
          const request = await atarApi.getRequestDetail(sourceId, session.accessToken);
          next = draftFromRequest(request, categories);
          next.contactName = next.contactName || contactName;
          setPrefillSupplierNames(
            (request.preferredSupplierName ?? '')
              .split('|')
              .map((name) => name.trim().toLowerCase())
              .filter(Boolean),
          );
          if (editParam) {
            setEditId(editParam);
            next.step = 5;
          }
        } catch {
          setError('No se pudo cargar esa solicitud. Podés armar una nueva desde acá.');
        }
      } else if (categoryParam) {
        // Desde una categoría del inicio: el producto ya está elegido.
        next.products = [newLine({ name: categoryName(categoryParam), category: categoryParam })];
        next.step = 2;
      } else if (mode === 'seguir' || params.has('step')) {
        const saved = loadDraft();
        if (saved) next = { ...saved, contactName: saved.contactName || contactName };
      }

      setDraft(next);
      setReady(true);
      if (!editParam && mode !== 'seguir') {
        router.replace(`${BASE}?modo=seguir`, { scroll: false });
      }
    })();
  }, [categories, categoryName, initKey, router, session]);

  useEffect(() => {
    if (!ready || editId || createdId) return;
    saveDraft(draft);
  }, [draft, ready, editId, createdId]);

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

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    atarApi
      .getSuppliers(session.accessToken)
      .then((list) => {
        if (!cancelled) setProviders(list.map((supplier) => mapSupplierToProviderDirectoryItem(supplier)));
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  // Repetir / editar: marcar los proveedores que tenía la solicitud original.
  useEffect(() => {
    if (!providers || providers.length === 0 || prefillSupplierNames.length === 0) return;
    const ids = providers.filter((provider) => prefillSupplierNames.includes(provider.name.trim().toLowerCase())).map((provider) => provider.id);
    const timer = window.setTimeout(() => {
      setPrefillSupplierNames([]);
      if (ids.length > 0) setDraft((current) => ({ ...current, supplierIds: ids }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [providers, prefillSupplierNames]);

  // ---------- Derivados ----------
  const products = draft.products;
  const fieldsByLine = useMemo(() => {
    const map: Record<string, RequestCatalogFieldRecord[]> = {};
    for (const line of products) map[line.id] = visibleSpecFields(categories, line);
    return map;
  }, [categories, products]);
  const missingByLine = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of products) map[line.id] = missingCount(line, fieldsByLine[line.id] ?? []);
    return map;
  }, [fieldsByLine, products]);
  const completeCount = products.filter((line) => missingByLine[line.id] === 0).length;

  const productsOk = products.length > 0;
  const specsOk = productsOk && completeCount === products.length;
  const deliveryOk = draft.address.trim().length > 0 && draft.city.trim().length > 0 && (draft.when !== 'date' || Boolean(draft.date));
  const suppliersOk = draft.supplierIds.length > 0 || draft.openToAll;
  const stepOk: Record<WizardStep, boolean> = { 1: productsOk, 2: specsOk, 3: deliveryOk, 4: suppliersOk, 5: specsOk && deliveryOk && suppliersOk };

  // Producto abierto en "Especificaciones": el elegido, o el primero incompleto.
  const activeOpenId =
    openId && openId !== 'none' && products.some((line) => line.id === openId)
        ? openId
      : (products.find((line) => missingByLine[line.id] > 0) ?? products[0] ?? null)?.id ?? null;

  const keywords = useMemo(
    () =>
      Array.from(
        new Set(products.flatMap((line) => (line.category && line.category !== CUSTOM ? getRequestCatalogKeywords(categories, line.category) : [line.name]))),
      ),
    [products, categories],
  );

  const rankedProviders = useMemo(() => {
    return (providers ?? [])
      .map((provider) => {
        const haystack = [provider.category, provider.description, provider.tags.join(' '), (provider.mainProducts ?? []).join(' ')]
          .join(' ')
          .toLowerCase();
        const matches = keywords.filter((keyword) => keyword && haystack.includes(keyword.toLowerCase())).length;
        return { provider, matches, score: matches * 2 + (provider.isVerified ? 1 : 0) };
      })
      .sort((a, b) => b.score - a.score);
  }, [keywords, providers]);
  const matchingProviders = rankedProviders.filter((item) => item.matches > 0).length;

  const visibleProviders = useMemo(() => {
    const query = providerQuery.trim().toLowerCase();
    if (!query) return rankedProviders;
    return rankedProviders.filter(({ provider }) =>
      [provider.name, provider.city, provider.description, provider.tags.join(' ')].join(' ').toLowerCase().includes(query),
    );
  }, [providerQuery, rankedProviders]);

  const selectedProviders = useMemo(
    () => (providers ?? []).filter((provider) => draft.supplierIds.includes(provider.id)),
    [providers, draft.supplierIds],
  );

  const visibleCategories = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return categories.filter(
      (category) =>
        category.label !== CUSTOM &&
        (!query ||
          category.label.toLowerCase().includes(query) ||
          (category.searchKeywords ?? []).some((keyword) => keyword.toLowerCase().includes(query))),
    );
  }, [catalogQuery, categories]);

  // ---------- Acciones ----------
  function update(patch: Partial<NewRequestDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateLine(id: string, patch: Partial<ProductLine>) {
    // La tarjeta que se está editando queda abierta aunque se complete.
    setOpenId((current) => (current && current !== 'none' ? current : id));
    setDraft((current) => ({
      ...current,
      products: current.products.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  }

  function setSpec(id: string, label: string, value: string) {
    setOpenId((current) => (current && current !== 'none' ? current : id));
    setDraft((current) => ({
      ...current,
      products: current.products.map((line) => (line.id === id ? { ...line, specs: { ...line.specs, [label]: value } } : line)),
    }));
  }

  function removeLine(id: string) {
    setDraft((current) => ({ ...current, products: current.products.filter((line) => line.id !== id) }));
  }

  function toggleCategory(category: RequestCatalogCategoryRecord) {
    const existing = products.find((line) => line.category === category.label);
    if (existing) removeLine(existing.id);
    else setDraft((current) => ({ ...current, products: [...current.products, newLine({ name: categoryName(category.label), category: category.label })] }));
  }

  function addCustom() {
    const line = newLine({ category: CUSTOM });
    setDraft((current) => ({ ...current, products: [...current.products, line], step: 2 }));
    setOpenId(line.id);
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function goTo(next: WizardStep) {
    update({ step: next });
    setShowErrors(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function handleContinue() {
    if (!stepOk[step]) {
      setShowErrors(true);
      if (step === 2) {
        const firstBad = products.find((line) => missingByLine[line.id] > 0);
        if (firstBad) setOpenId(firstBad.id);
      }
      return;
    }
    if (step < 5) goTo((step + 1) as WizardStep);
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      setError('No se encontró la sesión. Volvé a iniciar sesión.');
      return;
    }
    if (!stepOk[5]) {
      const firstBad = ([1, 2, 3, 4] as WizardStep[]).find((key) => !stepOk[key]);
      if (firstBad) goTo(firstBad);
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const names = products.map((line) => line.name.trim());
      const title = (names.length === 1 ? names[0] : `${names[0]} y ${names.length - 1} producto${names.length === 2 ? '' : 's'} más`).slice(0, 120);
      const dueDate =
        draft.when === 'date' && draft.date
          ? new Date(`${draft.date}T12:00:00`).toISOString()
          : draft.when === '15' || draft.when === '30'
            ? addDays(Number(draft.when)).toISOString()
            : undefined;
      const description = [
        names.length > 1 ? `Productos solicitados: ${names.join(', ')}` : null,
        `Entrega: ${[draft.address.trim(), draft.city.trim()].filter(Boolean).join(', ')}`,
        `Fecha de entrega: ${deliveryWhenLabel(draft)}`,
        draft.contactName.trim() ? `Contacto en planta: ${draft.contactName.trim()}` : null,
        draft.phone.trim() ? `Telefono de contacto: ${draft.phone.trim()}` : null,
        draft.notes.trim() ? `Observaciones: ${draft.notes.trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const payload = {
        title,
        description,
        category: products[0].category || CUSTOM,
        status: 'PUBLISHED' as const,
        dueDate,
        deliveryMode: draft.when === 'asap' ? 'asap' : 'exact',
        privateRequest: !draft.openToAll,
        targetSupplierCompanyIds: draft.supplierIds,
        preferredSupplierName: selectedProviders.map((provider) => provider.name.trim()).join(' | ').slice(0, 120) || undefined,
        deliveryAddress: draft.address.trim() || undefined,
        deliveryCity: draft.city.trim() || undefined,
        deliveryContactName: draft.contactName.trim() || undefined,
        deliveryPhone: draft.phone.trim() || undefined,
        deliveryNotes: draft.notes.trim() || undefined,
        items: products.map((line) => ({
          productName: line.name.trim(),
          category: line.category || undefined,
          quantity: Math.round(Number(line.quantity)),
          unit: line.unit || undefined,
          specifications: specificationText(line, fieldsByLine[line.id] ?? []) || undefined,
        })),
      };

      const saved = editId
        ? await atarApi.updateRequest(editId, payload, session.accessToken)
        : await atarApi.createRequest(payload, session.accessToken);
      clearDraft();
      setCreatedId(saved.id);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Pantalla final ----------
  if (createdId) {
    const count = selectedProviders.length;
    const recipients = draft.openToAll
      ? `${count > 0 ? `${count} proveedor${count === 1 ? '' : 'es'} elegido${count === 1 ? '' : 's'} y ` : ''}los proveedores del rubro`
      : `${count} proveedor${count === 1 ? '' : 'es'}`;
    return (
      <div className="flex min-h-[calc(100dvh-120px)] items-center justify-center py-6">
        <div className={`${card} w-full max-w-[560px] px-6 py-10 text-center`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon className="h-7 w-7" name="check" />
          </div>
          <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.03em] text-slate-950">{editId ? '¡Cambios guardados!' : '¡Solicitud enviada!'}</h1>
          <p className="mt-2 text-[14.5px] text-slate-600">
            {formatRequestCode(createdId)} · Le llegó a {recipients}. Te avisamos cuando respondan.
          </p>
          <div className="mx-auto mt-7 grid max-w-[420px] gap-3 sm:grid-cols-2">
            <Link className={`${secondaryButton} h-11 text-[14.5px]`} href={BASE}>
              Pedir otra cotización
            </Link>
            <Link className={`${primaryButton} h-11 text-[14.5px]`} href={`/dashboard/comprador/solicitudes/${createdId}`}>
              <span className="text-white">Ver la solicitud</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden h-80 animate-pulse rounded-2xl bg-white/70 lg:block" />
        <div className="h-[460px] animate-pulse rounded-2xl bg-white/70" />
      </div>
    );
  }

  const stepInfo = STEPS[step - 1];

  // ---------- Pasos (columna izquierda) ----------
  const stepHints: Record<WizardStep, string> = {
    1: products.length === 0 ? 'Elegí qué cotizar' : `${products.length} agregado${products.length === 1 ? '' : 's'}`,
    2: products.length === 0 ? 'Detalles de cada uno' : `${completeCount} de ${products.length} completo${products.length === 1 ? '' : 's'}`,
    3: deliveryOk && step > 3 ? [draft.city, deliveryWhenLabel(draft)].filter(Boolean).join(' · ') : 'Dónde y cuándo',
    4: draft.supplierIds.length > 0 ? `${draft.supplierIds.length} elegido${draft.supplierIds.length === 1 ? '' : 's'}` : 'A quién se la mandás',
    5: '',
  };

  const reachable = (key: WizardStep) => key <= step || ([1, 2, 3, 4] as WizardStep[]).filter((item) => item < key).every((item) => stepOk[item]);

  const stepper = (
    <nav aria-label="Pasos de la solicitud" className={`${card} px-5 py-5 lg:sticky lg:top-[80px]`} data-tour="wizard-steps">
      <ol>
        {STEPS.map((item, index) => {
          const current = item.key === step;
          const done = item.key < step && stepOk[item.key];
          const canGo = reachable(item.key);
          const last = index === STEPS.length - 1;
          return (
            <li key={item.key} className="relative pb-5 last:pb-0">
              {!last ? (
                <span className={`absolute left-[17px] top-[40px] h-[calc(100%-36px)] w-[2px] ${item.key < step ? 'bg-[#1f5bff]' : 'bg-slate-200'}`} />
              ) : null}
              <button
                className={`flex w-full items-start gap-3.5 text-left ${canGo ? '' : 'cursor-not-allowed'}`}
                disabled={!canGo}
                onClick={() => goTo(item.key)}
                type="button"
              >
                <span
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
                    done
                      ? 'bg-[#1f5bff] text-white'
                      : current
                        ? 'border-2 border-[#1f5bff] bg-white text-[#1238d6] shadow-[0_0_0_4px_rgba(31,91,255,0.12)]'
                        : 'border-2 border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {done ? <Icon className="h-[18px] w-[18px]" name="check" /> : item.key}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={`block text-[15px] font-bold ${canGo ? 'text-slate-950' : 'text-slate-500'}`}>{item.label}</span>
                  {stepHints[item.key] ? <span className="block truncate text-[13px] text-slate-500">{stepHints[item.key]}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {!editId ? (
        <p className="mt-5 flex items-start gap-2 border-t border-slate-200 pt-4 text-[12.5px] text-slate-500">
          <Icon className="mt-0.5 h-3.5 w-3.5 text-emerald-600" name="check" />
          Borrador guardado automáticamente
        </p>
      ) : null}
    </nav>
  );

  // ---------- Paso 1: Productos ----------
  const productsStep = (
    <div className={`${card} p-5`} data-tour="wizard-catalog">
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" name="search" />
        <input
          className={`${input} pl-10`}
          onChange={(event) => setCatalogQuery(event.target.value)}
          placeholder="Buscar en el catálogo: bolsones, hilo, tinta…"
          type="search"
          value={catalogQuery}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
        {visibleCategories.map((category) => {
          const selected = products.some((line) => line.category === category.label);
          return (
            <button
              key={category.id}
              aria-pressed={selected}
              className={`relative flex flex-col items-center rounded-2xl border p-4 text-center transition ${
                selected ? 'border-[#1f5bff] bg-[#f5f8ff] shadow-[0_0_0_3px_rgba(31,91,255,0.10)]' : 'border-slate-200 hover:border-[#9db4ff] hover:bg-[#fafbff]'
              }`}
              onClick={() => toggleCategory(category)}
              type="button"
            >
              <span
                className={`absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full ${
                  selected ? 'bg-[#1847ff] text-white' : 'border border-slate-300 bg-white text-transparent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" name="check" />
              </span>
              <Image alt="" className="h-16 w-16 object-contain" height={64} src={categoryIconFor(category.label)} width={64} />
              <span className="mt-2 text-[14px] font-bold leading-tight text-slate-900 [overflow-wrap:anywhere]">{categoryName(category.label)}</span>
              {category.subtitle ? <span className="mt-0.5 line-clamp-1 text-[12px] text-slate-500">{category.subtitle}</span> : null}
            </button>
          );
        })}
      </div>
      <button
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-3.5 text-left transition hover:border-[#1f5bff] hover:bg-[#f7f9ff]"
        onClick={addCustom}
        type="button"
      >
        <Image alt="" className="h-10 w-10 object-contain" height={40} src={categoryIconFor(CUSTOM)} width={40} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold text-slate-900">¿No está en el catálogo?</span>
          <span className="block text-[13px] text-slate-500">Agregá un producto a medida y describilo con tus palabras.</span>
        </span>
        <Icon className="h-5 w-5 text-[#1238d6]" name="plus" />
      </button>
      {showErrors && !productsOk ? <p className="mt-3 text-[13.5px] font-medium text-rose-600">Elegí al menos un producto.</p> : null}
    </div>
  );

  // ---------- Paso 2: Especificaciones (una pregunta por vez) ----------
  const specsStep =
    products.length === 0 ? (
      <div className={`${card} px-5 py-10 text-center`}>
        <p className="text-[14.5px] text-slate-600">Todavía no elegiste productos.</p>
        <button className="mt-3 text-[14px] font-semibold text-[#1238d6] hover:underline" onClick={() => goTo(1)} type="button">
          Ir a elegirlos
        </button>
      </div>
    ) : (
      <SpecsStep
        activeId={activeOpenId ?? products[0].id}
        fieldsByLine={fieldsByLine}
        missingByLine={missingByLine}
        onAddProduct={() => goTo(1)}
        onAllDone={handleContinue}
        onSelectProduct={(id) => setOpenId(id)}
        onSetSpec={setSpec}
        onUpdateLine={updateLine}
        products={products}
        showErrors={showErrors}
      />
    );

  // ---------- Paso 3: Entrega ----------
  const deliveryStep = (
    <div className={`${card} p-5 lg:p-6`}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_240px]">
        <label className="block">
          <Label required text="Dirección de entrega" />
          <input
            className={`${input} ${showErrors && !draft.address.trim() ? 'border-rose-400' : ''}`}
            onChange={(event) => update({ address: event.target.value })}
            placeholder="Calle y número, planta o depósito"
            value={draft.address}
          />
          {showErrors && !draft.address.trim() ? <ErrorText>Indicá la dirección.</ErrorText> : null}
        </label>
        <label className="block">
          <Label required text="Ciudad" />
          <input
            className={`${input} ${showErrors && !draft.city.trim() ? 'border-rose-400' : ''}`}
            onChange={(event) => update({ city: event.target.value })}
            placeholder="Ej.: Rosario"
            value={draft.city}
          />
          {showErrors && !draft.city.trim() ? <ErrorText>Indicá la ciudad.</ErrorText> : null}
        </label>
      </div>
      <div className="mt-5">
        <Label required text="¿Para cuándo lo necesitás?" />
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-4">
          {WHEN_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={`h-10 rounded-lg text-[14px] font-semibold transition ${
                draft.when === option.key ? 'bg-white text-[#1238d6] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => update({ when: option.key })}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        {draft.when === 'date' ? (
          <label className="mt-3 block max-w-[260px]">
            <Label required text="Fecha" />
            <input className={input} min={new Date().toISOString().slice(0, 10)} onChange={(event) => update({ date: event.target.value })} type="date" value={draft.date} />
            {showErrors && !draft.date ? <ErrorText>Elegí la fecha.</ErrorText> : null}
          </label>
        ) : null}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <Label text="¿Quién recibe?" />
          <input className={input} onChange={(event) => update({ contactName: event.target.value })} placeholder="Nombre" value={draft.contactName} />
        </label>
        <label className="block">
          <Label text="Teléfono" />
          <input className={input} inputMode="tel" onChange={(event) => update({ phone: event.target.value })} placeholder="Ej.: 341 555-1234" value={draft.phone} />
        </label>
      </div>
      <label className="mt-4 block">
        <Label text="Algo más que deban saber" />
        <textarea
          className={`${textareaClass} min-h-[76px]`}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder="Opcional: horario de recepción, forma de pago preferida, si necesitás factura A…"
          value={draft.notes}
        />
      </label>
    </div>
  );

  // ---------- Paso 4: Proveedores ----------
  const suppliersStep = (
    <div className={`${card} p-5 lg:p-6`}>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" name="search" />
        <input
          className={`${input} pl-10`}
          onChange={(event) => setProviderQuery(event.target.value)}
          placeholder="Buscar proveedor por nombre o ciudad"
          type="search"
          value={providerQuery}
        />
      </div>
      {providers === null ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[72px] animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : visibleProviders.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-6 text-center text-[13.5px] text-slate-500">No encontramos proveedores con esa búsqueda.</p>
      ) : (
        <ul className="mt-3 grid gap-2 2xl:grid-cols-2">
          {visibleProviders.map(({ provider, matches }) => {
            const checked = draft.supplierIds.includes(provider.id);
            return (
              <li key={provider.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                    checked ? 'border-[#1f5bff] bg-[#f5f8ff] shadow-[0_0_0_3px_rgba(31,91,255,0.10)]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    checked={checked}
                    className="h-5 w-5 shrink-0 accent-[#1847ff]"
                    onChange={() =>
                      update({ supplierIds: checked ? draft.supplierIds.filter((id) => id !== provider.id) : [...draft.supplierIds, provider.id] })
                    }
                    type="checkbox"
                  />
                  <SupplierAvatar name={provider.name} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14.5px] font-semibold text-slate-950">{provider.name}</span>
                      {provider.isVerified ? <Icon className="h-4 w-4 text-[#1f5bff]" name="verified" /> : null}
                    </span>
                    <span className="block truncate text-[12.5px] text-slate-500">
                      {[provider.city, provider.leadTimeDays ? `entrega en ~${provider.leadTimeDays} días` : null].filter(Boolean).join(' · ') || provider.category}
                    </span>
                  </span>
                  {matches > 0 ? <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-bold text-emerald-700">Sugerido</span> : null}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <label
        className={`mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
          draft.openToAll ? 'border-[#1f5bff] bg-[#f5f8ff]' : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <input checked={draft.openToAll} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1847ff]" onChange={(event) => update({ openToAll: event.target.checked })} type="checkbox" />
        <span>
          <span className="block text-[14px] font-semibold text-slate-900">Publicarla también para otros proveedores del rubro</span>
          <span className="block text-[12.5px] text-slate-500">Más propuestas para comparar. Si no, solo la ven los que elegiste.</span>
        </span>
      </label>
      {showErrors && !suppliersOk ? <p className="mt-2 text-[13px] font-medium text-rose-600">Elegí al menos un proveedor o publicala para el rubro.</p> : null}
    </div>
  );

  // ---------- Paso 5: Revisar ----------
  const reviewSection = (title: string, target: WizardStep, ok: boolean, body: ReactNode) => (
    <section className={card}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[15.5px] font-bold text-slate-950">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            <Icon className="h-3 w-3" name={ok ? 'check' : 'plus'} />
          </span>
          {title}
        </h2>
        <button className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#1238d6] hover:underline" onClick={() => goTo(target)} type="button">
          <Icon className="h-3.5 w-3.5" name="edit" />
          Cambiar
        </button>
      </div>
      <div className="px-5 py-3.5">{body}</div>
    </section>
  );

  const reviewStep = (
    <div className="space-y-3">
      {reviewSection(
        `Productos (${products.length})`,
        2,
        specsOk,
        <ul className="divide-y divide-slate-100">
          {products.map((line) => {
            const specs = [
              ...Object.entries(fixedSpecsFor(line.category)).map(([label, value]) => `${label}: ${value}`),
              ...(fieldsByLine[line.id] ?? [])
                .filter((spec) => (line.specs[spec.label] ?? '').trim())
                .map((spec) => `${spec.label}: ${line.specs[spec.label]}`),
            ];
            return (
              <li key={line.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Image alt="" className="h-10 w-10 shrink-0 object-contain" height={40} src={categoryIconFor(line.category)} width={40} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold text-slate-900">{line.name}</span>
                  {specs.length > 0 ? (
                    <span className="mt-0.5 block text-[13px] text-slate-600">
                      {specs.join(' · ')}
                    </span>
                  ) : null}
                  {line.details.trim() ? <span className="mt-0.5 block text-[13px] italic text-slate-500">“{line.details.trim()}”</span> : null}
                </span>
                <span className="shrink-0 text-[14px] font-bold text-slate-800">{quantityLabel(line)}</span>
              </li>
            );
          })}
        </ul>,
      )}
      {reviewSection(
        'Entrega',
        3,
        deliveryOk,
        <dl className="grid gap-x-6 gap-y-2.5 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-slate-500">Dirección</dt>
            <dd className="font-semibold text-slate-900">{[draft.address, draft.city].filter((value) => value.trim()).join(', ') || 'Falta completar'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-slate-500">Cuándo</dt>
            <dd className="font-semibold text-slate-900">{deliveryWhenLabel(draft)}</dd>
          </div>
          {draft.contactName.trim() || draft.phone.trim() ? (
            <div>
              <dt className="text-[12px] text-slate-500">Recibe</dt>
              <dd className="font-semibold text-slate-900">{[draft.contactName, draft.phone].filter((value) => value.trim()).join(' · ')}</dd>
            </div>
          ) : null}
          {draft.notes.trim() ? (
            <div className="sm:col-span-2">
              <dt className="text-[12px] text-slate-500">Notas</dt>
              <dd className="text-slate-800">{draft.notes}</dd>
            </div>
          ) : null}
        </dl>,
      )}
      {reviewSection(
        'Proveedores',
        4,
        suppliersOk,
        <div className="flex flex-wrap items-center gap-2">
          {selectedProviders.map((provider) => (
            <span key={provider.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-[13px] font-semibold text-slate-800">
              <SupplierAvatar name={provider.name} size={26} />
              {provider.name}
            </span>
          ))}
          {draft.openToAll ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3ff] px-3 py-1.5 text-[13px] font-semibold text-[#1238d6]">
              <Icon className="h-3.5 w-3.5" name="globe" />
              Abierta a proveedores del rubro
            </span>
          ) : null}
          {!suppliersOk ? <span className="text-[13.5px] text-rose-600">Falta elegir a quién enviarla.</span> : null}
        </div>,
      )}
      <p className="flex items-center gap-2 px-1 text-[12.5px] text-slate-500">
        <Icon className="h-3.5 w-3.5" name="lock" />
        Solo los proveedores elegidos ven tus datos de contacto.
      </p>
    </div>
  );

  const content = step === 1 ? productsStep : step === 2 ? specsStep : step === 3 ? deliveryStep : step === 4 ? suppliersStep : reviewStep;

  // ---------- Botones de navegación ----------
  const nextStep = step < 5 ? STEPS[step] : null;
  const prevStep = step > 1 ? STEPS[step - 2] : null;
  const actions = (
    <div className="flex items-center gap-3">
      {prevStep ? (
        <button className={secondaryButton} onClick={() => goTo(prevStep.key)} type="button">
          <Icon name="chev-left" />
          <span className="hidden sm:inline">{prevStep.label}</span>
        </button>
      ) : (
        <Link className={secondaryButton} href={BASE}>
          <Icon name="chev-left" />
          <span className="hidden sm:inline">Formas de empezar</span>
        </Link>
      )}
      <div className="flex-1" />
      {nextStep ? (
        <button className={`${primaryButton} max-sm:flex-1`} onClick={handleContinue} type="button">
          <span className="sm:hidden">Continuar</span>
          <span className="hidden sm:inline">Continuar a {nextStep.label.toLowerCase()}</span>
          <Icon name="arrow" />
        </button>
      ) : (
        <button className={`${primaryButton} max-sm:flex-1`} disabled={submitting} onClick={handleSubmit} type="button">
          {submitting ? 'Enviando…' : editId ? 'Guardar cambios' : 'Enviar solicitud'}
          {!submitting ? <Icon name="arrow" /> : null}
        </button>
      )}
    </div>
  );

  // ---------- Columna derecha: "Tu solicitud" + consejo ----------
  const tip: ReactNode =
    step === 1 ? (
      <>
        <b className="text-slate-950">Podés pedir varios productos juntos.</b> Cada proveedor cotiza lo que trabaja y después comparás todo en una sola pantalla.
      </>
    ) : step === 2 ? (
      <>
        <b className="text-slate-950">¿No está la opción que buscás?</b> Elegí «Otra» y escribila. Si no sabés un dato, tocá «No sé» y el proveedor te asesora en su propuesta.
      </>
    ) : step === 3 ? (
      <>
        <b className="text-slate-950">¿Sin apuro?</b> Con más plazo los proveedores pueden programar la producción y mejorar el precio.
      </>
    ) : step === 4 ? (
      <>
        <b className="text-slate-950">Con 3 o más proveedores</b> tenés con qué comparar.
      </>
    ) : (
      <>
        <b className="text-slate-950">Te avisamos</b> por notificación y mail cuando llegue cada propuesta.
      </>
    );

  const providerCount = matchingProviders > 0 ? matchingProviders : providers?.length ?? 0;

  const summary = (
    <aside className="space-y-4 lg:sticky lg:top-[80px]">
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-slate-950">Tu solicitud</h2>
          <button className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#1238d6] hover:underline" onClick={() => goTo(1)} type="button">
            <Icon className="h-3.5 w-3.5" name="plus" />
            Agregar
          </button>
        </div>
        {products.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-slate-500">Acá vas a ver lo que vayas eligiendo.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200">
            {products.map((line) => {
              const missing = missingByLine[line.id];
              return (
                <li key={line.id}>
                  <button
                    className="flex w-full items-center gap-3 py-3 text-left"
                    onClick={() => {
                      setOpenId(line.id);
                      if (step !== 2) goTo(2);
                    }}
                    type="button"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3f6fc]">
                      <Image alt="" className="h-8 w-8 object-contain" height={32} src={categoryIconFor(line.category)} width={32} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-bold text-slate-950">{line.name || 'Sin nombre'}</span>
                      <span className="block truncate text-[13px] text-slate-500">{quantityLabel(line)}</span>
                    </span>
                    {missing === 0 ? (
                      <Icon className="h-5 w-5 text-emerald-600" name="check" />
                    ) : (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-50 px-1.5 text-[12px] font-bold text-amber-700" title={`Faltan ${missing} datos`}>
                        {missing}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {providers && products.length > 0 && providerCount > 0 ? (
          <p className="mt-1 flex items-center gap-2 border-t border-slate-200 pt-3.5 text-[13.5px] text-slate-600">
            <Icon className="h-[18px] w-[18px] text-[#1f5bff]" name="building" />
            <span>
              <b className="text-slate-950">
                {providerCount} proveedor{providerCount === 1 ? '' : 'es'}
              </b>{' '}
              {matchingProviders > 0 ? 'trabajan estos productos' : 'en ATAR pueden cotizarlo'}
            </span>
          </p>
        ) : null}
      </div>
      <div className={`${card} flex items-start gap-3 p-4`}>
        <Image alt="" className="h-10 w-10 shrink-0 object-contain" height={40} src="/botatar.png?v=2" unoptimized width={40} />
        <p className="text-[14px] leading-relaxed text-slate-600">{tip}</p>
      </div>
    </aside>
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] pb-6 pt-1">
      <nav className="mb-4 flex items-center gap-2 text-[14px]">
        <Link className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900" href={editId ? `/dashboard/comprador/solicitudes/${editId}` : BASE}>
          <Icon name="chev-left" />
          {editId ? 'Solicitud' : 'Nueva solicitud'}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">{stepInfo.label}</span>
      </nav>

      {error ? <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{error}</p> : null}

      {/* Mobile: barra de avance en lugar de la columna de pasos. */}
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        {STEPS.map((item) => (
          <span key={item.key} className={`h-1.5 flex-1 rounded-full ${item.key < step ? 'bg-[#1f5bff]' : item.key === step ? 'bg-[#1f5bff]/50' : 'bg-slate-300'}`} />
        ))}
        <span className="shrink-0 text-[12.5px] font-semibold text-slate-600">Paso {step} de 5</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_300px] 2xl:grid-cols-[260px_minmax(0,1fr)_330px]">
        <div className="hidden lg:block">{stepper}</div>
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-slate-950 lg:text-[30px]">{stepInfo.title}</h1>
          <p className="mt-1 text-[15px] text-slate-600">{stepInfo.text}</p>
          {editId ? (
            <p className="mt-3 rounded-xl border border-[#c9d6ff] bg-[#f3f6ff] px-4 py-2.5 text-[13.5px] text-slate-700">
              Estás editando una solicitud ya enviada. Los proveedores ven los cambios cuando guardás.
            </p>
          ) : null}
          <div className="mt-5">{content}</div>
          <div className="sticky bottom-0 z-20 -mx-3 mt-5 border-t border-slate-200 bg-[#f4f6fb]/95 px-3 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            {actions}
          </div>
        </div>
        <div className="hidden xl:block">{summary}</div>
      </div>
    </div>
  );
}
