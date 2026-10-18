import { isValidObligation } from './debt';
import { addMonths, formatMonthLabel, formatMonthShort, indexToMonth, isValidMonth, monthToIndex } from './months';
import { roundMoney } from './money';
import type { Obligation, PurchaseInput } from './types';

export interface ScheduleRow {
  description: string;
  amount: number;
  source: 'existing' | 'proposed';
}

export interface ScheduleMonth {
  month: string;
  label: string;
  shortLabel: string;
  existingTotal: number;
  proposedInstallment: number;
  proposedCash: number;
  rows: ScheduleRow[];
}

export interface ScheduleResult {
  months: ScheduleMonth[];
  warnings: string[];
}

export function buildSchedule(
  obligations: Obligation[],
  purchase: PurchaseInput | null,
  referenceMonth: string,
  horizon = 12,
): ScheduleResult {
  const warnings: string[] = [];
  const start = isValidMonth(referenceMonth) ? referenceMonth : null;
  if (!start) {
    warnings.push('El mes de referencia no es válido. No se armó el calendario.');
    return { months: [], warnings };
  }
  const startIndex = monthToIndex(start);
  if (startIndex === null) {
    warnings.push('El mes de referencia no es válido. No se armó el calendario.');
    return { months: [], warnings };
  }

  const months: ScheduleMonth[] = Array.from({ length: horizon }, (_, offset) => {
    const month = indexToMonth(startIndex + offset);
    return {
      month,
      label: formatMonthLabel(month),
      shortLabel: formatMonthShort(month),
      existingTotal: 0,
      proposedInstallment: 0,
      proposedCash: 0,
      rows: [],
    };
  });
  const byMonth = new Map(months.map((month) => [month.month, month]));

  for (const obligation of obligations) {
    if (!isValidObligation(obligation)) {
      warnings.push(
        `«${obligation.description || 'Sin descripción'}» tiene un monto, un conteo o una fecha que no se puede usar. No entra en el calendario.`,
      );
      continue;
    }
    const paymentCount = Math.min(obligation.remainingPayments, 120);
    if (obligation.remainingPayments > 120) {
      warnings.push(`«${obligation.description || 'Sin descripción'}» tiene más de 120 pagos. El calendario muestra los primeros 120.`);
    }
    for (let offset = 0; offset < paymentCount; offset += 1) {
      const month = addMonths(obligation.nextDueMonth, offset);
      const bucket = month ? byMonth.get(month) : undefined;
      if (!bucket) continue;
      bucket.existingTotal = roundMoney(bucket.existingTotal + obligation.amountPerPayment);
      bucket.rows.push({
        description: obligation.description,
        amount: obligation.amountPerPayment,
        source: 'existing',
      });
    }
  }

  if (
    purchase?.paymentMethod === 'installments' &&
    isValidMonth(purchase.paymentStartMonth) &&
    purchase.installments !== null &&
    Number.isInteger(purchase.installments) &&
    purchase.installments > 0 &&
    purchase.amountPerInstallment !== null &&
    Number.isFinite(purchase.amountPerInstallment) &&
    purchase.amountPerInstallment >= 0
  ) {
    let inside = 0;
    const paymentCount = Math.min(purchase.installments, 120);
    for (let offset = 0; offset < paymentCount; offset += 1) {
      const month = addMonths(purchase.paymentStartMonth, offset);
      const bucket = month ? byMonth.get(month) : undefined;
      if (!bucket) continue;
      inside += 1;
      bucket.proposedInstallment = roundMoney(bucket.proposedInstallment + purchase.amountPerInstallment);
      bucket.rows.push({
        description: purchase.productName || 'Compra propuesta',
        amount: purchase.amountPerInstallment,
        source: 'proposed',
      });
    }
    if (inside === 0) warnings.push('Los pagos de la compra propuesta caen fuera de estos 12 meses.');
  }

  if (
    purchase?.paymentMethod === 'cash' &&
    purchase.totalCashPrice !== null &&
    Number.isFinite(purchase.totalCashPrice) &&
    purchase.totalCashPrice >= 0
  ) {
    const month = isValidMonth(purchase.paymentStartMonth) ? purchase.paymentStartMonth : start;
    const bucket = byMonth.get(month);
    if (!bucket) {
      warnings.push('El pago de contado cae fuera de estos 12 meses.');
    } else {
      bucket.proposedCash = roundMoney(purchase.totalCashPrice);
      bucket.rows.push({
        description: `${purchase.productName || 'Compra propuesta'} (contado, no es mensualidad)`,
        amount: purchase.totalCashPrice,
        source: 'proposed',
      });
    }
  }

  return { months, warnings };
}
