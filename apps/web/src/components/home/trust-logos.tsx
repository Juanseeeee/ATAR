/**
 * Logos de la cinta "Empresas que confían en ATAR". Son marcas ficticias del
 * rubro (no empresas reales) mientras no haya clientes que autoricen mostrar
 * la suya. Se ven en gris y toman su color al pasar el mouse.
 */

type TrustLogo = {
  name: string;
  /** Color de marca al pasar el mouse. */
  color: string;
  mark: React.ReactNode;
  wordmark: React.ReactNode;
};

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const TRUST_LOGOS: TrustLogo[] = [
  {
    name: 'Rafitex',
    color: '#1f5bff',
    mark: (
      <>
        <rect x="4" y="4" width="32" height="32" rx="8" fill="currentColor" />
        <path d="M11 14h18M11 20h18M11 26h18M14 11v18M20 11v18M26 11v18" stroke="#fff" strokeWidth="2" opacity=".85" />
      </>
    ),
    wordmark: <span className="text-[22px] font-extrabold tracking-[-0.03em]">Rafitex</span>,
  },
  {
    name: 'Polimex Andina',
    color: '#0e9f6e',
    mark: (
      <>
        <path d="M20 4l13.9 8v16L20 36 6.1 28V12z" {...stroke} />
        <circle cx="20" cy="20" r="4.5" fill="currentColor" />
        <path d="M20 4v11.5M33.9 28l-9.9-5.7M6.1 28l9.9-5.7" {...stroke} strokeWidth={2} />
      </>
    ),
    wordmark: (
      <span className="leading-none">
        <span className="block text-[19px] font-bold tracking-[-0.02em]">Polimex</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.32em]">Andina</span>
      </span>
    ),
  },
  {
    name: 'Sacoplast',
    color: '#e0632a',
    mark: (
      <>
        <path d="M10 10h20l-2 26H12z" fill="currentColor" />
        <path d="M14 10c0-4 3-6 6-6s6 2 6 6" {...stroke} />
        <path d="M15 20h10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
    wordmark: <span className="text-[21px] font-black lowercase tracking-[-0.04em]">sacoplast</span>,
  },
  {
    name: 'Tejidos del Sur',
    color: '#4f46e5',
    mark: (
      <>
        <circle cx="20" cy="20" r="16" {...stroke} />
        <path d="M8 26L26 8M12 32L32 12M18 34L34 18" {...stroke} strokeWidth={2.2} />
      </>
    ),
    wordmark: (
      <span className="text-[19px] font-semibold tracking-[-0.01em]">
        Tejidos <span className="font-light italic">del Sur</span>
      </span>
    ),
  },
  {
    name: 'Jumbopack',
    color: '#0b74c4',
    mark: (
      <>
        <path d="M9 14h22v20a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z" fill="currentColor" />
        <path d="M12 14V8a3 3 0 0 1 6 0v6M22 14V8a3 3 0 0 1 6 0v6" {...stroke} />
      </>
    ),
    wordmark: <span className="text-[21px] font-extrabold uppercase italic tracking-[-0.02em]">Jumbopack</span>,
  },
  {
    name: 'FlexoColor',
    color: '#d6336c',
    mark: (
      <>
        <circle cx="15" cy="15" r="9" fill="currentColor" opacity=".55" />
        <circle cx="25" cy="15" r="9" fill="currentColor" opacity=".75" />
        <circle cx="20" cy="24" r="9" fill="currentColor" />
      </>
    ),
    wordmark: (
      <span className="text-[21px] font-bold tracking-[-0.03em]">
        flexo<span className="font-extrabold">color</span>
      </span>
    ),
  },
  {
    name: 'Hilandería Pampa',
    color: '#8a5a1f',
    mark: (
      <>
        <rect x="8" y="5" width="24" height="5" rx="2" fill="currentColor" />
        <rect x="8" y="30" width="24" height="5" rx="2" fill="currentColor" />
        <path d="M12 10v20M28 10v20M12 14l16 4M12 20l16 4M12 26l16-12" {...stroke} strokeWidth={2} />
      </>
    ),
    wordmark: (
      <span className="leading-none">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.3em]">Hilandería</span>
        <span className="block text-[20px] font-extrabold tracking-[-0.02em]">PAMPA</span>
      </span>
    ),
  },
  {
    name: 'Bolsatec',
    color: '#1f5bff',
    mark: (
      <>
        <path d="M20 5l15 26H5z" fill="currentColor" />
        <path d="M20 16l6 10H14z" fill="#fff" />
      </>
    ),
    wordmark: (
      <span className="text-[21px] font-bold tracking-[-0.03em]">
        bolsa<span className="font-black">tec</span>
      </span>
    ),
  },
];

export function TrustLogoItem({ logo, hidden }: { logo: TrustLogo; hidden?: boolean }) {
  return (
    <span
      aria-hidden={hidden}
      aria-label={hidden ? undefined : logo.name}
      className="group/logo flex shrink-0 items-center gap-2.5 whitespace-nowrap text-slate-400 transition duration-300 hover:text-[var(--brand)]"
      role={hidden ? undefined : 'img'}
      style={{ ['--brand' as string]: logo.color }}
    >
      <svg aria-hidden="true" className="h-9 w-9" viewBox="0 0 40 40">
        {logo.mark}
      </svg>
      {logo.wordmark}
    </span>
  );
}
