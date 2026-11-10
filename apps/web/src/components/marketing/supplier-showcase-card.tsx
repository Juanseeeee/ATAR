import Image from 'next/image';
import Link from 'next/link';
import CompanyLogo from '@/components/dashboard/company-logo';
import type { SupplierDirectoryRecord } from '@/lib/atar-api';
import { supplierLogoUrl } from '@/lib/supplier-logos';

/**
 * Tarjeta ancha de proveedor para la web pública: foto de portada con el sello
 * de verificado, logo, nombre, rubro principal y etiquetas con ícono.
 */


/** Portada según el primer rubro que coincide con lo que fabrica. */
const COVERS: { match: string[]; src: string }[] = [
  { match: ['big bag'], src: '/bigbags.png' },
  { match: ['rollo', 'tela', 'a medida', 'maquinaria'], src: '/telasweb.png' },
  { match: ['bolsa', 'saco'], src: '/bolsaspp.png' },
  { match: ['hilo', 'cuerda', 'cordon'], src: '/hilosweb.png' },
  { match: ['polipropileno', 'polietileno', 'polimero'], src: '/polimero.png' },
  { match: ['tinta', 'cinta'], src: '/tintas.png' },
];

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function coverFor(supplier: SupplierDirectoryRecord) {
  const haystack = normalize([...supplier.mainProducts, ...supplier.categories].join(' '));
  return COVERS.find((item) => item.match.some((word) => haystack.includes(word)))?.src ?? '/maquinariaweb.png';
}

type TagIcon = 'box' | 'layers' | 'scissors' | 'gear' | 'tag' | 'roll';

function iconFor(tag: string): TagIcon {
  const value = normalize(tag);
  if (value.includes('big bag')) return 'layers';
  if (value.includes('bolsa') || value.includes('saco')) return 'box';
  if (value.includes('medida')) return 'scissors';
  if (value.includes('maquin')) return 'gear';
  if (value.includes('tela') || value.includes('rollo')) return 'roll';
  return 'tag';
}

function TagGlyph({ name }: { name: TagIcon }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const paths: Record<TagIcon, React.ReactNode> = {
    box: (
      <>
        <path d="M21 8l-9-5-9 5 9 5 9-5z" {...s} />
        <path d="M3 8v8l9 5 9-5V8M12 13v8" {...s} />
      </>
    ),
    layers: (
      <>
        <path d="M12 3l9 5-9 5-9-5 9-5z" {...s} />
        <path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5" {...s} />
      </>
    ),
    scissors: (
      <>
        <circle cx="6" cy="6" r="3" {...s} />
        <circle cx="6" cy="18" r="3" {...s} />
        <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" {...s} />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" {...s} />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...s} />
      </>
    ),
    roll: (
      <>
        <ellipse cx="7" cy="12" rx="4" ry="7" {...s} />
        <path d="M7 5h10c2.2 0 4 3.1 4 7s-1.8 7-4 7H7" {...s} />
        <circle cx="7" cy="12" r="1.2" {...s} />
      </>
    ),
    tag: (
      <>
        <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" {...s} />
        <circle cx="7.5" cy="7.5" r="1.2" {...s} />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

function VerifiedBadge({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-label="Verificado" className={className} viewBox="0 0 24 24">
      <path
        d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7.9-2.9-.9-2.9 2.5-1.7.9-2.9 3 .2z"
        fill="#1f5bff"
      />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export default function SupplierShowcaseCard({ supplier }: { supplier: SupplierDirectoryRecord }) {
  const logoUrl = supplierLogoUrl(supplier);
  // Primero los productos terminados; las materias primas (polímeros) van al final.
  const isRawMaterial = (item: string) => /polipropileno|polietileno|polimero/.test(normalize(item));
  const products = [...supplier.mainProducts.filter((item) => !isRawMaterial(item)), ...supplier.mainProducts.filter(isRawMaterial)];
  const subtitle = products[0] ?? supplier.categories[0] ?? '';
  // Dos productos y el código de la empresa.
  const tags = products.slice(0, 2);
  if (supplier.genericCode) {
    tags.push(supplier.genericCode);
  }

  return (
    <Link
      className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#e3e8f4] bg-white shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(24,71,255,0.12)]"
      href={`/productos/${supplier.slug}`}
    >
      <div className="relative h-40 overflow-hidden sm:h-44">
        <Image
          alt=""
          className="object-cover transition duration-700 group-hover:scale-105"
          fill
          sizes="(min-width:1024px) 45vw, 100vw"
          src={coverFor(supplier)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,21,51,0.1)_0%,transparent_45%)]" />
        {supplier.isVerified ? (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-[13px] font-semibold text-[#0b1533] shadow-[0_6px_16px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <VerifiedBadge className="h-4 w-4" />
            Proveedor verificado
          </span>
        ) : null}
      </div>

      {/* El panel blanco se monta un poco sobre la foto. */}
      <div className="relative -mt-4 flex flex-1 items-start gap-4 rounded-t-[22px] bg-white px-5 pb-5 pt-5 sm:gap-5 sm:px-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] border border-[#eef1f7] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)] sm:h-[72px] sm:w-[72px]">
          {logoUrl ? (
            <Image alt={`Logo de ${supplier.name}`} className="h-12 w-12 object-contain sm:h-14 sm:w-14" height={56} src={logoUrl} width={56} />
          ) : (
            <CompanyLogo className="h-12 w-12" logoUrl={null} name={supplier.name} rounded="rounded-[12px]" textClassName="text-[15px]" tone="bg-[#eef3ff] text-[#1f5bff]" />
          )}
        </div>
        <span aria-hidden="true" className="hidden w-px self-stretch bg-[#e6eaf3] sm:block" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-2 text-[18px] font-bold leading-tight tracking-[-0.02em] text-[#0b1533] sm:text-[22px]">
                <span className="truncate">{supplier.name}</span>
                {supplier.isVerified ? <VerifiedBadge className="h-5 w-5 shrink-0" /> : null}
              </p>
              {subtitle ? <p className="mt-1 truncate text-[15px] text-slate-500">{subtitle}</p> : null}
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#1f5bff] sm:h-11 sm:w-11 text-white shadow-[0_8px_20px_rgba(31,91,255,0.35)] transition group-hover:translate-x-0.5 group-hover:bg-[#194ee6]">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </span>
          </div>
          {tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e8f4] bg-white px-3 py-1.5 text-[13px] font-medium text-[#0b1533]"
                >
                  <span className="text-[#1f3fd6]">
                    <TagGlyph name={iconFor(tag)} />
                  </span>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
