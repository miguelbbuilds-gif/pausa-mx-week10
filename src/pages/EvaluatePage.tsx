import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Formula } from '../components/Formula';
import { SchedulePanel } from '../components/SchedulePanel';
import { ChoiceGroup, MonthField, NumberField, SelectField, TextField, usePageTitle } from '../components/ui';
import { assessPurchase, type Assessment } from '../domain/engine';
import { currentMonth } from '../domain/months';
import { formatMXN, parseAmountInput, splitAcrossInstallments } from '../domain/money';
import { CATEGORIES, OUTCOME_LABEL, SHADOW_CLAUSE, type FinancialProfile, type Obligation, type Outcome, type PurchaseInput, type UserFinalAction } from '../domain/types';
import { useAppState } from '../state/store';
import {
  parsePurchaseForm,
  parseRegretForm,
  purchaseToForm,
  regretToForm,
  type PurchaseForm,
  type RegretForm,
} from '../ui/purchaseForm';

const STEPS = ['Compra', 'Contexto', 'Cuentas', 'Sugerencia'];

const OUTCOME_STYLE: Record<Outcome, string> = {
  could_buy: 'border-teal bg-teal-soft text-teal-dark',
  better_wait: 'border-amber bg-amber-soft text-amber',
  do_not_buy: 'border-clay bg-clay-soft text-clay',
  insufficient: 'border-line bg-white text-navy',
};

export function EvaluatePage() {
  usePageTitle('Evaluar');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state, saveDraft, saveDecision } = useAppState();
  const [form, setForm] = useState<PurchaseForm>(() => purchaseToForm(state.draftPurchase));
  const [regretForm, setRegretForm] = useState<RegretForm>(() => regretToForm(state.draftRegret));
  const [step, setStep] = useState(() => {
    const requested = params.get('paso');
    if (requested === 'sugerencia') return 4;
    if (requested === 'revision') return 3;
    return 1;
  });
  const [purchaseErrors, setPurchaseErrors] = useState<Record<string, string>>({});
  const [regretErrors, setRegretErrors] = useState<Record<string, string>>({});
  const [calcNote, setCalcNote] = useState('');
  const [action, setAction] = useState<UserFinalAction>('accept');
  const [retain, setRetain] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const parsedPurchase = useMemo(() => parsePurchaseForm(form), [form]);
  const parsedRegret = useMemo(() => parseRegretForm(regretForm), [regretForm]);
  const assessment = useMemo(() => assessPurchase({
    profile: state.profile,
    purchase: parsedPurchase.purchase,
    regret: parsedRegret.regret,
    obligations: state.obligations,
    debtInclusion: state.debtInclusion,
    referenceMonth: currentMonth(),
  }), [parsedPurchase.purchase, parsedRegret.regret, state.debtInclusion, state.obligations, state.profile]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function patch<K extends keyof PurchaseForm>(key: K, value: PurchaseForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goNext(event: FormEvent) {
    event.preventDefault();
    if (step === 1) {
      const parsed = parsePurchaseForm(form);
      setPurchaseErrors(parsed.errors);
      if (Object.keys(parsed.errors).length > 0) return;
      saveDraft(parsed.purchase, parsedRegret.regret);
      setStep(2);
      return;
    }
    if (step === 2) {
      const parsed = parseRegretForm(regretForm);
      setRegretErrors(parsed.errors);
      if (Object.keys(parsed.errors).length > 0) return;
      saveDraft(parsedPurchase.purchase, parsed.regret);
      setStep(3);
      return;
    }
    if (step === 3) {
      saveDraft(parsedPurchase.purchase, parsedRegret.regret);
      setStep(4);
    }
  }

  function calculateInstallment() {
    const price = parseAmountInput(form.totalCashPrice);
    const fees = form.financingFees.trim() === '' ? { ok: true as const, value: 0 } : parseAmountInput(form.financingFees);
    const count = Number(form.installments);
    if (!price.ok || price.value === null || !fees.ok || fees.value === null) {
      setCalcNote('Primero escribe un precio válido. La comisión puede quedar vacía.');
      return;
    }
    const amount = splitAcrossInstallments(price.value + fees.value, count);
    if (amount === null) {
      setCalcNote('No se puede dividir: el número de pagos debe ser un entero mayor que cero.');
      return;
    }
    patch('amountPerInstallment', String(amount));
    setCalcNote(form.financingFees.trim() === ''
      ? 'Se calculó sin comisiones porque el campo está vacío. No asumimos que sean cero para la sugerencia hasta que las escribas.'
      : 'La mensualidad es el precio más la comisión, dividido entre los pagos. El redondeo puede dejar centavos.');
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (assessment.outcome === 'insufficient') return;
    saveDecision({
      assessment,
      purchase: parsedPurchase.purchase,
      regret: parsedRegret.regret,
      action,
      retainedPermanently: retain,
    });
    navigate('/decisiones');
  }

  return (
    <div className="grid gap-6">
      <header>
        <p className="mb-2 text-sm font-semibold tracking-[0.16em] text-teal-dark uppercase">Evaluar</p>
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-4xl text-navy outline-none sm:text-5xl">
          {STEPS[step - 1]}
        </h1>
      </header>
      <ol className="grid grid-cols-4 gap-2" aria-label="Pasos de la evaluación">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const active = number === step;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={number > step}
                onClick={() => setStep(number)}
                className={`min-h-11 w-full rounded-2xl px-2 text-sm font-semibold ${active ? 'bg-navy text-white' : 'bg-white text-navy'} disabled:opacity-50`}
                aria-current={active ? 'step' : undefined}
              >
                {number}. {label}
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <form onSubmit={goNext} className="grid max-w-2xl gap-5" noValidate>
          <TextField id="productName" label="Qué quieres comprar" required value={form.productName} onChange={(value) => patch('productName', value)} error={purchaseErrors.productName} />
          <SelectField id="category" label="Categoría" value={form.category} onChange={(value) => patch('category', value)}>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </SelectField>
          <NumberField id="totalCashPrice" label="Precio de contado" required value={form.totalCashPrice} onChange={(value) => patch('totalCashPrice', value)} error={purchaseErrors.totalCashPrice} hint="El precio total si lo pagaras hoy, en MXN." />
          <ChoiceGroup
            legend="¿Cómo lo pagarías?"
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={(value) => patch('paymentMethod', value as PurchaseForm['paymentMethod'])}
            error={purchaseErrors.paymentMethod}
            options={[
              { value: 'cash', label: 'De contado', hint: 'Se resta del efectivo de hoy. No es una mensualidad.' },
              { value: 'installments', label: 'En pagos', hint: 'La mensualidad entra al excedente del mes.' },
            ]}
          />
          {form.paymentMethod === 'installments' ? (
            <div className="grid gap-5 rounded-3xl border border-line bg-white p-4">
              <NumberField id="installments" label="Número de pagos" required value={form.installments} onChange={(value) => patch('installments', value)} error={purchaseErrors.installments} />
              <NumberField id="amountPerInstallment" label="Monto de cada pago" required value={form.amountPerInstallment} onChange={(value) => patch('amountPerInstallment', value)} error={purchaseErrors.amountPerInstallment} />
              <button type="button" onClick={calculateInstallment} className="justify-self-start font-semibold text-teal-dark underline underline-offset-4">
                Calcular mensualidad
              </button>
              {calcNote ? <p role="status" className="text-sm text-ink">{calcNote}</p> : null}
              <MonthField id="paymentStartMonth" label="Mes del primer pago" value={form.paymentStartMonth} onChange={(value) => patch('paymentStartMonth', value)} error={purchaseErrors.paymentStartMonth} />
              <NumberField id="financingFees" label="Comisiones o intereses que ya conozcas" value={form.financingFees} onChange={(value) => patch('financingFees', value)} error={purchaseErrors.financingFees} hint="Vacío significa que no las conoces. No las inventamos ni las ponemos en cero." />
            </div>
          ) : null}
          {form.paymentMethod === 'cash' ? (
            <MonthField id="cashMonth" label="Mes en el que lo pagarías" value={form.paymentStartMonth} onChange={(value) => patch('paymentStartMonth', value)} hint="Solo para ubicarlo en el calendario. No se vuelve una mensualidad." />
          ) : null}
          <StepButtons onBack={null} nextLabel="Seguir a las preguntas" />
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={goNext} className="grid max-w-2xl gap-5" noValidate>
          <p className="leading-relaxed">Estas respuestas dan contexto. No se convierten en un puntaje y no obligan a comprar.</p>
          <ChoiceGroup
            legend="¿Realmente lo necesito ahora?"
            name="needNow"
            value={regretForm.needNow}
            onChange={(value) => setRegretForm((current) => ({ ...current, needNow: value as RegretForm['needNow'] }))}
            error={regretErrors.needNow}
            options={[
              { value: 'yes', label: 'Sí, lo necesito ahora' },
              { value: 'no', label: 'No lo necesito ahora' },
              { value: 'unsure', label: 'No estoy seguro' },
            ]}
          />
          <ChoiceGroup
            legend="¿Ya tengo algo que cumple la misma función?"
            name="alreadyHave"
            value={regretForm.alreadyHave}
            onChange={(value) => setRegretForm((current) => ({ ...current, alreadyHave: value as RegretForm['alreadyHave'] }))}
            error={regretErrors.alreadyHave}
            options={[
              { value: 'yes', label: 'Sí, ya tengo algo' },
              { value: 'no', label: 'No tengo algo equivalente' },
              { value: 'unsure', label: 'No estoy seguro' },
            ]}
          />
          <ChoiceGroup
            legend="¿Qué pasa si espero 7 días?"
            name="waitOutcome"
            value={regretForm.waitOutcome}
            onChange={(value) => setRegretForm((current) => ({ ...current, waitOutcome: value as RegretForm['waitOutcome'] }))}
            error={regretErrors.waitOutcome}
            options={[
              { value: 'can_wait', label: 'Puedo esperar. No pierdo algo importante.' },
              { value: 'might_miss', label: 'Podría perder una oferta o una necesidad concreta.' },
              { value: 'unsure', label: 'No estoy seguro' },
            ]}
          />
          <TextField id="waitNote" label="Nota opcional" value={regretForm.waitNote} onChange={(value) => setRegretForm((current) => ({ ...current, waitNote: value }))} hint="Si quieres, escribe con tus palabras qué cambiaría en 7 días." />
          <StepButtons onBack={() => setStep(1)} nextLabel="Ver las cuentas" />
        </form>
      ) : null}

      {step === 3 ? (
        <form onSubmit={goNext} className="grid gap-5">
          <Review assessment={assessment} profile={state.profile} purchase={parsedPurchase.purchase} obligations={state.obligations} />
          <StepButtons onBack={() => setStep(2)} nextLabel="Ver la sugerencia" />
        </form>
      ) : null}

      {step === 4 ? (
        <form onSubmit={save} className="grid gap-5">
          <div className={`rounded-3xl border px-5 py-5 ${OUTCOME_STYLE[assessment.outcome]}`} role="status" aria-live="polite" data-testid="outcome">
            <p className="text-sm font-semibold tracking-[0.14em] uppercase">Sugerencia, no certeza</p>
            <p className="mt-2 font-display text-4xl">{OUTCOME_LABEL[assessment.outcome]}</p>
            <p className="mt-3 max-w-2xl leading-relaxed">{SHADOW_CLAUSE}</p>
          </div>
          <Review assessment={assessment} profile={state.profile} purchase={parsedPurchase.purchase} obligations={state.obligations} />
          {assessment.outcome === 'insufficient' ? (
            <p className="rounded-2xl bg-white px-4 py-3 leading-relaxed">
              Con información insuficiente no hay una sugerencia que aceptar o cambiar. Completa el perfil y la compra. Tú sigues decidiendo, también fuera de esta app.
            </p>
          ) : (
            <fieldset className="grid gap-3 rounded-3xl border border-line bg-card p-5">
              <legend className="px-1 font-semibold text-navy">Tu decisión</legend>
              <p className="text-sm leading-relaxed text-muted">La sugerencia de arriba se puede descartar. Guardar solo anota lo que tú eliges en este navegador.</p>
              {[
                ['accept', `Acepto la sugerencia: ${OUTCOME_LABEL[assessment.outcome]}.`],
                ['override_could_buy', 'Quiero registrarla como: podría comprar.'],
                ['override_better_wait', 'Quiero registrarla como: mejor espera.'],
                ['override_do_not_buy', 'Quiero registrarla como: no compres por ahora.'],
                ['dismiss', 'Descarto la sugerencia y así quiero dejar el registro.'],
              ].map(([value, label]) => (
                <label key={value} className="flex gap-3">
                  <input type="radio" name="finalAction" value={value} checked={action === value} onChange={() => setAction(value as UserFinalAction)} />
                  <span>{label}</span>
                </label>
              ))}
              <label className="mt-2 flex gap-3">
                <input type="checkbox" checked={retain} onChange={(event) => setRetain(event.target.checked)} />
                <span>Conservar este registro después de 30 días para poder responder el seguimiento. Si no lo marcas, se borra a los 30 días y no habrá pregunta.</span>
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-teal px-5 font-semibold text-white">
                  Guardar mi decisión
                </button>
                <button type="button" onClick={() => navigate('/decisiones')} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 font-semibold text-navy">
                  No guardar
                </button>
              </div>
            </fieldset>
          )}
          <button type="button" onClick={() => setStep(3)} className="justify-self-start font-semibold text-navy underline underline-offset-4">
            Volver a las cuentas
          </button>
        </form>
      ) : null}
    </div>
  );
}

function StepButtons({ onBack, nextLabel }: { onBack: (() => void) | null; nextLabel: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 font-semibold text-navy">
          Atrás
        </button>
      ) : null}
      <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-navy px-5 font-semibold text-white">
        {nextLabel}
      </button>
    </div>
  );
}

function Review({
  assessment,
  profile,
  purchase,
  obligations,
}: {
  assessment: Assessment;
  profile: FinancialProfile;
  purchase: PurchaseInput;
  obligations: Obligation[];
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-display text-2xl text-navy">Datos usados</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Item label="Producto" value={purchase.productName || '—'} />
          <Item label="Categoría" value={purchase.category} />
          <Item label="Precio de contado" value={formatMXN(purchase.totalCashPrice)} />
          <Item label="Forma de pago" value={purchase.paymentMethod === 'cash' ? 'Contado' : purchase.paymentMethod === 'installments' ? 'Pagos' : '—'} />
          <Item label="Pagos" value={purchase.installments === null ? '—' : String(purchase.installments)} />
          <Item label="Cada pago" value={formatMXN(purchase.amountPerInstallment)} />
          <Item label="Comisiones" value={purchase.financingFees === null ? 'No declaradas' : formatMXN(purchase.financingFees)} />
          <Item label="Costo financiado" value={formatMXN(assessment.cost.financedTotal)} />
          <Item label="Suma de pagos" value={formatMXN(assessment.cost.scheduledTotal)} />
        </dl>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5">
        <Formula profile={profile} assessment={assessment} />
        {assessment.outcome === 'insufficient' ? (
          <div className="mt-4" role="alert">
            <h2 className="font-semibold text-navy">Falta información</h2>
            <ul className="mt-2 list-disc pl-5">
              {assessment.insufficientReasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
        ) : null}
      </section>
      <DetailList title="Se está contando" items={assessment.counted} />
      <DetailList title="No entra en la cuenta" items={assessment.omitted} />
      <DetailList title="Supuestos" items={assessment.assumptions} />
      <DetailList title="Avisos" items={assessment.warnings} />
      <DetailList title="Contexto, no puntaje" items={assessment.contextualReasons.length > 0 ? assessment.contextualReasons : ['No hay un motivo de contexto que cambie la sugerencia.']} />
      <SchedulePanel obligations={obligations} purchase={purchase} referenceMonth={currentMonth()} />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="font-semibold text-navy">{title}</h2>
      <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm leading-relaxed">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
