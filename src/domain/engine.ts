import { countMonthlyDebt, isValidObligation } from './debt';
import { addMonths, currentMonth, isValidMonth } from './months';
import { compareMoney, isUsableAmount, roundMoney } from './money';
import {
  SHADOW_CLAUSE,
  type Assessment,
  type AssessmentInput,
  type CashImpact,
  type CostBreakdown,
  type FinancialProfile,
  type MonthSurplus,
  type Outcome,
  type PurchaseInput,
  type RegretAnswers,
} from './types';

export type { Assessment, AssessmentInput };

const MISMATCH_TOLERANCE = 0.5;

const OMITTED = [
  'Deudas, suscripciones o pagos que no escribiste.',
  'Otras aplicaciones de meses. Esta app no se conecta a ellas ni ve sus saldos.',
  'Ingresos o gastos distintos de los que declaraste.',
];

function invalidAmount(value: number | null): boolean {
  return value !== null && !isUsableAmount(value);
}

function pushIfInvalid(reasons: string[], label: string, value: number | null) {
  if (invalidAmount(value)) reasons.push(`${label} no puede ser negativo ni un número inválido.`);
}

export function assessPurchase(input: AssessmentInput): Assessment {
  const warnings: string[] = [];
  const assumptions: string[] = [
    'Estas cuentas usan solo lo que escribiste a mano. No son una foto completa de tu dinero.',
  ];
  const insufficientReasons: string[] = [];
  const profile = input.profile;
  const purchase = input.purchase;
  const referenceMonth = isValidMonth(input.referenceMonth) ? input.referenceMonth : currentMonth();
  if (input.referenceMonth && !isValidMonth(input.referenceMonth)) {
    warnings.push('El mes de referencia no es válido. Se usa el mes actual.');
  }

  pushIfInvalid(insufficientReasons, 'El ingreso neto', profile.monthlyNetIncome);
  pushIfInvalid(insufficientReasons, 'El ingreso conservador', profile.conservativeIncome);
  pushIfInvalid(insufficientReasons, 'El efectivo disponible', profile.availableCash);
  pushIfInvalid(insufficientReasons, 'Los gastos esenciales', profile.essentialExpenses);
  pushIfInvalid(insufficientReasons, 'Los gastos discrecionales', profile.discretionaryExpenses);
  pushIfInvalid(insufficientReasons, 'Los pagos de deuda', profile.existingDebtPayments);
  pushIfInvalid(insufficientReasons, 'La reserva de emergencia', profile.emergencyReserveTarget);
  pushIfInvalid(insufficientReasons, 'El precio', purchase.totalCashPrice);
  pushIfInvalid(insufficientReasons, 'La mensualidad', purchase.amountPerInstallment);
  pushIfInvalid(insufficientReasons, 'Las comisiones', purchase.financingFees);
  if (purchase.installments !== null && (!Number.isFinite(purchase.installments) || purchase.installments < 0)) {
    insufficientReasons.push('El número de pagos no puede ser negativo ni inválido.');
  }

  let incomeUsed: number | null = null;
  let incomeBasis: 'stable_net' | 'variable_conservative' | null = null;
  if (!profile.incomeStability) {
    insufficientReasons.push('Falta indicar si el ingreso es estable o variable.');
  } else if (profile.incomeStability === 'stable') {
    if (profile.monthlyNetIncome === null) insufficientReasons.push('Falta el ingreso neto mensual.');
    else if (isUsableAmount(profile.monthlyNetIncome)) {
      incomeUsed = profile.monthlyNetIncome;
      incomeBasis = 'stable_net';
      assumptions.push('Ingreso estable: el excedente usa el ingreso neto mensual que escribiste.');
    }
  } else if (profile.conservativeIncome === null) {
    insufficientReasons.push('Con ingreso variable hace falta el ingreso conservador. No usamos el mes más alto en su lugar.');
  } else if (isUsableAmount(profile.conservativeIncome)) {
    incomeUsed = profile.conservativeIncome;
    incomeBasis = 'variable_conservative';
    assumptions.push('Ingreso variable: el excedente usa el ingreso conservador, no el ingreso de un mes alto.');
    if (isUsableAmount(profile.monthlyNetIncome) && compareMoney(profile.conservativeIncome, profile.monthlyNetIncome) > 0) {
      warnings.push('El ingreso conservador es mayor que el ingreso neto declarado. Conviene revisarlo.');
    }
  }

  if (profile.essentialExpenses === null) insufficientReasons.push('Faltan los gastos esenciales.');
  if (profile.discretionaryExpenses === null) {
    insufficientReasons.push('Faltan los gastos discrecionales. Si no tienes, escribe 0.');
  }
  if (profile.existingDebtPayments === null) {
    insufficientReasons.push('Faltan los pagos de deuda que ya tienes. Si no tienes, escribe 0.');
  }
  if (profile.availableCash === null) insufficientReasons.push('Falta el efectivo disponible.');
  if (purchase.totalCashPrice === null) insufficientReasons.push('Falta el precio de contado.');
  if (!purchase.paymentMethod) insufficientReasons.push('Falta la forma de pago.');
  if (purchase.totalCashPrice === 0) warnings.push('El precio escrito es 0.');

  const cost = buildCost(purchase, warnings, assumptions, insufficientReasons);
  for (const obligation of input.obligations) {
    if (!isValidObligation(obligation)) {
      warnings.push(
        `La obligación «${obligation.description || 'Sin descripción'}» tiene datos no válidos y no entra al excedente ni al calendario.`,
      );
    }
  }

  const contextualReasons = regretReasons(input.regret);
  assumptions.push('Las respuestas sobre necesitarlo, tener algo parecido o esperar 7 días no son un puntaje. Solo dan contexto.');
  assumptions.push(
    'Si el excedente después del pago nuevo es negativo o exactamente cero, la sugerencia es no comprar por ahora.',
  );

  const base = {
    insufficientReasons,
    warnings,
    assumptions,
    contextualReasons,
    omitted: OMITTED,
    incomeUsed,
    incomeBasis,
    nominalIncome: profile.monthlyNetIncome,
    cost,
    shadowClause: SHADOW_CLAUSE,
  };

  if (insufficientReasons.length > 0 || incomeUsed === null || !readyForMath(profile, purchase)) {
    return {
      ...base,
      outcome: 'insufficient' as Outcome,
      counted: countedLabels(incomeBasis, false),
      debtOnTightestMonth: null,
      proposedInstallment: null,
      surplusBefore: null,
      surplusAfter: null,
      surplusAfterMax: null,
      variesByMonth: false,
      tightestMonth: null,
      months: [] as MonthSurplus[],
      cashImpact: cashImpact(profile, purchase),
    };
  }

  const essentials = profile.essentialExpenses as number;
  const discretionary = profile.discretionaryExpenses as number;
  const aggregate = profile.existingDebtPayments as number;
  const monthsToScore = monthsForPurchase(purchase, referenceMonth);
  const proposedMonthly = purchase.paymentMethod === 'cash' ? 0 : (purchase.amountPerInstallment as number);

  const months: MonthSurplus[] = monthsToScore.map((month) => {
    const debt = countMonthlyDebt(aggregate, input.obligations, input.debtInclusion, month);
    const proposed = purchase.paymentMethod === 'cash' ? 0 : proposedMonthly;
    const surplusBefore = roundMoney(incomeUsed - essentials - discretionary - debt.total);
    const surplusAfter = roundMoney(surplusBefore - proposed);
    return {
      month,
      debtCounted: debt.total,
      listedAdded: debt.listedAdded,
      proposed,
      surplusBefore,
      surplusAfter,
    };
  });

  const tightest = months.reduce((worst, month) => (month.surplusAfter < worst.surplusAfter ? month : worst));
  const richest = months.reduce((best, month) => (month.surplusAfter > best.surplusAfter ? month : best));
  const debtOnTightestMonth = countMonthlyDebt(aggregate, input.obligations, input.debtInclusion, tightest.month);
  const variesByMonth = months.some((month) => month.surplusAfter !== tightest.surplusAfter);
  if (variesByMonth) {
    assumptions.push('Los meses no salen iguales. La sugerencia usa el mes con menor excedente.');
  }
  assumptions.push(debtOnTightestMonth.label);
  assumptions.push('El efectivo disponible no se suma al ingreso mensual.');
  if (profile.emergencyReserveTarget === null) {
    assumptions.push('No definiste una reserva de emergencia, así que no comparamos el efectivo contra una meta.');
  }

  const impact = cashImpact(profile, purchase);
  let outcome: Outcome = compareMoney(tightest.surplusAfter, 0) <= 0 ? 'do_not_buy' : 'could_buy';
  if (compareMoney(tightest.surplusAfter, 0) === 0) {
    warnings.push('El excedente mensual queda en cero. No hay margen para un gasto que no hayas escrito.');
  }
  if (purchase.paymentMethod === 'cash' && impact) {
    if (impact.breach === 'severe') outcome = 'do_not_buy';
    else if (impact.breach === 'moderate' && outcome === 'could_buy') outcome = 'better_wait';
  } else if (purchase.paymentMethod === 'installments' && impact && impact.breach !== 'none') {
    warnings.push('Tu efectivo está por debajo de la reserva o no cubre el precio de contado. Esta compra es a meses: la sugerencia mensual usa el excedente, no ese efectivo como si fuera ingreso.');
  }

  if (outcome === 'could_buy' && contextualReasons.length > 0) {
    outcome = 'better_wait';
    assumptions.push('Hay un motivo de contexto para esperar. Puedes descartarlo: no cambia las cuentas.');
  } else if (outcome === 'do_not_buy' && contextualReasons.length > 0) {
    assumptions.push('Las respuestas de contexto no suavizan una sugerencia de no comprar cuando el excedente no queda por encima de cero o el efectivo no alcanza.');
  }

  return {
    ...base,
    outcome,
    counted: countedLabels(incomeBasis, true),
    debtOnTightestMonth,
    proposedInstallment: proposedMonthly,
    surplusBefore: tightest.surplusBefore,
    surplusAfter: tightest.surplusAfter,
    surplusAfterMax: richest.surplusAfter,
    variesByMonth,
    tightestMonth: tightest.month,
    months,
    cashImpact: impact,
  };
}

function readyForMath(profile: FinancialProfile, purchase: PurchaseInput): boolean {
  if (!isUsableAmount(profile.essentialExpenses)) return false;
  if (!isUsableAmount(profile.discretionaryExpenses)) return false;
  if (!isUsableAmount(profile.existingDebtPayments)) return false;
  if (!isUsableAmount(profile.availableCash)) return false;
  if (!isUsableAmount(purchase.totalCashPrice)) return false;
  if (purchase.paymentMethod === 'cash') return true;
  if (purchase.paymentMethod !== 'installments') return false;
  return (
    purchase.installments !== null &&
    Number.isInteger(purchase.installments) &&
    purchase.installments > 0 &&
    isUsableAmount(purchase.amountPerInstallment) &&
    !(purchase.amountPerInstallment === 0 && purchase.totalCashPrice > 0) &&
    isValidMonth(purchase.paymentStartMonth)
  );
}

function buildCost(
  purchase: PurchaseInput,
  warnings: string[],
  assumptions: string[],
  insufficientReasons: string[],
): CostBreakdown {
  const cost: CostBreakdown = {
    cashPrice: isUsableAmount(purchase.totalCashPrice) ? purchase.totalCashPrice : null,
    fees: purchase.financingFees,
    financedTotal: null,
    scheduledTotal: null,
    installmentCount: purchase.installments,
    amountPerInstallment: isUsableAmount(purchase.amountPerInstallment) ? purchase.amountPerInstallment : null,
    mismatch: false,
  };
  if (purchase.paymentMethod === 'cash') {
    assumptions.push('Pago de contado: el precio se resta del efectivo de hoy. No entra como mensualidad ni como ingreso.');
    if (isUsableAmount(purchase.financingFees) && purchase.financingFees > 0) {
      warnings.push('Indicaste comisiones en un pago de contado. El golpe al efectivo usa solo el precio. Si hay un cargo extra, súmalo al precio.');
    }
    return cost;
  }
  if (purchase.paymentMethod !== 'installments') return cost;
  if (purchase.installments !== null && purchase.installments > 120) {
    warnings.push('Hay más de 120 pagos. La sugerencia revisa los primeros 120 meses.');
  }
  if (purchase.installments === 0 || (purchase.installments !== null && !Number.isInteger(purchase.installments))) {
    insufficientReasons.push('El número de pagos debe ser un entero mayor que cero.');
  } else if (purchase.installments === null) {
    insufficientReasons.push('Falta el número de pagos.');
  }
  if (purchase.amountPerInstallment === null) insufficientReasons.push('Falta el monto de cada pago.');
  else if (purchase.amountPerInstallment === 0 && (purchase.totalCashPrice ?? 0) > 0) {
    insufficientReasons.push('La mensualidad es 0 pero el precio no. Revisa los pagos para no simular una compra sin costo.');
  }
  if (!isValidMonth(purchase.paymentStartMonth)) insufficientReasons.push('El mes de inicio del pago no es válido.');
  if (purchase.financingFees === null) {
    warnings.push('No declaraste comisiones. No las ponemos en cero: el total financiado no incluye cargos que no escribiste.');
    assumptions.push('Las comisiones desconocidas no se inventan.');
  } else {
    assumptions.push('Las comisiones declaradas entran al costo total. El excedente usa la mensualidad que escribiste, sin sumar la comisión otra vez.');
  }
  if (
    purchase.installments !== null &&
    Number.isInteger(purchase.installments) &&
    purchase.installments > 0 &&
    isUsableAmount(purchase.amountPerInstallment)
  ) {
    cost.scheduledTotal = roundMoney(purchase.installments * purchase.amountPerInstallment);
  }
  if (isUsableAmount(purchase.totalCashPrice) && isUsableAmount(purchase.financingFees)) {
    cost.financedTotal = roundMoney(purchase.totalCashPrice + purchase.financingFees);
  }
  if (cost.scheduledTotal !== null && cost.financedTotal !== null) {
    cost.mismatch = Math.abs(cost.scheduledTotal - cost.financedTotal) > MISMATCH_TOLERANCE;
    if (cost.mismatch) {
      warnings.push('La suma de las mensualidades no coincide con el precio más las comisiones. El excedente usa la mensualidad escrita, no un promedio escondido.');
    }
  }
  return cost;
}

function monthsForPurchase(purchase: PurchaseInput, referenceMonth: string): string[] {
  if (purchase.paymentMethod === 'cash') return [referenceMonth];
  if (
    purchase.paymentMethod === 'installments' &&
    isValidMonth(purchase.paymentStartMonth) &&
    purchase.installments !== null &&
    purchase.installments > 0
  ) {
    const count = Math.min(purchase.installments, 120);
    const months: string[] = [];
    for (let offset = 0; offset < count; offset += 1) {
      const month = addMonths(purchase.paymentStartMonth, offset);
      if (month) months.push(month);
    }
    return months.length > 0 ? months : [referenceMonth];
  }
  return [referenceMonth];
}

function cashImpact(profile: FinancialProfile, purchase: PurchaseInput): CashImpact | null {
  if (!isUsableAmount(profile.availableCash) || !isUsableAmount(purchase.totalCashPrice)) return null;
  const after = roundMoney(profile.availableCash - purchase.totalCashPrice);
  const reserve = isUsableAmount(profile.emergencyReserveTarget) ? profile.emergencyReserveTarget : null;
  let breach: CashImpact['breach'] = 'none';
  if (compareMoney(after, 0) < 0) breach = 'severe';
  else if (reserve !== null && compareMoney(after, reserve) < 0) {
    breach = compareMoney(after, reserve * 0.5) < 0 ? 'severe' : 'moderate';
  }
  return {
    available: profile.availableCash,
    price: purchase.totalCashPrice,
    after,
    reserveTarget: reserve,
    breach,
  };
}

function regretReasons(regret: RegretAnswers): string[] {
  const reasons: string[] = [];
  if (regret.needNow === 'no') reasons.push('Respondiste que no lo necesitas ahora.');
  if (regret.alreadyHave === 'yes') reasons.push('Respondiste que ya tienes algo que cumple la misma función.');
  if (regret.waitOutcome === 'can_wait') reasons.push('Respondiste que esperar 7 días no te deja sin algo importante.');
  return reasons;
}

function countedLabels(basis: 'stable_net' | 'variable_conservative' | null, complete: boolean): string[] {
  if (!complete) return ['Todavía no hay una cuenta cerrada: faltan datos o hay un valor no válido.'];
  return [
    basis === 'variable_conservative' ? 'Ingreso conservador' : 'Ingreso neto mensual',
    'Gastos esenciales',
    'Gastos discrecionales',
    'Deuda mensual según la regla de inclusión',
    'Mensualidad nueva, o cero si el pago es de contado',
  ];
}

