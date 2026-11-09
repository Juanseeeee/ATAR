'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRegion } from '@/components/region/region-provider';
import Reveal from '@/components/ui/reveal';
import { type HomeCardKey, homeCardText } from '@/lib/regional-terms';

// Título y bajada salen de lib/regional-terms según el país elegido.
const CATEGORIES: { key: HomeCardKey; img: string; href: string }[] = [
  { key: 'telas', img: '/categorias/cat5-telas.png', href: '/productos?q=Telas' },
  { key: 'sacos', img: '/categorias/cat5-sacos.png', href: '/productos?q=Bolsas' },
  { key: 'maquinaria', img: '/categorias/cat5-maquinaria.png', href: '/productos?q=Maquinaria' },
  { key: 'bigbags', img: '/categorias/cat5-bigbags.png', href: '/productos?q=Big%20Bags' },
  { key: 'insumos', img: '/categorias/cat5-insumos.png', href: '/productos' },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} />
    </svg>
  );
}

/** Tarjetas de categorías del inicio, con los nombres del país elegido. */
export default function HomeCategories() {
  const { region } = useRegion();
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-5">
      {CATEGORIES.map((item, index) => {
        const cat = { ...item, ...homeCardText(item.key, region ?? null) };
        return (
        <Reveal key={cat.key} delay={index * 80}>
        <Link
          className="group flex h-full flex-col rounded-[22px] border border-[#e3e8f4] bg-[linear-gradient(180deg,#f8faff_0%,#eff3fc_100%)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#c9d5f5] hover:shadow-[0_18px_40px_rgba(24,71,255,0.10)] sm:p-5"
          href={cat.href}
        >
          <div className="relative aspect-[5/4]">
            <Image
              alt={cat.title}
              className="object-contain transition duration-500 group-hover:scale-105"
              fill
              sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw"
              src={cat.img}
            />
          </div>
          <p className="mt-4 text-[17px] font-bold leading-tight tracking-[-0.02em] text-[#0b1533] sm:text-[20px] xl:text-[24px]">{cat.title}</p>
          <div className="mt-1.5 flex flex-1 items-start justify-between gap-2">
            <p className="text-[13px] leading-5 text-slate-500 sm:text-[14px] xl:text-[15px] xl:leading-6">{cat.text}</p>
            <span className="flex self-end h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e3e8f4] bg-white text-[#1f3fd6] shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition group-hover:translate-x-0.5 group-hover:border-[#1f5bff] sm:h-9 sm:w-9">
              <ArrowIcon />
            </span>
          </div>
        </Link>
        </Reveal>
        );
      })}
    </div>
  );
}
