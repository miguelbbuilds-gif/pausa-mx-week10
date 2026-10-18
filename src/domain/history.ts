import { OUTCOME_LABEL, type Assessment, type DecisionRecord, type Outcome, type PurchaseInput, type RegretAnswers, type UserFinalAction } from './types';

export const HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const OVERRIDE_OUTCOME: Record<Exclude<UserFinalAction, 'accept' | 'dismiss'>, Outcome> = {
  override_could_buy: 'could_buy',
  override_better_wait: 'better_wait',
  override_do_not_buy: 'do_not_buy',
};

export function decisionAgeMs(createdAt: string, now: Date): number | null {
  const time = Date.parse(createdAt);
  if (Number.isNaN(time)) return null;
  return now.getTime() - time;
}

export function isHistoryExpired(
  decision: Pick<DecisionRecord, 'createdAt' | 'retainedPermanently'>,
  now: Date,
): boolean {
  if (decision.retainedPermanently) return false;
  const age = decisionAgeMs(decision.createdAt, now);
  if (age === null) return false;
  return age >= HISTORY_RETENTION_MS;
}

export function isFollowUpDue(decision: DecisionRecord, now: Date): boolean {
  if (decision.followUp?.answeredAt) return false;
  const age = decisionAgeMs(decision.createdAt, now);
  if (age === null) return false;
  return age >= HISTORY_RETENTION_MS;
}

export function purgeExpiredDecisions(
  decisions: DecisionRecord[],
  now: Date,
): { kept: DecisionRecord[]; removed: DecisionRecord[] } {
  const kept: DecisionRecord[] = [];
  const removed: DecisionRecord[] = [];
  for (const decision of decisions) {
    if (isHistoryExpired(decision, now)) removed.push(decision);
    else kept.push(decision);
  }
  return { kept, removed };
}

/** Follow-up is offered only for records that are still kept and are actually 30 days old. */
export function visibleFollowUps(decisions: DecisionRecord[], now: Date): DecisionRecord[] {
  return purgeExpiredDecisions(decisions, now).kept.filter((decision) => isFollowUpDue(decision, now));
}

export function daysUntilRetention(createdAt: string, now: Date): number | null {
  const age = decisionAgeMs(createdAt, now);
  if (age === null) return null;
  return Math.ceil((HISTORY_RETENTION_MS - age) / (24 * 60 * 60 * 1000));
}

export function resolveUserAction(
  engineOutcome: Outcome,
  action: UserFinalAction,
): { overridden: boolean; recordedOutcome: Outcome | 'dismissed'; finalLabel: string } {
  if (action === 'accept') {
    return {
      overridden: false,
      recordedOutcome: engineOutcome,
      finalLabel: OUTCOME_LABEL[engineOutcome],
    };
  }
  if (action === 'dismiss') {
    return { overridden: true, recordedOutcome: 'dismissed', finalLabel: 'Sugerencia descartada' };
  }
  const recordedOutcome = OVERRIDE_OUTCOME[action];
  return {
    overridden: recordedOutcome !== engineOutcome,
    recordedOutcome,
    finalLabel: OUTCOME_LABEL[recordedOutcome],
  };
}

export function createDecisionRecord(args: {
  id: string;
  createdAt: string;
  assessment: Assessment;
  purchase: PurchaseInput;
  regret: RegretAnswers;
  action: UserFinalAction;
  retainedPermanently: boolean;
}): DecisionRecord {
  const resolved = resolveUserAction(args.assessment.outcome, args.action);
  return {
    id: args.id,
    createdAt: args.createdAt,
    productName: args.purchase.productName,
    category: args.purchase.category,
    engineOutcome: args.assessment.outcome,
    userFinalAction: args.action,
    finalLabel: resolved.finalLabel,
    overridden: resolved.overridden,
    retainedPermanently: args.retainedPermanently,
    surplusBefore: args.assessment.surplusBefore,
    surplusAfter: args.assessment.surplusAfter,
    incomeUsed: args.assessment.incomeUsed,
    proposedInstallment: args.assessment.proposedInstallment,
    debtCounted: args.assessment.debtOnTightestMonth?.total ?? null,
    cashAfter: args.assessment.cashImpact?.after ?? null,
    assumptions: args.assessment.assumptions,
    warnings: args.assessment.warnings,
    contextualReasons: args.assessment.contextualReasons,
    insufficientReasons: args.assessment.insufficientReasons,
    purchase: args.purchase,
    regret: args.regret,
    followUp: null,
  };
}

export function withFollowUp(
  decision: DecisionRecord,
  input: { stillGlad: boolean | null; note: string; answeredAt: string },
): DecisionRecord {
  return {
    ...decision,
    followUp: {
      stillGlad: input.stillGlad,
      note: input.note,
      answeredAt: input.answeredAt,
    },
  };
}
