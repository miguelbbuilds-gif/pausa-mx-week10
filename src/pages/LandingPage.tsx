import { ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Formula } from '../components/Formula';
import { Card, usePageTitle } from '../components/ui';
import { buildDemo } from '../domain/demo';
import { assessPurchase } from '../domain/engine';
import { SHADOW_CLAUSE } from '../domain/types';

export function LandingPage() {
  usePageTitle('Inicio');
  const scenario = buildDemo('negative');
  const assessment = assessPurchase({ ...scenario, referenceMonth: scenario.purchase.paymentStartMonth ?? undefined });

  return (
    <div className="grid gap-8">
      <section className="grid items-end gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-[0.16em] text-teal-dark uppercase">Para quien compra, no para quien vende</p>
          <h1 className="font-display text-5xl leading-none text-navy sm:text-6xl">Tu dinero. Tu decisión.</h1>
          <p className="mt-4 max-w-xl text-xl leading-relaxed text-ink">
            Antes de llevarte algo a meses, PAUSA muestra el excedente que quedaría. La sugerencia se explica, se puede descartar y no compra por ti.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/demo" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-teal px-5 py-2 font-semibold text-white">
              Ver el ejemplo <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link to="/perfil" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-5 py-2 font-semibold text-navy">
              Armar mi perfil
            </Link>
          </div>
        </div>
        <Card>
          <p className="text-sm font-semibold tracking-[0.14em] text-amber uppercase">Ejemplo / datos ficticios</p>
          <h2 className="mt-2 font-display text-3xl text-navy">Chamarra a 3 pagos</h2>
          <div className="mt-4">
            <Formula profile={scenario.profile} assessment={assessment} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink">
            La sugerencia de este ejemplo es no comprar por ahora: el excedente mensual queda en cero. Los MXN 1,000 que faltan si se pagara el precio completo salen del efectivo, en una cuenta aparte.
          </p>
          <Link to="/demo" className="mt-4 inline-block font-semibold text-teal-dark underline underline-offset-4">
            Abrir el escenario completo
          </Link>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-display text-2xl text-navy">Qué mira</h2>
          <p className="mt-2 leading-relaxed">Ingreso, gastos, deuda que ya declaraste, el pago nuevo y tres preguntas de contexto. Las cuentas quedan a la vista.</p>
        </Card>
        <Card>
          <h2 className="font-display text-2xl text-navy">Qué no hace</h2>
          <p className="mt-2 leading-relaxed">No recomienda tiendas, no cobra comisión, no pide el banco y no tiene un puntaje oculto de felicidad.</p>
        </Card>
        <Card>
          <h2 className="font-display text-2xl text-navy">Quién decide</h2>
          <p className="mt-2 leading-relaxed">Tú. Puedes aceptar la sugerencia, cambiarla o descartarla. La app no bloquea una compra en el mundo real.</p>
        </Card>
      </section>

      <section className="grid gap-4 rounded-3xl bg-navy px-5 py-6 text-white md:grid-cols-[1fr_1fr] md:p-8">
        <div>
          <h2 className="font-display text-3xl">La pausa es para la persona</h2>
          <p className="mt-3 leading-relaxed text-white/90">
            Nadie optimiza tu mes por detrás. Escribes los números a mano, ves la resta y te quedas con la última palabra.
          </p>
        </div>
        <p className="rounded-2xl bg-white/10 p-4 leading-relaxed">{SHADOW_CLAUSE}</p>
      </section>

      <section>
        <h2 className="font-display text-3xl text-navy">Cómo se usa</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ['1. Perfil', 'Ingreso, efectivo, gastos y deuda mensual.'],
            ['2. Compra', 'Precio, pagos y comisiones que sí conozcas.'],
            ['3. Contexto', 'Si lo necesitas, si ya tienes algo y qué pasa si esperas.'],
            ['4. Decisión', 'Ves la sugerencia y guardas lo que tú eliges.'],
          ].map(([title, body]) => (
            <li key={title} className="rounded-3xl border border-line bg-card p-4">
              <h3 className="font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          <Shield className="mt-1 text-teal" aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl text-navy">Los datos se quedan aquí</h2>
            <p className="mt-1 max-w-xl leading-relaxed">No hay servidor, analítica ni cookies de rastreo. Puedes exportar o borrar todo desde Privacidad.</p>
          </div>
        </div>
        <Link to="/privacidad" className="inline-flex min-h-11 items-center rounded-full bg-navy px-4 py-2 font-semibold text-white">
          Ver privacidad
        </Link>
      </Card>
    </div>
  );
}
