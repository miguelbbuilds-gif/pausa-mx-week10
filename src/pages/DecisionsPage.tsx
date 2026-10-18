import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro, usePageTitle } from '../components/ui';
import { daysUntilRetention } from '../domain/history';
import { formatLocalDate } from '../domain/months';
import { formatMXN } from '../domain/money';
import { OUTCOME_LABEL } from '../domain/types';
import { useAppState } from '../state/store';

export function DecisionsPage() {
  usePageTitle('Decisiones');
  const { state, followUps, deleteDecision, setRetained, answerFollowUp } = useAppState();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Decisiones" title="Lo que tú guardaste">
        <p>
          Aquí está la sugerencia y, si la cambiaste, tu postura. Un registro sin conservar se borra a los 30 días.
          La pregunta de seguimiento solo aparece cuando esos 30 días ya pasaron y pediste conservarlo. No inventamos respuestas.
        </p>
      </PageIntro>

      {followUps.length > 0 ? (
        <section className="grid gap-3" aria-label="Seguimiento de 30 días">
          <h2 className="font-display text-3xl text-navy">Seguimiento</h2>
          {followUps.map((decision) => (
            <FollowUpCard key={decision.id} id={decision.id} productName={decision.productName} onAnswer={answerFollowUp} />
          ))}
        </section>
      ) : null}

      {state.decisions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-4 py-10 text-center">
          <p className="font-semibold text-navy">Todavía no hay decisiones guardadas.</p>
          <p className="mt-2 text-sm text-muted">Cuando evalúes una compra puedes guardar tu postura, o no guardar nada.</p>
          <Link to="/evaluar" className="mt-4 inline-flex min-h-11 items-center font-semibold text-teal-dark underline underline-offset-4">
            Evaluar una compra
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {state.decisions.map((decision) => {
            const days = daysUntilRetention(decision.createdAt, now);
            return (
              <li key={decision.id} className="rounded-3xl border border-line bg-card p-5">
                <p className="text-sm font-semibold tracking-[0.14em] text-teal-dark uppercase">{decision.category}</p>
                <h2 className="mt-1 font-display text-3xl text-navy">{decision.productName || 'Sin nombre'}</h2>
                <p className="mt-2 text-sm text-muted">Guardada el {formatLocalDate(decision.createdAt)}</p>
                <p className="mt-3 font-semibold text-navy">Tu registro: {decision.finalLabel}</p>
                <p className="text-sm text-muted">Sugerencia de la app en ese momento: {OUTCOME_LABEL[decision.engineOutcome]}</p>
                {decision.overridden ? <p className="mt-1 text-sm text-ink">Cambiaste la sugerencia. La cuenta original se conserva.</p> : null}
                <p className="mt-2 text-sm">Excedente anotado: {formatMXN(decision.surplusAfter)}. Efectivo después del precio: {formatMXN(decision.cashAfter)}.</p>
                {decision.retainedPermanently ? (
                  <p className="mt-2 text-sm text-muted">
                    Pediste conservarlo.
                    {days !== null && days > 0 ? ` El seguimiento aparece en ${days} días, no antes.` : ' Si ya pasaron 30 días y no has respondido, la pregunta está arriba.'}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    {days !== null && days > 0
                      ? `Se borra en ${days} días si no lo conservas. No habrá seguimiento.`
                      : 'Este registro está en el límite de 30 días.'}
                  </p>
                )}
                {decision.followUp ? (
                  <p className="mt-2 text-sm text-ink">
                    Respondiste el seguimiento el {formatLocalDate(decision.followUp.answeredAt)}.
                    {decision.followUp.stillGlad === null
                      ? ' Preferiste no decir si sigues conforme.'
                      : decision.followUp.stillGlad
                        ? ' Dijiste que sigues conforme.'
                        : ' Dijiste que no sigues conforme.'}
                    {decision.followUp.note ? ` Nota: ${decision.followUp.note}` : ''}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" className="font-semibold text-teal-dark underline underline-offset-4" onClick={() => setRetained(decision.id, !decision.retainedPermanently)}>
                    {decision.retainedPermanently ? 'Dejar de conservar' : 'Conservar después de 30 días'}
                  </button>
                  {pendingDelete === decision.id ? (
                    <>
                      <button type="button" className="font-semibold text-clay" onClick={() => { deleteDecision(decision.id); setPendingDelete(null); }}>
                        Confirmar borrado
                      </button>
                      <button type="button" onClick={() => setPendingDelete(null)}>Cancelar</button>
                    </>
                  ) : (
                    <button type="button" className="font-semibold text-clay" onClick={() => setPendingDelete(decision.id)}>
                      Borrar este registro
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FollowUpCard({
  id,
  productName,
  onAnswer,
}: {
  id: string;
  productName: string;
  onAnswer: (id: string, stillGlad: boolean | null, note: string) => void;
}) {
  const [choice, setChoice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      className="rounded-3xl border border-amber bg-amber-soft p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!choice) {
          setError('Elige una respuesta, o di que prefieres no responder.');
          return;
        }
        const stillGlad = choice === 'yes' ? true : choice === 'no' ? false : null;
        onAnswer(id, stillGlad, note.trim());
      }}
    >
      <h3 className="font-semibold text-navy">Han pasado 30 días desde «{productName}».</h3>
      <p className="mt-1 text-sm leading-relaxed">¿Sigues conforme con lo que decidiste? Esta pregunta no estaba respondida.</p>
      <fieldset className="mt-3 grid gap-2">
        <legend className="sr-only">Respuesta de seguimiento</legend>
        {[
          ['yes', 'Sí, sigo conforme'],
          ['no', 'No sigo conforme'],
          ['skip', 'Prefiero no responder'],
        ].map(([value, label]) => (
          <label key={value} className="flex gap-2">
            <input type="radio" name={`follow-${id}`} value={value} checked={choice === value} onChange={() => setChoice(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="mt-3 grid gap-1 text-sm font-semibold" htmlFor={`note-${id}`}>
        Nota opcional
        <textarea id={`note-${id}`} value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 rounded-xl border border-line bg-white p-2 font-normal" />
      </label>
      {error ? <p role="alert" className="mt-2 text-sm font-semibold text-clay">{error}</p> : null}
      <button type="submit" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-navy px-4 font-semibold text-white">
        Guardar respuesta
      </button>
    </form>
  );
}
