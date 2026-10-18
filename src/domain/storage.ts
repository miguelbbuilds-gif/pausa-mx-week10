import { purgeExpiredDecisions } from './history';
import {
  emptyProfile,
  type DecisionRecord,
  type DebtInclusion,
  type FinancialProfile,
  type FollowUp,
  type Obligation,
  type PurchaseInput,
  type RegretAnswers,
  type UserFinalAction,
} from './types';

export const STORAGE_KEY = 'pausa-mx-state-v1';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistedState {
  version: 1;
  profile: FinancialProfile;
  debtInclusion: DebtInclusion;
  obligations: Obligation[];
  decisions: DecisionRecord[];
  draftPurchase: PurchaseInput | null;
  draftRegret: RegretAnswers | null;
  demoMode: boolean;
  demoKind: 'negative' | 'affordable' | null;
}

export interface LoadResult {
  state: PersistedState;
  recovered: boolean;
  notice: string | null;
}

export function defaultState(): PersistedState {
  return {
    version: 1,
    profile: emptyProfile(),
    debtInclusion: 'aggregate_includes_listed',
    obligations: [],
    decisions: [],
    draftPurchase: null,
    draftRegret: null,
    demoMode: false,
    demoKind: null,
  };
}

export function loadPersisted(store: KeyValueStore): LoadResult {
  const reset: LoadResult = {
    state: defaultState(),
    recovered: true,
    notice: 'No se pudo leer lo guardado en este navegador. Empezamos de nuevo y no inventamos datos.',
  };
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null || raw.trim() === '') {
      return { state: defaultState(), recovered: false, notice: null };
    }
    const parsed: unknown = JSON.parse(raw);
    const sanitized = sanitizeState(parsed);
    if (!sanitized) return reset;
    return { state: sanitized.state, recovered: false, notice: sanitized.notice };
  } catch {
    return reset;
  }
}

export function savePersisted(store: KeyValueStore, state: PersistedState): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearPersisted(store: KeyValueStore): void {
  store.removeItem(STORAGE_KEY);
}

export function serializeExport(state: PersistedState, exportedAt: string): string {
  return JSON.stringify(
    {
      app: 'PAUSA MX',
      disclaimer:
        'Exportación local. Prototipo de ficción. No es asesoría financiera. Este archivo no se envió a ningún servidor.',
      exportedAt,
      data: state,
    },
    null,
    2,
  );
}

export function stateAfterHistoryPurge(state: PersistedState, now: Date): PersistedState {
  const { kept } = purgeExpiredDecisions(state.decisions, now);
  return { ...state, decisions: kept };
}

function sanitizeState(value: unknown): { state: PersistedState; notice: string | null } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;
  const profile = sanitizeProfile(record.profile);
  if (!profile) return null;
  const debtInclusion = record.debtInclusion === 'listed_are_additional' ? 'listed_are_additional' : 'aggregate_includes_listed';
  const obligations = Array.isArray(record.obligations) ? record.obligations.flatMap(sanitizeObligation) : [];
  const decisions = Array.isArray(record.decisions) ? record.decisions.flatMap(sanitizeDecision) : [];
  const droppedObligations = Array.isArray(record.obligations) && obligations.length !== record.obligations.length;
  const droppedDecisions = Array.isArray(record.decisions) && decisions.length !== record.decisions.length;
  const notice = droppedObligations || droppedDecisions
    ? 'Algunos registros guardados estaban incompletos y no se cargaron.'
    : null;
  return {
    notice,
    state: {
      version: 1,
      profile,
      debtInclusion,
      obligations,
      decisions,
      draftPurchase: sanitizePurchase(record.draftPurchase),
      draftRegret: sanitizeRegret(record.draftRegret),
      demoMode: record.demoMode === true,
      demoKind: record.demoKind === 'negative' || record.demoKind === 'affordable' ? record.demoKind : null,
    },
  };
}

function sanitizeProfile(value: unknown): FinancialProfile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const monthlyNetIncome = asAmount(record.monthlyNetIncome);
  const conservativeIncome = asAmount(record.conservativeIncome);
  const availableCash = asAmount(record.availableCash);
  const essentialExpenses = asAmount(record.essentialExpenses);
  const discretionaryExpenses = asAmount(record.discretionaryExpenses);
  const existingDebtPayments = asAmount(record.existingDebtPayments);
  const emergencyReserveTarget = asAmount(record.emergencyReserveTarget);
  if (
    monthlyNetIncome === undefined ||
    conservativeIncome === undefined ||
    availableCash === undefined ||
    essentialExpenses === undefined ||
    discretionaryExpenses === undefined ||
    existingDebtPayments === undefined ||
    emergencyReserveTarget === undefined
  ) {
    return null;
  }
  const incomeStability = record.incomeStability === 'stable' || record.incomeStability === 'variable'
    ? record.incomeStability
    : record.incomeStability === null
      ? null
      : undefined;
  if (incomeStability === undefined) return null;
  return {
    monthlyNetIncome,
    incomeStability,
    conservativeIncome,
    availableCash,
    essentialExpenses,
    discretionaryExpenses,
    existingDebtPayments,
    emergencyReserveTarget,
  };
}

function sanitizeObligation(value: unknown): Obligation[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.description !== 'string') return [];
  if (typeof record.amountPerPayment !== 'number' || !Number.isFinite(record.amountPerPayment)) return [];
  if (typeof record.remainingPayments !== 'number' || !Number.isInteger(record.remainingPayments)) return [];
  if (typeof record.nextDueMonth !== 'string' || typeof record.createdAt !== 'string') return [];
  return [{
    id: record.id,
    description: record.description,
    amountPerPayment: record.amountPerPayment,
    remainingPayments: record.remainingPayments,
    nextDueMonth: record.nextDueMonth,
    createdAt: record.createdAt,
  }];
}

function sanitizeDecision(value: unknown): DecisionRecord[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.createdAt !== 'string') return [];
  if (typeof record.productName !== 'string' || typeof record.category !== 'string') return [];
  if (!isOutcome(record.engineOutcome) || !isAction(record.userFinalAction)) return [];
  if (typeof record.finalLabel !== 'string' || typeof record.overridden !== 'boolean') return [];
  if (typeof record.retainedPermanently !== 'boolean') return [];
  const purchase = sanitizePurchase(record.purchase);
  const regret = sanitizeRegret(record.regret);
  if (!purchase || !regret) return [];
  return [{
    id: record.id,
    createdAt: record.createdAt,
    productName: record.productName,
    category: record.category,
    engineOutcome: record.engineOutcome,
    userFinalAction: record.userFinalAction,
    finalLabel: record.finalLabel,
    overridden: record.overridden,
    retainedPermanently: record.retainedPermanently,
    surplusBefore: asNullableNumber(record.surplusBefore),
    surplusAfter: asNullableNumber(record.surplusAfter),
    incomeUsed: asNullableNumber(record.incomeUsed),
    proposedInstallment: asNullableNumber(record.proposedInstallment),
    debtCounted: asNullableNumber(record.debtCounted),
    cashAfter: asNullableNumber(record.cashAfter),
    assumptions: asStringList(record.assumptions),
    warnings: asStringList(record.warnings),
    contextualReasons: asStringList(record.contextualReasons),
    insufficientReasons: asStringList(record.insufficientReasons),
    purchase,
    regret,
    followUp: sanitizeFollowUp(record.followUp),
  }];
}

function sanitizePurchase(value: unknown): PurchaseInput | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.productName !== 'string' || typeof record.category !== 'string') return null;
  const totalCashPrice = asAmount(record.totalCashPrice);
  const installments = record.installments === null ? null : typeof record.installments === 'number' && Number.isFinite(record.installments) ? record.installments : undefined;
  const amountPerInstallment = asAmount(record.amountPerInstallment);
  const financingFees = asAmount(record.financingFees);
  if (totalCashPrice === undefined || installments === undefined || amountPerInstallment === undefined || financingFees === undefined) {
    return null;
  }
  const paymentMethod = record.paymentMethod === 'cash' || record.paymentMethod === 'installments' || record.paymentMethod === null
    ? record.paymentMethod
    : undefined;
  if (paymentMethod === undefined) return null;
  if (record.paymentStartMonth !== null && typeof record.paymentStartMonth !== 'string') return null;
  return {
    productName: record.productName,
    category: record.category,
    totalCashPrice,
    paymentMethod,
    installments,
    amountPerInstallment,
    paymentStartMonth: record.paymentStartMonth === null ? null : record.paymentStartMonth as string,
    financingFees,
  };
}

function sanitizeRegret(value: unknown): RegretAnswers | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const needNow = oneOf(record.needNow, ['yes', 'no', 'unsure'] as const);
  const alreadyHave = oneOf(record.alreadyHave, ['yes', 'no', 'unsure'] as const);
  const waitOutcome = oneOf(record.waitOutcome, ['can_wait', 'might_miss', 'unsure'] as const);
  if (needNow === undefined || alreadyHave === undefined || waitOutcome === undefined) return null;
  if (typeof record.waitNote !== 'string') return null;
  return { needNow, alreadyHave, waitOutcome, waitNote: record.waitNote };
}

function sanitizeFollowUp(value: unknown): FollowUp | null {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.answeredAt !== 'string' || typeof record.note !== 'string') return null;
  if (record.stillGlad !== null && typeof record.stillGlad !== 'boolean') return null;
  return { stillGlad: record.stillGlad, note: record.note, answeredAt: record.answeredAt };
}

function asAmount(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function isOutcome(value: unknown): value is DecisionRecord['engineOutcome'] {
  return value === 'could_buy' || value === 'better_wait' || value === 'do_not_buy' || value === 'insufficient';
}

function isAction(value: unknown): value is UserFinalAction {
  return (
    value === 'accept' ||
    value === 'override_could_buy' ||
    value === 'override_better_wait' ||
    value === 'override_do_not_buy' ||
    value === 'dismiss'
  );
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  return undefined;
}
