import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/ui/reveal';
import ActionGuide from './action-guide';
import VideoTrigger from './video-trigger';

/* ============================ ICONOS ============================ */

type IconName =
  | 'arrow'
  | 'play'
  | 'search'
  | 'doc'
  | 'chat'
  | 'handshake'
  | 'shield'
  | 'clock'
  | 'chart'
  | 'gear'
  | 'lock'
  | 'globe'
  | 'building'
  | 'box'
  | 'quote'
  | 'check';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...s} />,
    play: <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" {...s} />
        <path d="M21 21l-4.3-4.3" {...s} />
      </>
    ),
    doc: (
      <>
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" {...s} />
        <path d="M14 3v5h5M9 13h6M9 17h4" {...s} />
      </>
    ),
    chat: (
      <>
        <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" {...s} />
        <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" {...s} />
      </>
    ),
    handshake: (
      <>
        <path d="M11 17l2 2a1.4 1.4 0 002-2M13 15l2.5 2.5a1.4 1.4 0 002-2L14 12" {...s} />
        <path d="M14 12l-2.5-2.5a1.5 1.5 0 00-2 0L8 11a1.4 1.4 0 01-2-2l3.2-3.2a3 3 0 013.6-.5L15 6.5l3-1.5 3 6-2.5 1.5" {...s} />
        <path d="M3 5l3 6-1.5 1.5L9 17a1.4 1.4 0 002-2" {...s} />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s} />
        <path d="M9 12l2 2 4-4" {...s} />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" {...s} />
        <path d="M12 7v5l3 2" {...s} />
      </>
    ),
    chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2M16 8l3-3 3 3" {...s} />,
    gear: (
      <>
        <circle cx="12" cy="12" r="3" {...s} />
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" {...s} />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" {...s} />
        <path d="M8 11V7a4 4 0 018 0v4" {...s} />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" {...s} />
        <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" {...s} />
      </>
    ),
    building: (
      <>
        <path d="M3 21h18M6 21V4h9v17M15 21V9h4v12" {...s} />
        <path d="M9 8h3M9 12h3M9 16h3" {...s} />
      </>
    ),
    box: (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" {...s} />
        <path d="M3.3 7.3L12 12l8.7-4.7M12 22V12" {...s} />
      </>
    ),
    quote: (
      <>
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" {...s} />
        <path d="M9 15l2 2 4-4" {...s} />
      </>
    ),
    check: <path d="M5 12.5l4.5 4.5L19 7.5" {...s} strokeWidth={2.4} />,
  };
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

/* ============================ DATA ============================ */

const STEPS: { n: number; title: string; text: string; icon: IconName }[] = [
  { n: 1, title: 'Buscá', text: 'Explorá productos, proveedores o publicá tu necesidad de producción.', icon: 'search' },
  { n: 2, title: 'Compará', text: 'Analizá opciones, revisá especificaciones y conocé empresas verificadas.', icon: 'doc' },
  { n: 3, title: 'Solicitá cotizaciones', text: 'Enviá tu consulta a uno o varios proveedores desde la plataforma.', icon: 'chat' },
  { n: 4, title: 'Hacé negocios', text: 'Recibí propuestas, conversá con las empresas y cerrá tu compra.', icon: 'handshake' },
];

const FAQ: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: 'General',
    items: [
      { q: '¿Qué es ATAR?', a: 'Un marketplace B2B para la industria de la rafia y el polipropileno. Conecta a empresas que compran con proveedores de bolsones, bolsas, telas, hilos, insumos y maquinaria.' },
      { q: '¿Tiene costo pedir cotizaciones?', a: 'No. Pedir cotizaciones es gratis y no te obliga a comprar: recibís las propuestas y decidís si avanzás.' },
      { q: '¿En qué países funciona?', a: 'En Argentina y el resto de Latinoamérica. Elegís tu país arriba a la derecha y los productos aparecen con el nombre que se usa allí (por ejemplo, bolsones, maxisacos o súper sacos).' },
    ],
  },
  {
    title: 'Para clientes',
    items: [
      { q: '¿Cómo pido una cotización?', a: 'Desde “Solicitar cotización” podés elegir productos del catálogo, contárselo a ATARIA, subir una planilla o describir un producto a medida. Después respondés unas preguntas simples, indicás la entrega y elegís a quién enviarla.' },
      { q: '¿Puedo pedir varios productos en la misma solicitud?', a: 'Sí. Agregás todos los productos que necesitás y cada proveedor cotiza los que trabaja. Después comparás todo en una sola pantalla.' },
      { q: '¿Qué hago si no sé un dato técnico?', a: 'En cada pregunta podés elegir “No sé, a definir”. El proveedor lo tiene en cuenta y te asesora en su propuesta.' },
      { q: '¿A quién le llega mi solicitud?', a: 'A los proveedores que elijas. Si querés, también podés abrirla a todos los proveedores del rubro para recibir más propuestas.' },
      { q: '¿Necesito una cuenta para hablar con ATARIA?', a: 'No. En la página de Productos podés charlar con ATARIA sin registrarte: te dice qué proveedores trabajan lo que buscás. Para enviar la solicitud sí necesitás tu cuenta, y lo que le contaste queda cargado.' },
    ],
  },
  {
    title: 'Para proveedores',
    items: [
      { q: '¿Cómo recibo solicitudes?', a: 'Te llegan las solicitudes de los rubros que trabajás y las que te envían directamente. Las respondés desde tu panel con precio y condiciones.' },
      { q: '¿Cómo aparezco en las búsquedas?', a: 'Completá tu perfil con los productos que fabricás o vendés y tu localidad. Los clientes te encuentran por producto, por provincia y por cercanía.' },
    ],
  },
];

// globals.css fija `a { color: inherit }` fuera de las capas de Tailwind: en
// los <Link> el color del texto va en un <span> hijo.
const primaryCta =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#1f5bff] px-6 text-sm font-semibold shadow-[0_14px_36px_rgba(31,91,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#194ee6]';

/* ============================ PASOS: ilustraciones ============================ */

const STEP_IMAGES: Record<number, { src: string; alt: string }> = {
  1: { src: '/como-funciona/paso-busca-v2.png', alt: 'Buscador de ATAR con Big Bags, rafia y telas' },
  2: { src: '/como-funciona/paso-compara-v2.png', alt: 'Big Bags de distintos proveedores verificados' },
  3: { src: '/como-funciona/paso-solicita-v2.png', alt: 'Formulario para solicitar cotización a varios proveedores' },
  4: { src: '/como-funciona/paso-negocios-v2.png', alt: 'Apretón de manos frente a Big Bags en un depósito' },
};

function StepVisual({ step }: { step: number }) {
  const image = STEP_IMAGES[step];
  return (
    <div className="relative aspect-square overflow-hidden rounded-[14px] bg-[#eef3ff]">
      <Image alt={image.alt} className="object-cover" fill sizes="(min-width:1024px) 22vw, (min-width:640px) 45vw, 78vw" src={image.src} />
    </div>
  );
}

/* ============================ PÁGINA ============================ */

export default function ComoFuncionaPage() {
  return (
    <main className="bg-white text-slate-950">
      {/* ==================== HERO ==================== */}
      <section className="relative isolate overflow-hidden bg-[#0b1530] text-white">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[66%]">
          <Image alt="" className="animate-hero-zoom object-cover object-center" fill priority sizes="(min-width:1024px) 66vw, 100vw" src="/maquinariaweb.png" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b1530_0%,#0b1530_32%,rgba(11,21,48,0.8)_46%,rgba(11,21,48,0.35)_66%,rgba(11,21,48,0.2)_100%)]" />
        <div className="absolute inset-0 bg-[#0b1530]/55 lg:hidden" />

        <div className="relative z-10 mx-auto grid min-h-[540px] w-full max-w-[1440px] items-center gap-10 px-6 py-16 lg:min-h-[600px] lg:grid-cols-[1fr_0.8fr] lg:px-12">
          <div className="max-w-[640px]">
            <h1 className="animate-fade-up text-[2.6rem] font-bold leading-[1.04] tracking-[-0.04em] [animation-delay:100ms] sm:text-[3.4rem] xl:text-[3.9rem]">
              Conectamos a toda <br className="hidden sm:block" />
              la industria de la rafia <br className="hidden sm:block" />
              <span className="text-[#3b7bff]">en simples pasos.</span>
            </h1>
            <p className="animate-fade-up mt-5 max-w-[520px] text-[17px] leading-7 text-white/80 [animation-delay:200ms]">
              Encontrá proveedores, solicitá cotizaciones y compará opciones para tus proyectos industriales.
            </p>
            <div className="animate-fade-up mt-8 flex flex-col gap-3 [animation-delay:300ms] sm:flex-row">
              <VideoTrigger className={`${primaryCta} text-white`}>
                Ver video (1 min)
                <Icon name="play" className="h-4 w-4" />
              </VideoTrigger>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-white/50 px-6 text-sm font-semibold transition hover:bg-white/10"
                href="/acceso?modo=registro"
              >
                <span className="inline-flex items-center gap-2 text-white">
                  Crear cuenta
                  <Icon name="arrow" className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="animate-fade-up hidden justify-center [animation-delay:500ms] lg:flex">
            <VideoTrigger className="group flex flex-col items-center gap-4 text-center">
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white text-[#0b1530] shadow-[0_18px_50px_rgba(0,0,0,0.4)] transition group-hover:scale-105">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/40 [animation-duration:2.4s]" />
                <Icon name="play" className="relative ml-1 h-9 w-9" />
              </span>
              <span className="text-[15px] font-medium leading-6 text-white drop-shadow">
                Conocé cómo funciona ATAR
                <br />
                en 1 minuto
              </span>
            </VideoTrigger>
          </div>
        </div>
      </section>

      {/* ==================== PASO A PASO ==================== */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-12 lg:py-20">
          <Reveal className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#0b1530] sm:text-[2.5rem]">Cómo funciona</h2>
            </div>
            <p className="max-w-[440px] text-[15px] leading-6 text-slate-600">
              Un proceso simple, pensado para que empresas de la industria puedan conectarse y hacer negocios más rápido.
            </p>
          </Reveal>

          {/* En mobile los pasos van uno debajo del otro, unidos por una línea;
              desde sm, grilla de 2 y desde lg de 4. */}
          <div className="relative mt-10 grid gap-12 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-6">
            <span aria-hidden="true" className="absolute bottom-10 left-[22px] top-14 w-px bg-[linear-gradient(180deg,#c4d4ff,#c4d4ff_70%,transparent)] sm:hidden" />
            {STEPS.map((step, index) => (
              <Reveal key={step.n} className="group relative flex flex-col pl-14 sm:pl-0" delay={index * 120}>
                {/* Mobile: número en un círculo sobre la línea del recorrido. */}
                <span className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-[#1f5bff] text-[17px] font-bold text-white shadow-[0_8px_18px_rgba(31,91,255,0.3)] ring-4 ring-white sm:hidden">
                  {step.n}
                </span>
                <div className="flex items-end gap-3">
                  <span className="hidden text-[64px] font-bold leading-[0.8] tracking-[-0.04em] text-[#dfe8ff] transition duration-300 group-hover:text-[#b9cbff] sm:inline">
                    {step.n}
                  </span>
                  <Icon name={step.icon} className="h-7 w-7 text-[#1f5bff] transition duration-300 group-hover:-translate-y-1 sm:mb-1 sm:h-8 sm:w-8" />
                </div>
                <h3 className="mt-2 text-[19px] font-bold text-[#0b1530] sm:mt-3">{step.title}</h3>
                <p className="mt-1.5 text-[14px] leading-6 text-slate-500 sm:min-h-[72px]">{step.text}</p>
                <div className="mt-4 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  <StepVisual step={step.n} />
                </div>
                {index < STEPS.length - 1 ? (
                  <span className="absolute -right-5 top-[88px] hidden text-[#1f5bff] lg:block">
                    <Icon name="arrow" className="h-5 w-5" />
                  </span>
                ) : null}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== GUÍA EN VIDEO ==================== */}
      <section className="bg-[#f5f7fc]" id="guia">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-12 lg:py-20">
          <Reveal className="max-w-[640px]">
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#0b1530] sm:text-[2.5rem]">Guía en video</h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">Videos cortos, grabados sobre la plataforma, para cada cosa que podés hacer en ATAR.</p>
          </Reveal>
          <Reveal className="mt-10" delay={100}>
            <ActionGuide />
          </Reveal>
        </div>
      </section>

      {/* ==================== PREGUNTAS FRECUENTES ==================== */}
      <section className="bg-white" id="preguntas-frecuentes">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-20">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#0b1530] sm:text-[2.5rem]">Preguntas frecuentes</h2>
            <p className="mt-3 max-w-[420px] text-[15px] leading-7 text-slate-600">
              ¿Te queda alguna duda? Escribinos desde{' '}
              <Link className="font-semibold" href="/contacto">
                <span className="text-[#1f5bff] hover:underline">Contacto</span>
              </Link>{' '}
              o preguntale a ATARIA en Productos.
            </p>
          </Reveal>
          <div className="space-y-8">
            {FAQ.map((group) => (
              <Reveal key={group.title}>
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#1f5bff]">{group.title}</p>
                <div className="mt-3 divide-y divide-slate-200 rounded-[16px] border border-slate-200 bg-white">
                  {group.items.map((item) => (
                    <details key={item.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-[#0b1530]">
                        {item.q}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#1f5bff] transition group-open:rotate-45">
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
                          </svg>
                        </span>
                      </summary>
                      <p className="pb-5 pr-10 text-[14px] leading-6 text-slate-600">{item.a}</p>
                    </details>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
