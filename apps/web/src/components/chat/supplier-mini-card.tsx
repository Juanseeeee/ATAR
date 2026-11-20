'use client';

import Link from 'next/link';
import CompanyLogo from '@/components/dashboard/company-logo';
import { useRegion } from '@/components/region/region-provider';
import { SUPPLIER_ROLE_LABELS, type SupplierDirectoryRecord } from '@/lib/atar-api';
import { getSupplierLocation } from '@/lib/provider-directory';

/**
 * Ficha chica del proveedor al costado del chat del cliente: quién es, qué
 * hace y sus condiciones, con accesos a su perfil y a pedirle una cotización.
 */
export default function SupplierMiniCard({
  supplier,
  fallbackName,
  fallbackLogoUrl,
  context,
}: {
  supplier: SupplierDirectoryRecord | null;
  fallbackName: string;
  fallbackLogoUrl: string | null;
  /** De qué trata la conversación (solicitud o cotización), con su enlace. */
  context?: { label: string; title: string; href: string } | null;
}) {
  const { categoryName } = useRegion();
  const name = supplier?.name ?? fallbackName;
  const products = supplier ? Array.from(new Set([...supplier.mainProducts, ...supplier.categories].map(categoryName))).slice(0, 5) : [];
  const facts = supplier
    ? [
        typeof supplier.leadTimeDays === 'number' ? { label: 'Entrega típica', value: `${supplier.leadTimeDays} días` } : null,
        typeof supplier.minimumOrder === 'number' ? { label: 'Pedido mínimo', value: supplier.minimumOrder.toLocaleString('es-AR') } : null,
        supplier.foundedYear ? { label: 'Desde', value: String(supplier.foundedYear) } : null,
        supplier.employeeRange ? { label: 'Empleados', value: supplier.employeeRange } : null,
      ].filter((item): item is { label: string; value: string } => Boolean(item))
    : [];

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-[#f8f9fc] p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
        <CompanyLogo
          className="mx-auto h-16 w-16"
          logoUrl={supplier?.logoUrl ?? fallbackLogoUrl}
          name={name}
          rounded="rounded-2xl"
          textClassName="text-[18px] font-bold"
          tone="border border-slate-200 bg-white text-indigo-600"
        />
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[15px] font-bold text-slate-950">
          <span className="truncate">{name}</span>
          {supplier?.isVerified ? (
            <svg aria-label="Verificado" className="h-4 w-4 shrink-0 text-indigo-600" fill="currentColor" role="img" viewBox="0 0 24 24">
              <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7.9-2.9-.9-2.9 2.5-1.7.9-2.9 3 .2z" />
            </svg>
          ) : null}
        </p>
        {supplier ? (
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {[supplier.supplierRole ? SUPPLIER_ROLE_LABELS[supplier.supplierRole] : 'Proveedor', getSupplierLocation(supplier.city, supplier.country)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        {supplier?.about || supplier?.description ? (
          <p className="mt-2.5 line-clamp-3 text-left text-[12.5px] leading-5 text-slate-600">{supplier.about ?? supplier.description}</p>
        ) : null}
        {supplier ? (
          <Link
            className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-300 text-[13px] font-semibold text-slate-800 transition hover:border-indigo-400 hover:text-indigo-700"
            href={`/dashboard/comprador/proveedores/${supplier.slug}`}
          >
            Ver perfil completo
          </Link>
        ) : null}
      </div>

      {context ? (
        <Link className="mt-3 block rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-indigo-300" href={context.href}>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{context.label}</span>
          <span className="mt-0.5 block truncate text-[13.5px] font-semibold text-slate-900">{context.title}</span>
          <span className="mt-1 inline-flex text-[12.5px] font-semibold text-indigo-600">Ver detalle →</span>
        </Link>
      ) : null}

      {facts.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <dt className="text-[11px] font-semibold text-slate-500">{fact.label}</dt>
              <dd className="mt-0.5 truncate text-[13px] font-bold text-slate-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {products.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Productos</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {products.map((product) => (
              <span key={product} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-700">
                {product}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {supplier?.certifications.length ? (
        <p className="mt-3 px-1 text-[12px] text-slate-500">
          <span className="font-semibold text-slate-700">Certificaciones:</span> {supplier.certifications.join(', ')}
        </p>
      ) : null}

      <Link
        className="mt-auto inline-flex h-10 w-full shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-[13.5px] font-bold text-white transition hover:bg-indigo-700"
        href={
          supplier?.categories[0]
            ? `/dashboard/comprador/solicitudes/nueva?category=${encodeURIComponent(supplier.categories[0])}`
            : '/dashboard/comprador/solicitudes/nueva'
        }
      >
        Pedirle una cotización
      </Link>
    </aside>
  );
}
