import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChoiceGroup, NumberField, PageIntro, usePageTitle } from '../components/ui';
import { parseAmountInput } from '../domain/money';
import type { FinancialProfile, IncomeStability } from '../domain/types';
import { useAppState } from '../state/store';

function toInput(value: number | null): string {
  return value === null ? '' : String(value);
}

export function ProfilePage() {
  usePageTitle('Perfil');
  const { state, saveProfile } = useAppState();
  const [form, setForm] = useState({
    monthlyNetIncome: toInput(state.profile.monthlyNetIncome),
    incomeStability: state.profile.incomeStability ?? '',
    conservativeIncome: toInput(state.profile.conservativeIncome),
    availableCash: toInput(state.profile.availableCash),
    essentialExpenses: toInput(state.profile.essentialExpenses),
    discretionaryExpenses: toInput(state.profile.discretionaryExpenses),
    existingDebtPayments: toInput(state.profile.existingDebtPayments),
    emergencyReserveTarget: toInput(state.profile.emergencyReserveTarget),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const required = [
      ['monthlyNetIncome', 'el ingreso neto mensual'],
      ['availableCash', 'el efectivo disponible'],
      ['essentialExpenses', 'los gastos esenciales'],
      ['discretionaryExpenses', 'los gastos discrecionales'],
      ['existingDebtPayments', 'los pagos de deuda'],
    ] as const;
    const parsed: Record<string, number | null> = {};
    for (const [field, label] of required) {
      const result = parseAmountInput(form[field]);
      if (!result.ok) nextErrors[field] = `Escribe ${label} con números. Si es cero, escribe 0.`;
      else if (result.value === null) nextErrors[field] = `Falta ${label}. Si no aplica, escribe 0.`;
      else parsed[field] = result.value;
    }
    if (form.incomeStability !== 'stable' && form.incomeStability !== 'variable') {
      nextErrors.incomeStability = 'Indica si el ingreso es estable o variable.';
    }
    if (form.incomeStability === 'variable') {
      const conservative = parseAmountInput(form.conservativeIncome);
      if (!conservative.ok || conservative.value === null) {
        nextErrors.conservativeIncome = 'Con ingreso variable hace falta un ingreso conservador. No uses el mejor mes.';
      } else {
        parsed.conservativeIncome = conservative.value;
      }
    } else if (form.conservativeIncome.trim() !== '') {
      const conservative = parseAmountInput(form.conservativeIncome);
      if (!conservative.ok) nextErrors.conservativeIncome = 'El ingreso conservador no es un número válido.';
      else parsed.conservativeIncome = conservative.value;
    }
    if (form.emergencyReserveTarget.trim() === '') parsed.emergencyReserveTarget = null;
    else {
      const reserve = parseAmountInput(form.emergencyReserveTarget);
      if (!reserve.ok || reserve.value === null) nextErrors.emergencyReserveTarget = 'La reserva debe ser un número, o déjala vacía.';
      else parsed.emergencyReserveTarget = reserve.value;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSaved(false);
      return;
    }
    const profile: FinancialProfile = {
      monthlyNetIncome: parsed.monthlyNetIncome ?? null,
      incomeStability: form.incomeStability as IncomeStability,
      conservativeIncome: form.incomeStability === 'variable' ? parsed.conservativeIncome ?? null : null,
      availableCash: parsed.availableCash ?? null,
      essentialExpenses: parsed.essentialExpenses ?? null,
      discretionaryExpenses: parsed.discretionaryExpenses ?? null,
      existingDebtPayments: parsed.existingDebtPayments ?? null,
      emergencyReserveTarget: parsed.emergencyReserveTarget ?? null,
    };
    saveProfile(profile);
    setSaved(true);
  }

  return (
    <div>
      <PageIntro eyebrow="Perfil" title="Los números de tu mes">
        <p>Escríbelos a mano. Cero es válido. Un campo vacío no se inventa. Esto no es una conexión al banco.</p>
      </PageIntro>
      <form onSubmit={onSubmit} className="grid max-w-2xl gap-5" noValidate>
        <NumberField
          id="monthlyNetIncome"
          label="Ingreso neto mensual"
          required
          value={form.monthlyNetIncome}
          onChange={(value) => update('monthlyNetIncome', value)}
          error={errors.monthlyNetIncome}
          hint="Lo que te queda después de impuestos, en MXN."
        />
        <ChoiceGroup
          legend="¿Ese ingreso es estable o variable?"
          name="incomeStability"
          value={form.incomeStability}
          onChange={(value) => update('incomeStability', value)}
          error={errors.incomeStability}
          options={[
            { value: 'stable', label: 'Estable', hint: 'Usaremos el ingreso neto mensual.' },
            { value: 'variable', label: 'Variable', hint: 'Usaremos un ingreso conservador, no el mes más alto.' },
          ]}
        />
        {form.incomeStability === 'variable' ? (
          <NumberField
            id="conservativeIncome"
            label="Ingreso conservador mensual"
            required
            value={form.conservativeIncome}
            onChange={(value) => update('conservativeIncome', value)}
            error={errors.conservativeIncome}
            hint="Una cifra baja que sí podrías sostener. No tiene que ser el promedio."
          />
        ) : null}
        <NumberField
          id="availableCash"
          label="Efectivo disponible hoy"
          required
          value={form.availableCash}
          onChange={(value) => update('availableCash', value)}
          error={errors.availableCash}
          hint="No se suma a tu ingreso del mes. Sirve para ver un pago de contado."
        />
        <NumberField
          id="essentialExpenses"
          label="Gastos esenciales del mes"
          required
          value={form.essentialExpenses}
          onChange={(value) => update('essentialExpenses', value)}
          error={errors.essentialExpenses}
          hint="Renta, comida, transporte y servicios que no puedes quitar."
        />
        <NumberField
          id="discretionaryExpenses"
          label="Gastos discrecionales del mes"
          required
          value={form.discretionaryExpenses}
          onChange={(value) => update('discretionaryExpenses', value)}
          error={errors.discretionaryExpenses}
          hint="Si este mes no tienes, escribe 0."
        />
        <NumberField
          id="existingDebtPayments"
          label="Pagos de deuda que ya tienes, al mes"
          required
          value={form.existingDebtPayments}
          onChange={(value) => update('existingDebtPayments', value)}
          error={errors.existingDebtPayments}
          hint="Un solo total. El detalle de cada pago a meses va en Pagos, y allí eliges si este total ya los incluye."
        />
        <NumberField
          id="emergencyReserveTarget"
          label="Reserva de emergencia que quieres conservar"
          value={form.emergencyReserveTarget}
          onChange={(value) => update('emergencyReserveTarget', value)}
          error={errors.emergencyReserveTarget}
          hint="Opcional. Si la dejas vacía, no comparamos el efectivo contra una meta."
        />
        {Object.keys(errors).length > 0 ? (
          <p role="alert" className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay">
            Revisa los campos marcados. No guardamos un perfil a medias.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-teal px-5 font-semibold text-white">
            Guardar perfil en este navegador
          </button>
          <Link to="/evaluar" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-5 font-semibold text-navy">
            Evaluar una compra
          </Link>
        </div>
        {saved ? <p role="status" className="text-sm font-semibold text-teal-dark">Perfil guardado en este navegador.</p> : null}
      </form>
    </div>
  );
}
