'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Guía en video: un clip corto por cada acción de la plataforma, grabado sobre
 * la app real. Los videos viven en /public/guia (`<id>.webm`, con su portada
 * `<id>.png`) y se cargan recién al abrir cada uno.
 */

type Guide = { id: string; title: string; text: string; duration: string };

const GROUPS: { title: string; text: string; guides: Guide[] }[] = [
  {
    title: 'Para clientes',
    text: 'Comprá a proveedores verificados de la industria.',
    guides: [
      { id: 'crear-cuenta', title: 'Crear tu cuenta', text: 'Elegí tu perfil y registrá tu empresa.', duration: '0:20' },
      { id: 'buscar-proveedores', title: 'Buscar proveedores', text: 'Filtrá por producto y por localidad.', duration: '0:19' },
      { id: 'pedir-cotizacion', title: 'Pedir una cotización', text: 'Elegí productos y respondé las especificaciones.', duration: '0:35' },
      { id: 'comparar-cotizaciones', title: 'Comparar cotizaciones', text: 'Mirá las propuestas lado a lado y elegí.', duration: '0:16' },
      { id: 'ataria', title: 'Charlar con ATARIA', text: 'Contale qué necesitás y te sugiere proveedores.', duration: '0:16' },
    ],
  },
  {
    title: 'Para proveedores',
    text: 'Recibí pedidos de clientes de todo el país.',
    guides: [
      { id: 'responder-solicitud', title: 'Responder una solicitud', text: 'Cotizá las solicitudes de tu rubro.', duration: '0:18' },
      { id: 'gestionar-pedidos', title: 'Gestionar tus pedidos', text: 'Seguí cada pedido hasta la entrega.', duration: '0:11' },
    ],
  },
];

function PlayIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

export default function ActionGuide() {
  const [playing, setPlaying] = useState<Guide | null>(null);

  useEffect(() => {
    if (!playing) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setPlaying(null);
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [playing]);

  return (
    <>
      <div className="space-y-12">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="text-[20px] font-bold tracking-[-0.02em] text-[#0b1530]">{group.title}</h3>
              <p className="text-[14px] text-slate-500">{group.text}</p>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.guides.map((guide, index) => (
                <button
                  key={guide.id}
                  className="group flex flex-col overflow-hidden rounded-[16px] border border-[#e3e8f4] bg-white text-left shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#c9d5f5] hover:shadow-[0_18px_40px_rgba(24,71,255,0.12)]"
                  onClick={() => setPlaying(guide)}
                  type="button"
                >
                  <span className="relative block aspect-[16/10] overflow-hidden bg-[#eef3ff]">
                    <Image
                      alt=""
                      className="object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                      fill
                      sizes="(min-width:1280px) 22vw, (min-width:640px) 45vw, 90vw"
                      src={`/guia/${guide.id}.png`}
                    />
                    <span className="absolute inset-0 bg-[#0b1530]/15 transition group-hover:bg-[#0b1530]/25" />
                    <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1f5bff] shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition group-hover:scale-110">
                      <PlayIcon className="ml-0.5 h-5 w-5" />
                    </span>
                    <span className="absolute bottom-2 right-2 rounded-md bg-[#0b1530]/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">{guide.duration}</span>
                  </span>
                  <span className="flex flex-1 items-start gap-3 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[13px] font-bold text-[#1f5bff]">{index + 1}</span>
                    <span>
                      <span className="block text-[15px] font-bold text-[#0b1530]">{guide.title}</span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-slate-500">{guide.text}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {playing
        ? createPortal(
            <div
              aria-label={`Video: ${playing.title}`}
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#050914]/85 p-4 backdrop-blur-sm"
              onClick={() => setPlaying(null)}
              role="dialog"
            >
              <div className="w-full max-w-[1100px]" onClick={(event) => event.stopPropagation()}>
                <div className="mb-3 flex items-center justify-between gap-3 text-white">
                  <p className="text-[16px] font-semibold">{playing.title}</p>
                  <button
                    aria-label="Cerrar video"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                    onClick={() => setPlaying(null)}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
                <video
                  autoPlay
                  className="aspect-[16/10] w-full rounded-[14px] bg-black shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
                  controls
                  playsInline
                  poster={`/guia/${playing.id}.png`}
                  src={`/guia/${playing.id}.webm`}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
