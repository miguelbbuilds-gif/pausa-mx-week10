import { formatMXN } from '../domain/money';
import { formatMonthLabel } from '../domain/months';
import type { Assessment } from '../domain/engine';
import type { FinancialProfile } from '../domain/types';

export function Formula({ profile, assessment }: { profile: FinancialProfile; assessment: Assessment }) {
  if (assessment.surplusAfter === null || assessment.incomeUsed === null) return null;
  const debt = assessment.debtOnTightestMonth?.total ?? null;
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold tracking-[0.14em] text-teal-dark uppercase">Cuenta del mes más justo</p>
      {assessment.tightestMonth ? (
        <p className="text-sm text-muted capitalize">Mes usado: {formatMonthLabel(assessment.tightestMonth)}</p>
      ) : null}
      <dl className="grid gap-2 rounded-2xl bg-paper p-4">
        <Row label="Ingreso usado" value={assessment.incomeUsed} />
        <Row label="Gastos esenciales" value={profile.essentialExpenses} minus />
        <Row label="Gastos discrecionales" value={profile.discretionaryExpenses} minus />
        <Row label="Deuda contada" value={debt} minus />
        <Row label="Mensualidad nueva" value={assessment.proposedInstallment} minus />
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-2">
          <dt className="font-semibold text-navy">Excedente</dt>
          <dd className="font-display text-2xl text-navy">{formatMXN(assessment.surplusAfter)}</dd>
        </div>
      </dl>
      {assessment.cashImpact ? (
        <p className="text-sm leading-relaxed text-ink">
          Efectivo aparte: {formatMXN(assessment.cashImpact.available)} − {formatMXN(assessment.cashImpact.price)} = {formatMXN(assessment.cashImpact.after)}.
          Ese saldo no se suma al ingreso del mes.
        </p>
      ) : null}
      {assessment.debtOnTightestMonth ? (
        <p className="text-sm leading-relaxed text-muted">{assessment.debtOnTightestMonth.label}</p>
      ) : null}
    </div>
  );
}

function Row({ label, value, minus = false }: { label: string; value: number | null; minus?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{minus ? `− ${label}` : label}</dt>
      <dd className="font-semibold text-ink">{formatMXN(value)}</dd>
    </div>
  );
}
