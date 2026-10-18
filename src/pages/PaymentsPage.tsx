import { useState, type FormEvent } from 'react';
import { MonthField, NumberField, PageIntro, TextField, usePageTitle } from '../components/ui';
import { SchedulePanel } from '../components/SchedulePanel';
import { countMonthlyDebt } from '../domain/debt';
import { currentMonth, isValidMonth } from '../domain/months';
import { formatMXN, parseAmountInput } from '../domain/money';
import { useAppState } from '../state/store';

interface ObligationForm {
  description: string;
  amountPerPayment: string;
  remainingPayments: string;
  nextDueMonth: string;
}

const EMPTY_FORM: ObligationForm = {
  description: '',
  amountPerPayment: '',
  remainingPayments: '',
  nextDueMonth: currentMonth(),
};

export function PaymentsPage() {
  usePageTitle('Pagos');
  const { state, setDebtInclusion, saveObligation, deleteObligation } = useAppState();
  const [form, setForm] = useState<ObligationForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const month = currentMonth();
  const debt = state.profile.existingDebtPayments === null
    ? null
    : countMonthlyDebt(state.profile.existingDebtPayments, state.obligations, state.debtInclusion, month);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.description.trim()) nextErrors.description = 'Escribe una descripción.';
    const amount = parseAmountInput(form.amountPerPayment);
    if (!amount.ok || amount.value === null) nextErrors.amountPerPayment = 'Escribe el monto de cada pago. Puede ser 0.';
    if (!/^\d+$/.test(form.remainingPayments.trim()) || Number(form.remainingPayments) <= 0) {
      nextErrors.remainingPayments = 'Los pagos restantes deben ser un entero mayor que cero.';
    }
    if (!isValidMonth(form.nextDueMonth)) nextErrors.nextDueMonth = 'Elige un mes válido.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !amount.ok || amount.value === null) return;
    saveObligation({
      id: editingId ?? undefined,
      description: form.description.trim(),
      amountPerPayment: amount.value,
      remainingPayments: Number(form.remainingPayments),
      nextDueMonth: form.nextDueMonth,
    });
    setForm({ ...EMPTY_FORM, nextDueMonth: currentMonth() });
    setEditingId(null);
  }

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Pagos" title="Obligaciones que anotas tú">
        <p>Nada se descarga de otra app. Este calendario es manual. El total del perfil y esta lista no se suman dos veces, salvo que tú digas que la lista es adicional.</p>
      </PageIntro>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-display text-2xl text-navy">Regla de inclusión</h2>
        <p className="mt-2 leading-relaxed">
          En una evaluación, el excedente usa el campo «pagos de deuda que ya tienes» del perfil
          {state.profile.existingDebtPayments === null ? '' : ` (${formatMXN(state.profile.existingDebtPayments)})`}.
          El calendario siempre muestra cada obligación de esta lista.
        </p>
        <fieldset className="mt-4 grid gap-2">
          <legend className="sr-only">Cómo contar las obligaciones de la lista</legend>
          <InclusionOption
            checked={state.debtInclusion === 'aggregate_includes_listed'}
            onChange={() => setDebtInclusion('aggregate_includes_listed')}
            title="El total del perfil ya incluye esta lista"
            body="No las sumamos otra vez al excedente. En el mes evaluado, lo listado se muestra, pero lo añadido es cero."
          />
          <InclusionOption
            checked={state.debtInclusion === 'listed_are_additional'}
            onChange={() => setDebtInclusion('listed_are_additional')}
            title="Esta lista es adicional al total del perfil"
            body="Al excedente se suma el total del perfil más las obligaciones que vencen en el mes evaluado."
          />
        </fieldset>
        <p className="mt-4 text-sm leading-relaxed text-ink">
          {debt
            ? `Este mes se contarían ${formatMXN(debt.total)} en el excedente. Agregado: ${formatMXN(debt.aggregate)}. Lista de este mes: ${formatMXN(debt.listedThisMonth)}. Añadido por la regla: ${formatMXN(debt.listedAdded)}.`
            : 'Todavía no hay un total de deuda en el perfil, así que el excedente no puede cerrar la cuenta. El calendario sí puede mostrar la lista.'}
        </p>
        {debt ? <p className="mt-2 text-sm text-muted">{debt.label}</p> : null}
      </section>

      <form onSubmit={onSubmit} className="grid max-w-2xl gap-4 rounded-3xl border border-line bg-card p-5" noValidate>
        <h2 className="font-display text-2xl text-navy">{editingId ? 'Editar obligación' : 'Añadir obligación'}</h2>
        <TextField id="description" label="Descripción" required value={form.description} onChange={(value) => setForm({ ...form, description: value })} error={errors.description} />
        <NumberField id="amountPerPayment" label="Monto de cada pago" required value={form.amountPerPayment} onChange={(value) => setForm({ ...form, amountPerPayment: value })} error={errors.amountPerPayment} />
        <NumberField id="remainingPayments" label="Pagos que faltan" required value={form.remainingPayments} onChange={(value) => setForm({ ...form, remainingPayments: value })} error={errors.remainingPayments} />
        <MonthField id="nextDueMonth" label="Próximo mes de pago" value={form.nextDueMonth} onChange={(value) => setForm({ ...form, nextDueMonth: value })} error={errors.nextDueMonth} />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-teal px-5 font-semibold text-white">
            {editingId ? 'Guardar cambios' : 'Añadir a la lista'}
          </button>
          {editingId ? (
            <button type="button" onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM, nextDueMonth: currentMonth() }); }} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold">
              Cancelar edición
            </button>
          ) : null}
        </div>
      </form>

      {state.obligations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-4 py-8 text-center">
          <p className="font-semibold text-navy">No hay obligaciones anotadas.</p>
          <p className="mt-2 text-sm text-muted">Puedes evaluar una compra solo con el total del perfil. Esta lista es opcional.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {state.obligations.map((obligation) => (
            <li key={obligation.id} className="rounded-3xl border border-line bg-card p-4">
              <h3 className="font-semibold text-navy">{obligation.description}</h3>
              <p className="mt-1 text-sm text-muted">
                {formatMXN(obligation.amountPerPayment)} · {obligation.remainingPayments} pagos · desde {obligation.nextDueMonth}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="font-semibold text-teal-dark underline underline-offset-4"
                  onClick={() => {
                    setEditingId(obligation.id);
                    setForm({
                      description: obligation.description,
                      amountPerPayment: String(obligation.amountPerPayment),
                      remainingPayments: String(obligation.remainingPayments),
                      nextDueMonth: obligation.nextDueMonth,
                    });
                  }}
                >
                  Editar
                </button>
                {pendingDelete === obligation.id ? (
                  <>
                    <button type="button" className="font-semibold text-clay" onClick={() => { deleteObligation(obligation.id); setPendingDelete(null); }}>
                      Confirmar borrado
                    </button>
                    <button type="button" onClick={() => setPendingDelete(null)}>Cancelar</button>
                  </>
                ) : (
                  <button type="button" className="font-semibold text-clay" onClick={() => setPendingDelete(obligation.id)}>
                    Borrar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <SchedulePanel obligations={state.obligations} purchase={state.draftPurchase} referenceMonth={month} />
    </div>
  );
}

function InclusionOption({
  checked,
  onChange,
  title,
  body,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  body: string;
}) {
  return (
    <label className="flex gap-3 rounded-2xl border border-line bg-white px-3 py-3">
      <input type="radio" name="debtInclusion" checked={checked} onChange={onChange} />
      <span>
        <span className="block font-semibold text-navy">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{body}</span>
      </span>
    </label>
  );
}
