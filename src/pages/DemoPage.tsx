import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Formula } from '../components/Formula';
import { PageIntro, usePageTitle } from '../components/ui';
import { buildDemo, type DemoKind } from '../domain/demo';
import { assessPurchase } from '../domain/engine';
import { OUTCOME_LABEL } from '../domain/types';
import { useAppState } from '../state/store';
import { defaultState } from '../domain/storage';

export function DemoPage() {
  usePageTitle('Demo');
  const { state, loadDemo, clearAll } = useAppState();
  const [pending, setPending] = useState<DemoKind | 'clear' | null>(null);
  const negative = buildDemo('negative');
  const affordable = buildDemo('affordable');
  const negativeResult = assessPurchase({ ...negative, referenceMonth: negative.purchase.paymentStartMonth ?? undefined });
  const affordableResult = assessPurchase({ ...affordable, referenceMonth: affordable.purchase.paymentStartMonth ?? undefined });
  const hasData = JSON.stringify({ ...state, demoMode: false, demoKind: null }) !== JSON.stringify({ ...defaultState(), demoMode: false, demoKind: null });

  function request(kind: DemoKind | 'clear') {
    if (!hasData || (kind !== 'clear' && state.demoKind === kind && state.demoMode)) {
      if (kind === 'clear') clearAll();
      else loadDemo(kind);
      setPending(null);
      return;
    }
    setPending(kind);
  }

  function confirm() {
    if (pending === 'clear') clearAll();
    else if (pending) loadDemo(pending);
    setPending(null);
  }

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="EJEMPLO / DATOS FICTICIOS" title="Dos escenarios, ninguna persona real">
        <p>
          Estos números son de demostración. No salen de una entrevista, de un piloto ni de un banco.
          Cargar un ejemplo reemplaza el perfil, los pagos, el borrador y las decisiones guardadas en este navegador.
        </p>
      </PageIntro>

      <ScenarioCard
        title="No compres por ahora"
        body="Ingreso 12,000, efectivo 2,000, esenciales 7,000, discrecionales 2,000, deuda mensual 2,000. Una chamarra de 3,000 en tres pagos de 1,000. Hay unos audífonos de ejemplo ya dentro de esos 2,000: no se suman otra vez."
        result={negativeResult}
        profile={negative.profile}
        onLoad={() => request('negative')}
      />
      <ScenarioCard
        title="Caso en el que sí alcanza"
        body="Ingreso estable 18,000, efectivo 8,000, esenciales 7,000, discrecionales 1,500, deuda 1,000 y reserva 2,000. Un cinturón de 1,200 en tres pagos de 400."
        result={affordableResult}
        profile={affordable.profile}
        onLoad={() => request('affordable')}
      />

      <section className="rounded-3xl border border-line bg-card p-5 leading-relaxed">
        <h2 className="font-display text-2xl text-navy">El seguimiento no se simula</h2>
        <p className="mt-2">
          Si guardas una decisión del ejemplo, la pregunta de 30 días no aparece hoy. La fecha es la de ahora.
          No adelantamos el reloj ni escribimos una respuesta por ti.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={state.demoMode ? '/evaluar?paso=sugerencia' : '/evaluar'} className="inline-flex min-h-11 items-center rounded-full bg-teal px-5 font-semibold text-white">
            {state.demoMode ? 'Ver la sugerencia de este ejemplo' : 'Abrir la evaluación'}
          </Link>
          <Link to="/pagos" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 font-semibold text-navy">
            Ver el calendario
          </Link>
          <button type="button" onClick={() => request('clear')} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold">
            Borrar el ejemplo y dejar todo en blanco
          </button>
        </div>
      </section>

      {pending ? (
        <div className="rounded-3xl border border-amber bg-amber-soft p-5" role="alert">
          <p className="font-semibold text-navy">
            {pending === 'clear'
              ? 'Se borrarán el perfil, los pagos y las decisiones de este navegador.'
              : 'Se reemplazarán el perfil, los pagos, el borrador y las decisiones por datos ficticios.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={confirm} className="inline-flex min-h-11 items-center rounded-full bg-navy px-5 font-semibold text-white">
              Continuar
            </button>
            <button type="button" onClick={() => setPending(null)} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScenarioCard({
  title,
  body,
  result,
  profile,
  onLoad,
}: {
  title: string;
  body: string;
  result: ReturnType<typeof assessPurchase>;
  profile: ReturnType<typeof buildDemo>['profile'];
  onLoad: () => void;
}) {
  return (
    <article className="rounded-3xl border border-line bg-card p-5">
      <p className="text-sm font-semibold tracking-[0.14em] text-amber uppercase">Ejemplo / datos ficticios</p>
      <h2 className="mt-2 font-display text-3xl text-navy">{title}</h2>
      <p className="mt-2 leading-relaxed">{body}</p>
      <div className="mt-4">
        <Formula profile={profile} assessment={result} />
      </div>
      <p className="mt-3 font-semibold text-navy">Sugerencia: {OUTCOME_LABEL[result.outcome]}</p>
      <button type="button" onClick={onLoad} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-navy px-5 font-semibold text-white">
        Cargar este ejemplo
      </button>
    </article>
  );
}
