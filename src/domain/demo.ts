import { currentMonth } from './months';
import { emptyRegret, type DebtInclusion, type FinancialProfile, type Obligation, type PurchaseInput, type RegretAnswers } from './types';

export type DemoKind = 'negative' | 'affordable';

export interface DemoScenario {
  kind: DemoKind;
  profile: FinancialProfile;
  purchase: PurchaseInput;
  regret: RegretAnswers;
  obligations: Obligation[];
  debtInclusion: DebtInclusion;
}

export function buildDemo(kind: DemoKind, now = new Date()): DemoScenario {
  const month = currentMonth(now);
  if (kind === 'affordable') return affordableDemo(month);
  return negativeDemo(month, now);
}

function negativeDemo(month: string, now: Date): DemoScenario {
  return {
    kind: 'negative',
    debtInclusion: 'aggregate_includes_listed',
    profile: {
      monthlyNetIncome: 12000,
      incomeStability: 'stable',
      conservativeIncome: null,
      availableCash: 2000,
      essentialExpenses: 7000,
      discretionaryExpenses: 2000,
      existingDebtPayments: 2000,
      emergencyReserveTarget: null,
    },
    purchase: {
      productName: 'Chamarra',
      category: 'Ropa',
      totalCashPrice: 3000,
      paymentMethod: 'installments',
      installments: 3,
      amountPerInstallment: 1000,
      paymentStartMonth: month,
      financingFees: 0,
    },
    regret: {
      ...emptyRegret(),
      needNow: 'unsure',
      alreadyHave: 'no',
      waitOutcome: 'unsure',
    },
    obligations: [
      {
        id: 'demo-audifonos',
        description: 'Audífonos a meses (ejemplo)',
        amountPerPayment: 500,
        remainingPayments: 4,
        nextDueMonth: month,
        createdAt: now.toISOString(),
      },
    ],
  };
}

function affordableDemo(month: string): DemoScenario {
  return {
    kind: 'affordable',
    debtInclusion: 'aggregate_includes_listed',
    profile: {
      monthlyNetIncome: 18000,
      incomeStability: 'stable',
      conservativeIncome: null,
      availableCash: 8000,
      essentialExpenses: 7000,
      discretionaryExpenses: 1500,
      existingDebtPayments: 1000,
      emergencyReserveTarget: 2000,
    },
    purchase: {
      productName: 'Cinturón',
      category: 'Ropa',
      totalCashPrice: 1200,
      paymentMethod: 'installments',
      installments: 3,
      amountPerInstallment: 400,
      paymentStartMonth: month,
      financingFees: 0,
    },
    regret: {
      ...emptyRegret(),
      needNow: 'yes',
      alreadyHave: 'no',
      waitOutcome: 'might_miss',
    },
    obligations: [],
  };
}
