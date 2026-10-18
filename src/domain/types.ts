export type IncomeStability = 'stable' | 'variable';

export interface FinancialProfile {
  monthlyNetIncome: number | null;
  incomeStability: IncomeStability | null;
  conservativeIncome: number | null;
  availableCash: number | null;
  essentialExpenses: number | null;
  discretionaryExpenses: number | null;
  existingDebtPayments: number | null;
  emergencyReserveTarget: number | null;
}

export type PaymentMethod = 'cash' | 'installments';

export interface PurchaseInput {
  productName: string;
  category: string;
  totalCashPrice: number | null;
  paymentMethod: PaymentMethod | null;
  installments: number | null;
  amountPerInstallment: number | null;
  paymentStartMonth: string | null;
  financingFees: number | null;
}

export type NeedNow = 'yes' | 'no' | 'unsure';
export type AlreadyHave = 'yes' | 'no' | 'unsure';
export type WaitOutcome = 'can_wait' | 'might_miss' | 'unsure';

export interface RegretAnswers {
  needNow: NeedNow | null;
  alreadyHave: AlreadyHave | null;
  waitOutcome: WaitOutcome | null;
  waitNote: string;
}

export type DebtInclusion = 'aggregate_includes_listed' | 'listed_are_additional';

export interface Obligation {
  id: string;
  description: string;
  amountPerPayment: number;
  remainingPayments: number;
  nextDueMonth: string;
  createdAt: string;
}

export type Outcome = 'could_buy' | 'better_wait' | 'do_not_buy' | 'insufficient';

export type UserFinalAction =
  | 'accept'
  | 'override_could_buy'
  | 'override_better_wait'
  | 'override_do_not_buy'
  | 'dismiss';

export interface FollowUp {
  stillGlad: boolean | null;
  note: string;
  answeredAt: string;
}

export interface DecisionRecord {
  id: string;
  createdAt: string;
  productName: string;
  category: string;
  engineOutcome: Outcome;
  userFinalAction: UserFinalAction;
  finalLabel: string;
  overridden: boolean;
  retainedPermanently: boolean;
  surplusBefore: number | null;
  surplusAfter: number | null;
  incomeUsed: number | null;
  proposedInstallment: number | null;
  debtCounted: number | null;
  cashAfter: number | null;
  assumptions: string[];
  warnings: string[];
  contextualReasons: string[];
  insufficientReasons: string[];
  purchase: PurchaseInput;
  regret: RegretAnswers;
  followUp: FollowUp | null;
}

export interface DebtCount {
  rule: DebtInclusion;
  aggregate: number;
  listedThisMonth: number;
  listedAdded: number;
  total: number;
  label: string;
  dueCount: number;
}

export interface MonthSurplus {
  month: string;
  debtCounted: number;
  listedAdded: number;
  proposed: number;
  surplusBefore: number;
  surplusAfter: number;
}

export interface CashImpact {
  available: number;
  price: number;
  after: number;
  reserveTarget: number | null;
  breach: 'none' | 'moderate' | 'severe';
}

export interface CostBreakdown {
  cashPrice: number | null;
  fees: number | null;
  financedTotal: number | null;
  scheduledTotal: number | null;
  installmentCount: number | null;
  amountPerInstallment: number | null;
  mismatch: boolean;
}

export interface Assessment {
  outcome: Outcome;
  insufficientReasons: string[];
  warnings: string[];
  assumptions: string[];
  contextualReasons: string[];
  omitted: string[];
  counted: string[];
  shadowClause: string;
  incomeUsed: number | null;
  incomeBasis: 'stable_net' | 'variable_conservative' | null;
  nominalIncome: number | null;
  cost: CostBreakdown;
  debtOnTightestMonth: DebtCount | null;
  proposedInstallment: number | null;
  surplusBefore: number | null;
  surplusAfter: number | null;
  surplusAfterMax: number | null;
  variesByMonth: boolean;
  tightestMonth: string | null;
  months: MonthSurplus[];
  cashImpact: CashImpact | null;
}

export interface AssessmentInput {
  profile: FinancialProfile;
  purchase: PurchaseInput;
  regret: RegretAnswers;
  obligations: Obligation[];
  debtInclusion: DebtInclusion;
  referenceMonth?: string;
}

export const CATEGORIES = [
  'Ropa',
  'Calzado',
  'Hogar',
  'Electrónica',
  'Salud',
  'Transporte',
  'Alimentos',
  'Educación',
  'Otro',
] as const;

export const SHADOW_CLAUSE =
  'La sugerencia se explica y puedes descartarla. No bloqueamos compras, no hay un puntaje oculto de felicidad y la decisión final es tuya.';

export const OUTCOME_LABEL: Record<Outcome, string> = {
  could_buy: 'PODRÍAS COMPRAR',
  better_wait: 'MEJOR ESPERA',
  do_not_buy: 'NO COMPRES POR AHORA',
  insufficient: 'INFORMACIÓN INSUFICIENTE',
};

export function emptyProfile(): FinancialProfile {
  return {
    monthlyNetIncome: null,
    incomeStability: null,
    conservativeIncome: null,
    availableCash: null,
    essentialExpenses: null,
    discretionaryExpenses: null,
    existingDebtPayments: null,
    emergencyReserveTarget: null,
  };
}

export function emptyPurchase(): PurchaseInput {
  return {
    productName: '',
    category: 'Ropa',
    totalCashPrice: null,
    paymentMethod: null,
    installments: null,
    amountPerInstallment: null,
    paymentStartMonth: null,
    financingFees: null,
  };
}

export function emptyRegret(): RegretAnswers {
  return {
    needNow: null,
    alreadyHave: null,
    waitOutcome: null,
    waitNote: '',
  };
}
