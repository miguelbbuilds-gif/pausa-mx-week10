import { useState } from 'react';
import { PageIntro, usePageTitle } from '../components/ui';
import { useAppState } from '../state/store';

export function PrivacyPage() {
  usePageTitle('Privacidad');
  const { exportJson, clearAll, state } = useAppState();
  const [confirming, setConfirming] = useState(false);
  const [exported, setExported] = useState(false);

  function download() {
    const contents = exportJson();
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pausa-mx-datos.json';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <PageIntro eyebrow="Privacidad" title="Lo que se queda en este navegador">
        <p>PAUSA MX no tiene servidor, no manda tus números a nadie y no usa analítica, cookies de rastreo ni un modelo remoto.</p>
      </PageIntro>
      <section className="rounded-3xl border border-line bg-card p-5 leading-relaxed">
        <h2 className="font-display text-2xl text-navy">Qué se guarda</h2>
        <ul className="mt-3 list-disc pl-5">
          <li>El perfil que escribes: ingreso, gastos, efectivo, deuda y reserva.</li>
          <li>Las obligaciones de pagos que anotas a mano.</li>
          <li>El borrador de la compra que estás evaluando.</li>
          <li>Las decisiones que eliges guardar, con la fecha de creación.</li>
        </ul>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5 leading-relaxed">
        <h2 className="font-display text-2xl text-navy">Qué no pedimos</h2>
        <p className="mt-2">No pedimos cuenta bancaria, contraseñas, número de tarjeta ni acceso a otras apps de meses. No vemos deudas que no hayas escrito.</p>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5 leading-relaxed">
        <h2 className="font-display text-2xl text-navy">Cuánto tiempo</h2>
        <p className="mt-2">
          Una decisión se borra a los 30 días, contados desde la fecha guardada, salvo que pidas conservarla.
          Si se borra, no inventamos un seguimiento. La pregunta de los 30 días solo aparece en registros conservados, y solo cuando el tiempo ya pasó.
          Las obligaciones de Pagos no se borran con el historial.
        </p>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-display text-2xl text-navy">Llevarte una copia</h2>
        <p className="mt-2 leading-relaxed">La exportación es un archivo JSON en tu computadora. No se sube.</p>
        <button type="button" onClick={download} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-teal px-5 font-semibold text-white">
          Exportar JSON
        </button>
        {exported ? <p role="status" className="mt-3 text-sm font-semibold text-teal-dark">Se descargó pausa-mx-datos.json en este dispositivo.</p> : null}
        <p className="mt-3 text-sm text-muted">Ahora hay {state.decisions.length} decisiones y {state.obligations.length} obligaciones en este navegador.</p>
      </section>
      <section className="rounded-3xl border border-clay bg-clay-soft p-5">
        <h2 className="font-display text-2xl text-clay">Borrar todo</h2>
        <p className="mt-2 leading-relaxed text-ink">Esto quita perfil, pagos, borrador y decisiones de este navegador. No se puede deshacer desde la app.</p>
        {confirming ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => { clearAll(); setConfirming(false); }} className="inline-flex min-h-11 items-center rounded-full bg-clay px-5 font-semibold text-white">
              Sí, borrar todos los datos
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 font-semibold">
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-clay px-5 font-semibold text-clay">
            Borrar todos los datos de este navegador
          </button>
        )}
      </section>
    </div>
  );
}
