import Image from 'next/image';
import Link from 'next/link';
import HomeCategories from '@/components/home/home-categories';
import LatamMap from '@/components/home/latam-map';
import { TRUST_LOGOS, TrustLogoItem } from '@/components/home/trust-logos';
import LandingAuthRedirect from '@/components/layout/landing-auth-redirect';
import CountUp from '@/components/ui/count-up';
import Reveal from '@/components/ui/reveal';


/* ============================ ICONOS ============================ */

type IconName =
  | 'arrow'
  | 'search'
  | 'doc'
  | 'chat'
  | 'check-circle'
  | 'shield'
  | 'bolt'
  | 'truck'
  | 'users'
  | 'box'
  | 'globe'
  | 'cart'
  | 'factory'
  | 'zap'
  | 'layers';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...s} />,
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
    'check-circle': (
      <>
        <circle cx="12" cy="12" r="9" {...s} />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" {...s} />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s} />
        <path d="M9 12l2 2 4-4" {...s} />
      </>
    ),
    bolt: (
      <>
        <rect x="3" y="5" width="13" height="14" rx="2" {...s} />
        <path d="M16 9h2.5L21 12v5h-5M7 9h5M7 13h3" {...s} />
      </>
    ),
    truck: (
      <>
        <path d="M2 6h12v10H2zM14 9h4l4 4v3h-8" {...s} />
        <circle cx="6" cy="18" r="2" {...s} />
        <circle cx="18" cy="18" r="2" {...s} />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" {...s} />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0116 11" {...s} />
      </>
    ),
    box: (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" {...s} />
        <path d="M3.3 7.3L12 12l8.7-4.7M12 22V12" {...s} />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" {...s} />
        <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" {...s} />
      </>
    ),
    cart: (
      <>
        <path d="M2.5 4h2.6l2.3 10.5h10.8l2.3-7.5H6.2" {...s} />
        <circle cx="9" cy="19" r="1.5" {...s} />
        <circle cx="17" cy="19" r="1.5" {...s} />
      </>
    ),
    factory: (
      <>
        <path d="M3 21V10l5 3v-3l5 3V8h3V4h3v17H3z" {...s} />
        <path d="M7 17h2M11 17h2M15 17h2" {...s} />
      </>
    ),
    zap: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" {...s} />,
    layers: (
      <>
        <path d="M12 3l9 5-9 5-9-5 9-5z" {...s} />
        <path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5" {...s} />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

/* ============================ BANDERAS ============================ */

type FlagName = 'ar' | 'uy' | 'br' | 'bo' | 'cl' | 'pe' | 'py';

function Flag({ name }: { name: FlagName }) {
  const flags: Record<FlagName, React.ReactNode> = {
    ar: (
      <>
        <rect width="24" height="24" fill="#74acdf" />
        <rect y="8" width="24" height="8" fill="#fff" />
        <circle cx="12" cy="12" r="2" fill="#f6b40e" />
      </>
    ),
    uy: (
      <>
        <rect width="24" height="24" fill="#fff" />
        <rect y="5" width="24" height="3" fill="#0038a8" />
        <rect y="11" width="24" height="3" fill="#0038a8" />
        <rect y="17" width="24" height="3" fill="#0038a8" />
        <rect width="11" height="11" fill="#fff" />
        <circle cx="5.5" cy="5.5" r="2.6" fill="#fcd116" />
      </>
    ),
    br: (
      <>
        <rect width="24" height="24" fill="#009c3b" />
        <path d="M12 4l9 8-9 8-9-8z" fill="#ffdf00" />
        <circle cx="12" cy="12" r="3.8" fill="#002776" />
      </>
    ),
    bo: (
      <>
        <rect width="24" height="8" fill="#d52b1e" />
        <rect y="8" width="24" height="8" fill="#f9e300" />
        <rect y="16" width="24" height="8" fill="#007934" />
      </>
    ),
    cl: (
      <>
        <rect width="24" height="12" fill="#fff" />
        <rect y="12" width="24" height="12" fill="#d52b1e" />
        <rect width="10" height="12" fill="#0039a6" />
        <circle cx="5" cy="6" r="1.6" fill="#fff" />
      </>
    ),
    pe: (
      <>
        <rect width="24" height="24" fill="#fff" />
        <rect width="8" height="24" fill="#d91023" />
        <rect x="16" width="8" height="24" fill="#d91023" />
      </>
    ),
    py: (
      <>
        <rect width="24" height="8" fill="#d52b1e" />
        <rect y="8" width="24" height="8" fill="#fff" />
        <rect y="16" width="24" height="8" fill="#0038a8" />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200" viewBox="0 0 24 24">
      <clipPath id={`flag-${name}`}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#flag-${name})`}>{flags[name]}</g>
    </svg>
  );
}

/* ============================ DATA ============================ */

const HERO_FEATURES: { icon: IconName; text: string }[] = [
  { icon: 'shield', text: 'Proveedores verificados' },
  { icon: 'zap', text: 'Cotizaciones en minutos' },
  { icon: 'layers', text: 'Toda la cadena en un solo lugar' },
];


const STEPS: { label: string; text: string; icon: IconName }[] = [
  { label: 'Buscá', text: 'Encontrá productos o proveedores.', icon: 'search' },
  { label: 'Solicitá', text: 'Enviá tu cotización con los detalles que necesitás.', icon: 'doc' },
  { label: 'Compará', text: 'Recibí propuestas de empresas verificadas.', icon: 'chat' },
  { label: 'Elegí y avanzá', text: 'Seleccioná la mejor opción y concretá tu compra.', icon: 'check-circle' },
];

const STATS: { v: string; l: string; icon: IconName }[] = [
  { v: '450+', l: 'empresas verificadas', icon: 'users' },
  { v: '12.000+', l: 'productos publicados', icon: 'box' },
  { v: '38.000+', l: 'cotizaciones gestionadas', icon: 'chat' },
  { v: '8', l: 'países de la región', icon: 'globe' },
];

const COUNTRIES: { name: string; flag: FlagName | null }[] = [
  { name: 'Argentina', flag: 'ar' },
  { name: 'Uruguay', flag: 'uy' },
  { name: 'Brasil', flag: 'br' },
  { name: 'Bolivia', flag: 'bo' },
  { name: 'Chile', flag: 'cl' },
  { name: 'Perú', flag: 'pe' },
  { name: 'Paraguay', flag: 'py' },
  { name: 'Otros', flag: null },
];

// globals.css fija `a { color: inherit }` fuera de las capas de Tailwind, así
// que en los <Link> el color del texto va en un <span> hijo.
// Accesos del hero. El perfil viaja a /acceso, que abre el registro con ese
// perfil preseleccionado (ver AccessPanel).
// Cada perfil lleva su color (el mismo que usa su panel en la plataforma).
const HERO_ROLES: { label: string; hint: string; href: string; icon: IconName; color: string }[] = [
  { label: 'Cliente', hint: 'Quiero comprar', href: '/acceso?perfil=cliente', icon: 'cart', color: 'text-[#1f5bff]' },
  { label: 'Vendedor', hint: 'Trabajo para una empresa', href: '/acceso?perfil=vendedor', icon: 'users', color: 'text-[#16a34a]' },
  { label: 'Proveedor', hint: 'Quiero vender mis productos', href: '/acceso?perfil=proveedor', icon: 'factory', color: 'text-[#3450b0]' },
];

const primaryCta =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#1f5bff] px-6 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(31,91,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#194ee6] hover:shadow-[0_18px_42px_rgba(31,91,255,0.45)]';

/* ============================ HOME ============================ */

export default function Home() {
  return (
    <main className="bg-white text-slate-950">
      <LandingAuthRedirect />

      {/* ==================== HERO ==================== */}
      {/* Sube 69 px (el alto del header) para quedar detrás del header translúcido: los dos comparten el mismo fondo. */}
      <section className="relative isolate -mt-[69px] overflow-hidden bg-[linear-gradient(160deg,#f4f7ff_0%,#e8eefc_55%,#dfe8fb_100%)] pt-[69px] text-slate-950">
        {/* Manchas de luz azul: dan profundidad al fondo y algo que el vidrio de los botones pueda desenfocar. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-[#9db8ff]/45 blur-[110px]" />
          <div className="absolute bottom-[-20%] left-[30%] h-[460px] w-[460px] rounded-full bg-[#b9ccff]/50 blur-[120px]" />
          <div className="absolute right-[-10%] top-[10%] h-[560px] w-[560px] rounded-full bg-[#c9d8ff]/60 blur-[120px]" />
        </div>

        {/* Emblema de ATAR armado con fotos (PNG con fondo transparente). */}
        <div className="relative mx-auto h-[300px] w-full max-w-[520px] sm:h-[400px] lg:absolute lg:right-[3%] lg:top-1/2 lg:h-auto lg:w-[40%] lg:max-w-[860px] lg:-translate-y-1/2 lg:aspect-[1333/1180] min-[1400px]:w-[45%]">
          <Image alt="" className="animate-fade-up object-contain drop-shadow-[0_30px_60px_rgba(31,64,160,0.18)]" fill priority sizes="(min-width:1024px) 45vw, 100vw" src="/hero-atar-logotipo.png" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] px-6 pb-14 pt-4 lg:min-h-[max(760px,calc(100svh-69px))] lg:items-center lg:px-12 lg:py-20">
          <div className="w-full lg:max-w-[540px] xl:max-w-[640px]">
            <h1 className="animate-fade-up text-[2.75rem] font-bold leading-[1.03] tracking-[-0.04em] text-[#0b1530] sm:text-[3.7rem] lg:text-[3.1rem] xl:text-[3.5rem] min-[1400px]:text-[3.95rem]">
              El punto de encuentro
              <br className="hidden sm:block" /> de la <span className="text-[#1f5bff]">industria de la rafia.</span>
            </h1>
            <p className="animate-fade-up mt-5 max-w-[560px] text-lg leading-8 text-slate-600 [animation-delay:150ms] sm:text-xl">
              Un marketplace B2B para comprar, vender y conectar con toda la cadena del polipropileno.
            </p>

            {/* Un acceso por perfil (glassmorphism): abre el registro con ese perfil ya elegido. */}
            <div className="animate-fade-up mt-9 grid grid-cols-1 gap-3 [animation-delay:300ms] sm:grid-cols-3">
              {HERO_ROLES.map((role) => (
                <Link
                  key={role.label}
                  className={`group relative flex flex-col overflow-hidden rounded-[18px] border border-white/80 bg-white/45 px-5 py-4 shadow-[0_10px_30px_rgba(31,64,160,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_18px_44px_rgba(31,64,160,0.18),inset_0_1px_0_#fff] ${role.color}`}
                  href={role.href}
                >
                  {/* Brillo diagonal del vidrio. */}
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0)_45%)]" />
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/80 bg-white/70 shadow-[0_4px_12px_rgba(31,64,160,0.08)]">
                    <Icon name={role.icon} className="h-6 w-6" />
                  </span>
                  <span className="relative mt-3 block text-[1.35rem] font-bold leading-tight tracking-[-0.02em] text-[#0b1530]">{role.label}</span>
                  <span className="relative mt-1 flex items-end justify-between gap-3">
                    <span className="text-[14px] leading-5 text-slate-600">{role.hint}</span>
                    <Icon name="arrow" className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="animate-fade-up mt-10 grid gap-4 [animation-delay:450ms] sm:mt-12 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[#c3cfe8]">
              {HERO_FEATURES.map((item) => (
                <div key={item.text} className="flex items-center gap-3 sm:px-5 sm:first:pl-0">
                  <Icon name={item.icon} className="h-8 w-8 shrink-0 text-[#1f5bff]" />
                  <p className="text-[14px] leading-5 text-slate-700">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CATEGORÍAS ==================== */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-12 lg:py-20">
          <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.5rem]">
                Todo para la industria de rafia y envases industriales.
              </h2>
            </div>
            <Link className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold" href="/productos">
              <span className="inline-flex items-center gap-2 text-[#1f5bff]">
                Ver todas las categorías
                <Icon name="arrow" className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>

          <HomeCategories />
        </div>
      </section>

      {/* ==================== CÓMO FUNCIONA ==================== */}
      <section className="bg-[#f3f6fd]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-12 lg:py-20">
          <Reveal className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.5rem]">¿Cómo funciona?</h2>
            <p className="text-[15px] text-slate-600">Simple. Rápido. Enfocado en tu industria.</p>
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:mt-12 sm:gap-10 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step, index) => (
              <Reveal key={step.label} className="group relative flex flex-col items-start gap-3 sm:flex-row sm:gap-4" delay={index * 140}>
                <span className="flex h-10 w-10 shrink-0 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#e3eaff] text-lg font-semibold text-[#1f5bff] transition duration-300 group-hover:bg-[#1f5bff] group-hover:text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <Icon name={step.icon} className="h-10 w-10 text-[#1f5bff] transition duration-300 group-hover:-translate-y-1" />
                  <h3 className="mt-3 text-lg font-bold text-slate-950">{step.label}</h3>
                  <p className="mt-1.5 max-w-[210px] text-sm leading-6 text-slate-500">{step.text}</p>
                </div>
                {index < STEPS.length - 1 ? (
                  <span className="absolute right-0 top-10 hidden text-[#1f5bff] lg:block">
                    <Icon name="arrow" className="h-6 w-6" />
                  </span>
                ) : null}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== RED ESPECIALIZADA ==================== */}
      <section className="grid bg-[#0d2350] text-white lg:grid-cols-[1fr_1fr]">
        <div className="relative min-h-[300px] overflow-hidden lg:min-h-[520px]">
          <Image alt="" className="object-cover object-[40%_center] transition duration-[2000ms] hover:scale-105" fill sizes="(min-width:1024px) 50vw, 100vw" src="/empresas-reales.png" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_55%,#0d2350_100%)]" />
        </div>
        <div className="flex items-center px-6 py-14 lg:px-14">
          <Reveal className="max-w-[620px]">
            <h2 className="text-3xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
              Empresas reales.
              <br />
              Oportunidades concretas.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
              En ATAR conectamos a toda la cadena de valor de la industria del polipropileno, con un espacio pensado
              exclusivamente para tu sector.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.l}>
                  <Icon name={stat.icon} className="h-8 w-8 text-[#5b8dff]" />
                  <p className="mt-3 text-3xl font-bold tracking-tight">
                    <CountUp value={stat.v} />
                  </p>
                  <p className="mt-1 text-sm leading-5 text-white/70">{stat.l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================== COMPRADORES / PROVEEDORES ==================== */}
      <section className="bg-white">
        <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-6 py-12 lg:grid-cols-2 lg:px-12 lg:py-14">
          <Reveal className="group relative isolate flex min-h-[280px] overflow-hidden rounded-[16px] bg-[linear-gradient(110deg,#eef3ff_0%,#f6f8ff_55%,#dfe8ff_100%)] p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-6 bottom-0 top-0 hidden w-[46%] sm:block">
              <Image alt="" className="origin-bottom-right scale-[1.35] transition duration-500 group-hover:scale-[1.42] object-contain object-right-bottom mix-blend-multiply" fill sizes="320px" src="/bolsapp.png" />
            </div>
            <div className="relative z-10 max-w-[360px]">
              <h3 className="text-[1.9rem] font-bold leading-[1.12] tracking-[-0.03em] text-slate-950">
                Encontrá lo que necesitás, sin intermediarios.
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Solicitá cotizaciones a proveedores verificados y compará opciones en un solo lugar.
              </p>
              <Link className={`${primaryCta} mt-6`} href="/acceso">
                <span className="inline-flex items-center gap-2 text-white">
                  Iniciar una cotización
                  <Icon name="arrow" className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </Reveal>

          <Reveal className="group relative isolate flex min-h-[280px] overflow-hidden rounded-[16px] bg-[linear-gradient(110deg,#eef3ff_0%,#f6f8ff_55%,#dfe8ff_100%)] p-8 sm:p-10" delay={120}>
            <div className="pointer-events-none absolute -right-2 bottom-0 top-4 hidden w-[42%] sm:block">
              <Image alt="" className="origin-bottom-right scale-[1.35] transition duration-500 group-hover:scale-[1.42] object-contain object-right-bottom mix-blend-multiply" fill sizes="320px" src="/bigbag.png" />
            </div>
            <div className="relative z-10 max-w-[360px]">
              <h3 className="text-[1.9rem] font-bold leading-[1.12] tracking-[-0.03em] text-slate-950">
                Llevá tus productos a más clientes.
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Publicá tu catálogo, recibí solicitudes y hacé crecer tu negocio.
              </p>
              <Link
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#1f5bff]/50 bg-white px-6 text-sm font-semibold"
                href="/acceso"
              >
                <span className="inline-flex items-center gap-2 text-[#1f5bff]">
                  Quiero vender en ATAR
                  <Icon name="arrow" className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================== REGIÓN ==================== */}
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f3f6fd_100%)]">
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-10 px-6 py-14 lg:grid-cols-[1fr_minmax(0,460px)] xl:grid-cols-[1fr_minmax(0,480px)_0.62fr] lg:px-12">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.3rem]">Una industria que mueve el mundo.</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600">
              Los envases y tejidos de polipropileno son esenciales en la agricultura, la construcción, la minería, la
              alimentación y muchas otras industrias. En ATAR trabajamos para que esta cadena de valor sea más eficiente,
              conectada y competitiva.
            </p>
            <Link
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#1f5bff]/50 bg-white px-6 text-sm font-semibold"
              href="/como-funciona"
            >
              <span className="inline-flex items-center gap-2 text-[#1f5bff]">
                Conocé más sobre ATAR
                <Icon name="arrow" className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <LatamMap className="mx-auto h-auto w-full max-w-[460px]" />
          </Reveal>

          <Reveal className="rounded-[16px] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]" delay={240}>
            <p className="text-lg font-semibold leading-6 text-slate-950">
              Una red que crece
              <br />
              en la región.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3.5">
              {COUNTRIES.map((country) => (
                <li key={country.name} className="flex items-center gap-2.5 text-sm text-slate-700">
                  {country.flag ? (
                    <Flag name={country.flag} />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e3eaff] text-[#1f5bff]">
                      <Icon name="globe" className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {country.name}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ==================== EMPRESAS ==================== */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-14 lg:px-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2rem]">Empresas que confían en ATAR</h2>
            <Link className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold" href="/proveedores">
              <span className="inline-flex items-center gap-2 text-[#1f5bff]">
                Ver todas las empresas
                <Icon name="arrow" className="h-4 w-4" />
              </span>
            </Link>
          </div>
          {/* Cinta continua: la lista va duplicada y se desplaza la mitad. */}
          <div className="marquee mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="marquee-track flex w-max items-center gap-16">
              {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, index) => (
                <TrustLogoItem key={`${logo.name}-${index}`} hidden={index >= TRUST_LOGOS.length} logo={logo} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
