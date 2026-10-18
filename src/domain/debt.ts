import { isValidMonth, monthToIndex } from './months';
import { roundMoney } from './money';
import type { DebtCount, DebtInclusion, Obligation } from './types';

export function isValidObligation(obligation: Obligation): boolean {
  return (
    Number.isFinite(obligation.amountPerPayment) &&
    obligation.amountPerPayment >= 0 &&
    Number.isInteger(obligation.remainingPayments) &&
    obligation.remainingPayments > 0 &&
    isValidMonth(obligation.nextDueMonth)
  );
}

export function obligationCoversMonth(obligation: Obligation, month: string): boolean {
  if (!isValidObligation(obligation) || !isValidMonth(month)) return false;
  const target = monthToIndex(month);
  const start = monthToIndex(obligation.nextDueMonth);
  if (target === null || start === null) return false;
  const end = start + obligation.remainingPayments - 1;
  return target >= start && target <= end;
}

export function countMonthlyDebt(
  aggregate: number,
  obligations: Obligation[],
  rule: DebtInclusion,
  month: string,
): DebtCount {
  const due = obligations.filter((obligation) => obligationCoversMonth(obligation, month));
  const listedThisMonth = roundMoney(due.reduce((sum, obligation) => sum + obligation.amountPerPayment, 0));
  const listedAdded = rule === 'listed_are_additional' ? listedThisMonth : 0;
  const label =
    rule === 'aggregate_includes_listed'
      ? 'Se cuenta el pago mensual agregado del perfil. Las obligaciones listadas de este mes no se suman otra vez.'
      : 'Se cuenta el pago mensual agregado del perfil más las obligaciones listadas que vencen este mes, porque marcaste que no estaban incluidas.';
  return {
    rule,
    aggregate: roundMoney(aggregate),
    listedThisMonth,
    listedAdded,
    total: roundMoney(aggregate + listedAdded),
    label,
    dueCount: due.length,
  };
}
