import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildDemo, type DemoKind } from '../domain/demo';
import type { Assessment } from '../domain/engine';
import { createDecisionRecord, visibleFollowUps, withFollowUp } from '../domain/history';
import {
  clearPersisted,
  loadPersisted,
  savePersisted,
  serializeExport,
  stateAfterHistoryPurge,
  type PersistedState,
} from '../domain/storage';
import { defaultState } from '../domain/storage';
import type { FinancialProfile, Obligation, PurchaseInput, RegretAnswers, UserFinalAction } from '../domain/types';

interface Boot {
  state: PersistedState;
  notice: string | null;
}

function readBoot(): Boot {
  if (typeof localStorage === 'undefined') return { state: defaultState(), notice: null };
  const loaded = loadPersisted(localStorage);
  const purged = stateAfterHistoryPurge(loaded.state, new Date());
  const removed = loaded.state.decisions.length - purged.decisions.length;
  const parts: string[] = [];
  if (loaded.notice) parts.push(loaded.notice);
  if (removed > 0) {
    parts.push(
      `Se quitaron ${removed} decisiones con más de 30 días que no pediste conservar. Los pagos anotados siguen en Pagos.`,
    );
  }
  return { state: purged, notice: parts.length > 0 ? parts.join(' ') : null };
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface AppController {
  state: PersistedState;
  notice: string | null;
  dismissNotice: () => void;
  saveProfile: (profile: FinancialProfile) => void;
  setDebtInclusion: (rule: PersistedState['debtInclusion']) => void;
  saveObligation: (obligation: Omit<Obligation, 'id' | 'createdAt'> & { id?: string }) => void;
  deleteObligation: (id: string) => void;
  saveDraft: (purchase: PurchaseInput, regret: RegretAnswers) => void;
  saveDecision: (args: {
    assessment: Assessment;
    purchase: PurchaseInput;
    regret: RegretAnswers;
    action: UserFinalAction;
    retainedPermanently: boolean;
  }) => void;
  deleteDecision: (id: string) => void;
  setRetained: (id: string, retained: boolean) => void;
  answerFollowUp: (id: string, stillGlad: boolean | null, note: string) => void;
  loadDemo: (kind: DemoKind) => void;
  clearAll: () => void;
  exportJson: () => string;
  followUps: ReturnType<typeof visibleFollowUps>;
}

const AppStateContext = createContext<AppController | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(readBoot);
  const [state, setState] = useState(boot.state);
  const [notice, setNotice] = useState<string | null>(boot.notice);
  const [clock] = useState(() => new Date());
  const followUps = useMemo(() => visibleFollowUps(state.decisions, clock), [clock, state.decisions]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    savePersisted(localStorage, state);
  }, [state]);

  const value = useMemo<AppController>(() => ({
    state,
    notice,
    followUps,
    dismissNotice: () => setNotice(null),
    saveProfile: (profile) => setState((current) => ({ ...current, profile })),
    setDebtInclusion: (debtInclusion) => setState((current) => ({ ...current, debtInclusion })),
    saveObligation: (obligation) => setState((current) => {
      if (obligation.id && current.obligations.some((item) => item.id === obligation.id)) {
        return {
          ...current,
          obligations: current.obligations.map((item) => (
            item.id === obligation.id
              ? { ...item, ...obligation, id: item.id, createdAt: item.createdAt }
              : item
          )),
        };
      }
      const created: Obligation = {
        id: createId(),
        createdAt: new Date().toISOString(),
        description: obligation.description,
        amountPerPayment: obligation.amountPerPayment,
        remainingPayments: obligation.remainingPayments,
        nextDueMonth: obligation.nextDueMonth,
      };
      return { ...current, obligations: [...current.obligations, created] };
    }),
    deleteObligation: (id) => setState((current) => ({
      ...current,
      obligations: current.obligations.filter((item) => item.id !== id),
    })),
    saveDraft: (draftPurchase, draftRegret) => setState((current) => ({ ...current, draftPurchase, draftRegret })),
    saveDecision: ({ assessment, purchase, regret, action, retainedPermanently }) => setState((current) => ({
      ...current,
      decisions: [
        createDecisionRecord({
          id: createId(),
          createdAt: new Date().toISOString(),
          assessment,
          purchase,
          regret,
          action,
          retainedPermanently,
        }),
        ...current.decisions,
      ],
    })),
    deleteDecision: (id) => setState((current) => ({
      ...current,
      decisions: current.decisions.filter((item) => item.id !== id),
    })),
    setRetained: (id, retainedPermanently) => setState((current) => ({
      ...current,
      decisions: current.decisions.map((item) => (item.id === id ? { ...item, retainedPermanently } : item)),
    })),
    answerFollowUp: (id, stillGlad, note) => setState((current) => ({
      ...current,
      decisions: current.decisions.map((item) => (
        item.id === id
          ? withFollowUp(item, { stillGlad, note, answeredAt: new Date().toISOString() })
          : item
      )),
    })),
    loadDemo: (kind) => {
      const scenario = buildDemo(kind, new Date());
      setState({
        version: 1,
        profile: scenario.profile,
        debtInclusion: scenario.debtInclusion,
        obligations: scenario.obligations,
        decisions: [],
        draftPurchase: scenario.purchase,
        draftRegret: scenario.regret,
        demoMode: true,
        demoKind: kind,
      });
      setNotice(null);
    },
    clearAll: () => {
      if (typeof localStorage !== 'undefined') clearPersisted(localStorage);
      setState(defaultState());
      setNotice('Se borraron los datos de PAUSA MX en este navegador.');
    },
    exportJson: () => serializeExport(state, new Date().toISOString()),
  }), [followUps, notice, state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppController {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState debe usarse dentro de AppStateProvider');
  return value;
}
