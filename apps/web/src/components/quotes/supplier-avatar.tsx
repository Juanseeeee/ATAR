import Image from 'next/image';
import { supplierInitials, supplierLogoFor } from '@/lib/quote-compare';

const TONES = [
  'bg-emerald-50 text-emerald-700',
  'bg-[#eef3ff] text-[#1238d6]',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
  'bg-cyan-50 text-cyan-700',
];

function toneFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

/** Logo de la empresa proveedora, o sus iniciales si todavía no cargó uno. */
export function SupplierAvatar({ name, size = 44 }: { name: string | undefined | null; size?: number }) {
  const label = name ?? 'Proveedor';
  const logo = supplierLogoFor(label);
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-slate-200 text-[13px] font-extrabold ${
        logo ? 'bg-white' : toneFor(label)
      }`}
      style={{ width: size, height: size }}
    >
      {logo ? (
        <Image alt="" height={size - 10} src={logo} width={size - 10} />
      ) : (
        supplierInitials(label)
      )}
    </span>
  );
}
