import AccessPanel from '@/components/auth/access-panel';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

export default function AccesoPage() {
  return (
    <main className="theme-public h-screen overflow-hidden bg-white text-slate-950">
      <div className="grid h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#070b1a] lg:flex">
          <Image alt="" className="object-cover object-[35%_center]" fill priority sizes="50vw" src="/hero-proveedores-atar.png" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,10,28,0.94)_0%,rgba(5,10,28,0.78)_50%,rgba(5,10,28,0.35)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,28,0.55)_0%,transparent_30%,transparent_65%,rgba(5,10,28,0.85)_100%)]" />

          {/* Volver al sitio: arriba a la izquierda, sobre la imagen. En mobile, donde
              la imagen no se muestra, el botón va arriba del formulario. */}
          <Link
            className="absolute left-8 top-8 z-10 inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-slate-950"
            href="/"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Volver a la web
          </Link>

          <div className="relative flex w-full flex-col justify-between px-14 pb-12 pt-28 xl:px-20">
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <Image alt="ATAR" height={40} src="/logoatar.png" width={40} />
                <p className="text-2xl font-bold tracking-[-0.02em] text-white">ATAR</p>
              </div>

              <h1 className="mt-12 text-[2.9rem] font-bold leading-[1.05] tracking-[-0.035em] text-white [text-shadow:0_2px_28px_rgba(5,10,28,0.55)] xl:text-[3.4rem]">
                La red comercial de la <span className="text-[#5b87ff]">industria de la rafia.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[17px] leading-7 text-white/75">
                Comprá, cotizá y gestioná proveedores verificados desde un único lugar.
              </p>
            </div>

            {/* Lo que se gana al entrar, en tarjetas de vidrio como las del inicio. */}
            <ul className="grid max-w-2xl gap-3 xl:grid-cols-3">
              {[
                { title: 'Proveedores verificados', text: 'Empresas con datos y capacidad revisados.' },
                { title: 'Cotizaciones comparables', text: 'Todas las respuestas en un mismo formato.' },
                { title: 'Chat directo', text: 'Hablás con la empresa, sin intermediarios.' },
              ].map((item) => (
                <li key={item.title} className="rounded-[18px] border border-white/15 bg-white/[0.07] p-4 backdrop-blur-md">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1f5bff] text-white">
                    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
                    </svg>
                  </span>
                  <p className="mt-3 text-[14px] font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-[12.5px] leading-5 text-white/60">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Columna + my-auto: centrado cuando entra, scrolleable cuando no. En mobile
            el botón de volver va arriba, en el flujo, para no tapar el título. */}
        <section className="relative flex h-full flex-col overflow-y-auto bg-[radial-gradient(circle_at_85%_10%,#e3ecff_0%,transparent_45%),linear-gradient(180deg,#f5f8ff_0%,#eef2fa_100%)] px-4 py-6 sm:px-6 lg:px-10">
          <Link
            className="mb-4 inline-flex h-10 shrink-0 items-center gap-2 self-start lg:hidden rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            href="/"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Volver a la web
          </Link>
          <div className="my-auto w-full">
            {/* En mobile no se ve el panel con la marca: el logo va arriba de la tarjeta. */}
            <div className="mb-5 flex items-center justify-center gap-2.5 lg:hidden">
              <Image alt="" height={32} src="/logoatar.png" width={32} />
              <span className="text-xl font-bold tracking-[-0.02em] text-[#0b1533]">ATAR</span>
            </div>
            {/* AccessPanel lee ?perfil= de la URL. */}
            <Suspense fallback={null}>
              <AccessPanel />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
