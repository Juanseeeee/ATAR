/**
 * Logos de las empresas de demo que todavía no subieron el suyo (public/logos).
 * Cuando la empresa carga su logo, `logoUrl` tiene prioridad.
 */
const LOCAL_LOGOS: Record<string, string> = {
  'envapack-sa': '/logos/envapack-sa.svg',
  'proveedor-metal-demo-srl': '/logos/proveedor-metal-demo-srl.svg',
};

export function supplierLogoUrl(supplier: { slug: string; logoUrl?: string | null }) {
  return supplier.logoUrl ?? LOCAL_LOGOS[supplier.slug] ?? null;
}
