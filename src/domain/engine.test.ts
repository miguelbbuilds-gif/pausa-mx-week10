import { describe, expect, it } from 'vitest';
import { assessPurchase } from './engine';
import { buildDemo } from './demo';
import { buildSchedule } from './schedule';
import { splitAcrossInstallments } from './money';
import { addMonths, isValidMonth } from './months';
import { emptyProfile, emptyPurchase, emptyRegret, type FinancialProfile, type PurchaseInput } from './types';

const NOW = new Date(2026, 9, 18, 12, 0, 0);

function profile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
  return {
    monthlyNetIncome: 12000,
    incomeStability: 'stable',
    conservativeIncome: null,
    availableCash: 2000,
    essentialExpenses: 7000,
    discretionaryExpenses: 2000,
    existingDebtPayments: 2000,
    emergencyReserveTarget: null,
    ...overrides,
  };
}

function installment(overrides: Partial<PurchaseInput> = {}): PurchaseInput {
  return {
    productName: 'Chamarra',
    category: 'Ropa',
    totalCashPrice: 3000,
    paymentMethod: 'installments',
    installments: 3,
    amountPerInstallment: 1000,
    paymentStartMonth: '2026-10',
    financingFees: 0,
    ...overrides,
  };
}

describe('purchase assessment', () => {
  it('recommends against a purchase when monthly surplus is negative', () => {
    const result = assessPurchase({
      profile: profile(),
      purchase: installment({ amountPerInstallment: 2000, installments: 2, totalCashPrice: 4000 }),
      regret: { ...emptyRegret(), needNow: 'yes', alreadyHave: 'no', waitOutcome: 'might_miss' },
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });

    expect(result.outcome).toBe('do_not_buy');
    expect(result.surplusBefore).toBe(1000);
    expect(result.surplusAfter).toBe(-1000);
    expect(result.proposedInstallment).toBe(2000);
  });

  it('keeps the fictional clothing example at zero surplus and a separate cash shortfall of 1000', () => {
    const scenario = buildDemo('negative', NOW);
    const result = assessPurchase({
      ...scenario,
      referenceMonth: '2026-10',
    });

    expect(result.outcome).toBe('do_not_buy');
    expect(result.incomeUsed).toBe(12000);
    expect(result.surplusBefore).toBe(1000);
    expect(result.surplusAfter).toBe(0);
    expect(result.cashImpact?.after).toBe(-1000);
    expect(result.debtOnTightestMonth?.listedThisMonth).toBe(500);
    expect(result.debtOnTightestMonth?.listedAdded).toBe(0);
    expect(result.debtOnTightestMonth?.total).toBe(2000);
    expect(result.surplusAfter).not.toBe(result.cashImpact?.after);
    expect('score' in result).toBe(false);
    expect('happinessScore' in result).toBe(false);
  });

  it('recommends the contrasting affordable case when surplus stays positive', () => {
    const scenario = buildDemo('affordable', NOW);
    const result = assessPurchase({ ...scenario, referenceMonth: '2026-10' });

    expect(result.outcome).toBe('could_buy');
    expect(result.surplusAfter).toBe(8100);
    expect(result.cashImpact?.breach).toBe('none');
  });

  it('returns insufficient information when required inputs are missing', () => {
    const result = assessPurchase({
      profile: emptyProfile(),
      purchase: emptyPurchase(),
      regret: emptyRegret(),
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
    });

    expect(result.outcome).toBe('insufficient');
    expect(result.surplusAfter).toBeNull();
    expect(result.insufficientReasons.length).toBeGreaterThan(0);
  });

  it('treats a cash purchase as a balance change and not as monthly income', () => {
    const result = assessPurchase({
      profile: profile({
        monthlyNetIncome: 15000,
        availableCash: 5000,
        essentialExpenses: 5000,
        discretionaryExpenses: 1000,
        existingDebtPayments: 0,
        emergencyReserveTarget: 2000,
      }),
      purchase: installment({
        paymentMethod: 'cash',
        totalCashPrice: 1000,
        installments: null,
        amountPerInstallment: null,
        financingFees: null,
      }),
      regret: { ...emptyRegret(), needNow: 'yes', alreadyHave: 'no', waitOutcome: 'might_miss' },
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });

    expect(result.outcome).toBe('could_buy');
    expect(result.incomeUsed).toBe(15000);
    expect(result.proposedInstallment).toBe(0);
    expect(result.surplusAfter).toBe(9000);
    expect(result.cashImpact).toEqual({
      available: 5000,
      price: 1000,
      after: 4000,
      reserveTarget: 2000,
      breach: 'none',
    });
  });

  it('counts disclosed financing fees once and flags an installment mismatch', () => {
    const matched = assessPurchase({
      profile: profile({
        monthlyNetIncome: 20000,
        availableCash: 5000,
        essentialExpenses: 5000,
        discretionaryExpenses: 1000,
        existingDebtPayments: 0,
      }),
      purchase: installment({
        totalCashPrice: 3000,
        financingFees: 300,
        installments: 3,
        amountPerInstallment: 1100,
      }),
      regret: emptyRegret(),
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });

    expect(matched.cost.financedTotal).toBe(3300);
    expect(matched.cost.scheduledTotal).toBe(3300);
    expect(matched.cost.mismatch).toBe(false);
    expect(matched.proposedInstallment).toBe(1100);
    expect(matched.surplusAfter).toBe(12900);

    const mismatched = assessPurchase({
      profile: profile({
        monthlyNetIncome: 20000,
        availableCash: 5000,
        essentialExpenses: 5000,
        discretionaryExpenses: 1000,
        existingDebtPayments: 0,
      }),
      purchase: installment({
        totalCashPrice: 3000,
        financingFees: 300,
        installments: 3,
        amountPerInstallment: 1000,
      }),
      regret: emptyRegret(),
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });

    expect(mismatched.cost.mismatch).toBe(true);
    expect(mismatched.proposedInstallment).toBe(1000);
    expect(mismatched.surplusAfter).toBe(13000);
    expect(mismatched.warnings.some((warning) => warning.includes('no coincide'))).toBe(true);
  });

  it('uses conservative income for variable pay, not the higher nominal month', () => {
    const result = assessPurchase({
      profile: profile({
        monthlyNetIncome: 15000,
        incomeStability: 'variable',
        conservativeIncome: 10000,
        availableCash: 5000,
        essentialExpenses: 7000,
        discretionaryExpenses: 2000,
        existingDebtPayments: 1500,
      }),
      purchase: installment({
        paymentMethod: 'cash',
        totalCashPrice: 100,
        installments: null,
        amountPerInstallment: null,
        financingFees: 0,
      }),
      regret: { ...emptyRegret(), needNow: 'yes', alreadyHave: 'no', waitOutcome: 'unsure' },
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });

    expect(result.incomeBasis).toBe('variable_conservative');
    expect(result.incomeUsed).toBe(10000);
    expect(result.nominalIncome).toBe(15000);
    expect(result.surplusAfter).toBe(-500);
    expect(result.outcome).toBe('do_not_buy');
  });

  it('does not double count listed obligations already included in the aggregate', () => {
    const shared = {
      profile: profile(),
      purchase: installment({ installments: 1, amountPerInstallment: 1000, totalCashPrice: 1000 }),
      regret: emptyRegret(),
      obligations: [
        {
          id: 'phones',
          description: 'Audífonos',
          amountPerPayment: 500,
          remainingPayments: 1,
          nextDueMonth: '2026-10',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      referenceMonth: '2026-10',
    };

    const included = assessPurchase({ ...shared, debtInclusion: 'aggregate_includes_listed' });
    const additional = assessPurchase({ ...shared, debtInclusion: 'listed_are_additional' });

    expect(included.debtOnTightestMonth?.total).toBe(2000);
    expect(included.debtOnTightestMonth?.listedAdded).toBe(0);
    expect(included.surplusAfter).toBe(0);
    expect(additional.debtOnTightestMonth?.listedThisMonth).toBe(500);
    expect(additional.debtOnTightestMonth?.listedAdded).toBe(500);
    expect(additional.debtOnTightestMonth?.total).toBe(2500);
    expect(additional.surplusAfter).toBe(-500);
  });

  it('adds overlapping installments only in the months they are due', () => {
    const result = assessPurchase({
      profile: profile(),
      purchase: installment({ installments: 2, amountPerInstallment: 1000, totalCashPrice: 2000 }),
      regret: emptyRegret(),
      obligations: [
        {
          id: 'later',
          description: 'Pago posterior',
          amountPerPayment: 500,
          remainingPayments: 1,
          nextDueMonth: '2026-12',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      debtInclusion: 'listed_are_additional',
      referenceMonth: '2026-10',
    });

    expect(result.months).toHaveLength(2);
    expect(result.months.every((month) => month.listedAdded === 0)).toBe(true);
    expect(result.surplusAfter).toBe(0);

    const schedule = buildSchedule(result.months.length ? [
      {
        id: 'a',
        description: 'Uno',
        amountPerPayment: 400,
        remainingPayments: 2,
        nextDueMonth: '2026-10',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'b',
        description: 'Dos',
        amountPerPayment: 600,
        remainingPayments: 1,
        nextDueMonth: '2026-10',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ] : [], installment({ installments: 2, amountPerInstallment: 1000 }), '2026-10');

    expect(schedule.months[0]?.existingTotal).toBe(1000);
    expect(schedule.months[0]?.proposedInstallment).toBe(1000);
    expect(schedule.months[1]?.existingTotal).toBe(400);
    expect(schedule.months[1]?.proposedInstallment).toBe(1000);
    expect(schedule.months[2]?.existingTotal).toBe(0);
  });

  it('lets regret context suggest waiting without overriding a negative surplus or creating a score', () => {
    const comfortable = {
      profile: profile({
        monthlyNetIncome: 18000,
        availableCash: 8000,
        essentialExpenses: 7000,
        discretionaryExpenses: 1500,
        existingDebtPayments: 1000,
        emergencyReserveTarget: 2000,
      }),
      purchase: installment({ totalCashPrice: 1200, installments: 3, amountPerInstallment: 400 }),
      obligations: [],
      debtInclusion: 'aggregate_includes_listed' as const,
      referenceMonth: '2026-10',
    };
    const wanting = assessPurchase({
      ...comfortable,
      regret: { ...emptyRegret(), needNow: 'yes', alreadyHave: 'no', waitOutcome: 'might_miss' },
    });
    const waiting = assessPurchase({
      ...comfortable,
      regret: { ...emptyRegret(), needNow: 'no', alreadyHave: 'yes', waitOutcome: 'can_wait' },
    });
    const pressured = assessPurchase({
      profile: profile(),
      purchase: installment({ amountPerInstallment: 2000, installments: 2, totalCashPrice: 4000 }),
      regret: { ...emptyRegret(), needNow: 'yes', alreadyHave: 'no', waitOutcome: 'might_miss' },
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });

    expect(wanting.outcome).toBe('could_buy');
    expect(wanting.contextualReasons).toEqual([]);
    expect(waiting.outcome).toBe('better_wait');
    expect(waiting.contextualReasons).toHaveLength(3);
    expect(waiting.surplusAfter).toBe(wanting.surplusAfter);
    expect(pressured.outcome).toBe('do_not_buy');
    expect(pressured.surplusAfter).toBe(-1000);
    expect('score' in waiting).toBe(false);
  });

  it('rejects negative values, invalid months, and division by zero', () => {
    const negative = assessPurchase({
      profile: profile({ essentialExpenses: -10 }),
      purchase: installment(),
      regret: emptyRegret(),
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
    });
    const badMonth = assessPurchase({
      profile: profile(),
      purchase: installment({ paymentStartMonth: '2026-13' }),
      regret: emptyRegret(),
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
    });
    const zeroPayments = assessPurchase({
      profile: profile(),
      purchase: installment({ installments: 0 }),
      regret: emptyRegret(),
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
    });

    expect(negative.outcome).toBe('insufficient');
    expect(negative.surplusAfter).toBeNull();
    expect(badMonth.outcome).toBe('insufficient');
    expect(zeroPayments.outcome).toBe('insufficient');
    expect(splitAcrossInstallments(3000, 0)).toBeNull();
    expect(splitAcrossInstallments(3000, -2)).toBeNull();
    expect(splitAcrossInstallments(3300, 3)).toBe(1100);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-00')).toBe(false);
    expect(addMonths('2026-13', 1)).toBeNull();
  });

  it('distinguishes a severe emergency-reserve breach from a moderate one', () => {
    const base = profile({
      monthlyNetIncome: 15000,
      availableCash: 2000,
      essentialExpenses: 4000,
      discretionaryExpenses: 1000,
      existingDebtPayments: 0,
      emergencyReserveTarget: 1000,
    });
    const severe = assessPurchase({
      profile: base,
      purchase: installment({
        paymentMethod: 'cash',
        totalCashPrice: 1800,
        installments: null,
        amountPerInstallment: null,
      }),
      regret: { ...emptyRegret(), needNow: 'yes', alreadyHave: 'no', waitOutcome: 'unsure' },
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });
    const moderate = assessPurchase({
      profile: base,
      purchase: installment({
        paymentMethod: 'cash',
        totalCashPrice: 1200,
        installments: null,
        amountPerInstallment: null,
      }),
      regret: { ...emptyRegret(), needNow: 'yes', alreadyHave: 'no', waitOutcome: 'unsure' },
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });

    expect(severe.cashImpact?.after).toBe(200);
    expect(severe.cashImpact?.breach).toBe('severe');
    expect(severe.outcome).toBe('do_not_buy');
    expect(moderate.cashImpact?.after).toBe(800);
    expect(moderate.cashImpact?.breach).toBe('moderate');
    expect(moderate.outcome).toBe('better_wait');
    expect(moderate.surplusAfter).toBeGreaterThan(0);
  });
});
