'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AtariaFlow, CustomFlow, SheetFlow } from '@/components/new-request/flow-screens';
import RequestWizard from '@/components/new-request/request-wizard';
import NewRequestStart from '@/components/new-request/start-screen';

const WIZARD_PARAMS = ['modo', 'edit', 'repetir', 'category', 'step'];

/**
 * "Solicitar cotización". Sin parámetros: las formas de empezar. ATARIA,
 * planilla y a medida tienen su propia pantalla; el catálogo, repetir, editar
 * y "seguir donde dejé" abren el paso a paso.
 */
function NewRequestRouter() {
  const searchParams = useSearchParams();
  const mode = searchParams?.get('modo');
  if (mode === 'ataria') return <AtariaFlow />;
  if (mode === 'planilla') return <SheetFlow />;
  if (mode === 'medida') return <CustomFlow />;
  const inWizard = WIZARD_PARAMS.some((key) => searchParams?.has(key));
  return inWizard ? <RequestWizard /> : <NewRequestStart />;
}

export default function BuyerNewRequestPage() {
  return (
    <Suspense fallback={null}>
      <NewRequestRouter />
    </Suspense>
  );
}
