import { describe, expect, it } from 'vitest';
import { assessPurchase } from './engine';
import { createDecisionRecord, isFollowUpDue, isHistoryExpired, purgeExpiredDecisions, resolveUserAction, visibleFollowUps, withFollowUp } from './history';
import { emptyPurchase, emptyRegret, type DecisionRecord, type Obligation } from './types';
import { defaultState, loadPersisted, savePersisted, serializeExport, stateAfterHistoryPurge, type KeyValueStore } from './storage';

function memoryStore(initial?: string): KeyValueStore {
  const map = new Map<string, string>();
  if (initial !== undefined) map.set('pausa-mx-state-v1', initial);
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function decision(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    id: 'd1',
    createdAt: '2026-09-01T00:00:00.000Z',
    productName: 'Chamarra',
    category: 'Ropa',
    engineOutcome: 'do_not_buy',
    userFinalAction: 'accept',
    finalLabel: 'NO COMPRES POR AHORA',
    overridden: false,
    retainedPermanently: false,
    surplusBefore: 1000,
    surplusAfter: 0,
    incomeUsed: 12000,
    proposedInstallment: 1000,
    debtCounted: 2000,
    cashAfter: -1000,
    assumptions: [],
    warnings: [],
    contextualReasons: [],
    insufficientReasons: [],
    purchase: { ...emptyPurchase(), productName: 'Chamarra', totalCashPrice: 3000 },
    regret: emptyRegret(),
    followUp: null,
    ...overrides,
  };
}

const obligation: Obligation = {
  id: 'debt-1',
  description: 'Audífonos',
  amountPerPayment: 500,
  remainingPayments: 4,
  nextDueMonth: '2026-10',
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('history, follow-up, and override', () => {
  it('expires purchase history after 30 days unless the person keeps it', () => {
    const created = decision();
    const justBefore = new Date('2026-09-30T23:59:59.999Z');
    const onTheDay = new Date('2026-10-01T00:00:00.000Z');

    expect(isHistoryExpired(created, justBefore)).toBe(false);
    expect(isHistoryExpired(created, onTheDay)).toBe(true);
    expect(isHistoryExpired({ ...created, retainedPermanently: true }, onTheDay)).toBe(false);
    expect(isHistoryExpired({ ...created, createdAt: 'fecha-rota' }, onTheDay)).toBe(false);
  });

  it('shows a follow-up only after 30 days and never invents an answer', () => {
    const kept = decision({ retainedPermanently: true });
    const fresh = decision({ createdAt: '2026-09-02T00:00:00.000Z', retainedPermanently: true });
    const answered = withFollowUp(kept, {
      stillGlad: null,
      note: '',
      answeredAt: '2026-10-02T00:00:00.000Z',
    });
    const onTheDay = new Date('2026-10-01T00:00:00.000Z');
    const tooSoon = new Date('2026-09-30T23:59:59.999Z');

    expect(isFollowUpDue(kept, tooSoon)).toBe(false);
    expect(isFollowUpDue(fresh, onTheDay)).toBe(false);
    expect(visibleFollowUps([kept], onTheDay).map((item) => item.id)).toEqual(['d1']);
    expect(visibleFollowUps([decision()], onTheDay)).toEqual([]);
    expect(visibleFollowUps([answered], onTheDay)).toEqual([]);
    expect(answered.followUp?.stillGlad).toBeNull();
  });

  it('removes expired decisions without deleting active debt obligations', () => {
    const state = {
      ...defaultState(),
      obligations: [obligation],
      decisions: [decision(), decision({ id: 'kept', retainedPermanently: true })],
    };
    const next = stateAfterHistoryPurge(state, new Date('2026-10-01T00:00:00.000Z'));

    expect(next.decisions.map((item) => item.id)).toEqual(['kept']);
    expect(next.obligations).toEqual([obligation]);
    expect(purgeExpiredDecisions(state.decisions, new Date('2026-10-01T00:00:00.000Z')).removed).toHaveLength(1);
  });

  it('keeps the engine outcome when the person overrides it', () => {
    const assessment = assessPurchase({
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
        totalCashPrice: 4000,
        paymentMethod: 'installments',
        installments: 2,
        amountPerInstallment: 2000,
        paymentStartMonth: '2026-10',
        financingFees: 0,
      },
      regret: { ...emptyRegret(), needNow: 'yes', alreadyHave: 'no', waitOutcome: 'might_miss' },
      obligations: [],
      debtInclusion: 'aggregate_includes_listed',
      referenceMonth: '2026-10',
    });
    const saved = createDecisionRecord({
      id: 'choice-1',
      createdAt: '2026-10-18T18:00:00.000Z',
      assessment,
      purchase: assessment.cost.cashPrice === null
        ? { ...emptyPurchase(), productName: 'Chamarra' }
        : {
            productName: 'Chamarra',
            category: 'Ropa',
            totalCashPrice: 4000,
            paymentMethod: 'installments',
            installments: 2,
            amountPerInstallment: 2000,
            paymentStartMonth: '2026-10',
            financingFees: 0,
          },
      regret: emptyRegret(),
      action: 'override_could_buy',
      retainedPermanently: true,
    });

    expect(assessment.outcome).toBe('do_not_buy');
    expect(saved.engineOutcome).toBe('do_not_buy');
    expect(saved.userFinalAction).toBe('override_could_buy');
    expect(saved.overridden).toBe(true);
    expect(saved.finalLabel).toBe('PODRÍAS COMPRAR');
    expect(saved.followUp).toBeNull();
    expect(resolveUserAction('do_not_buy', 'accept').overridden).toBe(false);
  });
});

describe('local storage', () => {
  it('recovers from corrupt JSON without inventing a profile', () => {
    for (const raw of ['{', '[]', '{"version":1,"profile":"nope"}']) {
      const loaded = loadPersisted(memoryStore(raw));
      expect(loaded.recovered).toBe(true);
      expect(loaded.state.profile.monthlyNetIncome).toBeNull();
      expect(loaded.state.obligations).toEqual([]);
      expect(loaded.state.decisions).toEqual([]);
    }
  });

  it('round-trips a saved profile and export disclaimer', () => {
    const store = memoryStore();
    const state = {
      ...defaultState(),
      profile: { ...defaultState().profile, monthlyNetIncome: 12000, incomeStability: 'stable' as const },
      obligations: [obligation],
    };
    expect(savePersisted(store, state)).toBe(true);
    const loaded = loadPersisted(store);
    expect(loaded.recovered).toBe(false);
    expect(loaded.state.profile.monthlyNetIncome).toBe(12000);
    expect(loaded.state.obligations[0]?.description).toBe('Audífonos');
    const exported = serializeExport(loaded.state, '2026-10-18T18:00:00.000Z');
    expect(exported).toContain('No es asesoría financiera');
    expect(exported).toContain('Audífonos');
  });
});
