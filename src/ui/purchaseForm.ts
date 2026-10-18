import { currentMonth, isValidMonth } from '../domain/months';
import { parseAmountInput } from '../domain/money';
import { emptyPurchase, emptyRegret, type PurchaseInput, type RegretAnswers } from '../domain/types';

export interface PurchaseForm {
  productName: string;
  category: string;
  totalCashPrice: string;
  paymentMethod: '' | 'cash' | 'installments';
  installments: string;
  amountPerInstallment: string;
  paymentStartMonth: string;
  financingFees: string;
}

export interface RegretForm {
  needNow: '' | NonNullable<RegretAnswers['needNow']>;
  alreadyHave: '' | NonNullable<RegretAnswers['alreadyHave']>;
  waitOutcome: '' | NonNullable<RegretAnswers['waitOutcome']>;
  waitNote: string;
}

export function blankPurchaseForm(): PurchaseForm {
  return {
    productName: '',
    category: 'Ropa',
    totalCashPrice: '',
    paymentMethod: '',
    installments: '',
    amountPerInstallment: '',
    paymentStartMonth: currentMonth(),
    financingFees: '',
  };
}

export function purchaseToForm(purchase: PurchaseInput | null): PurchaseForm {
  if (!purchase) return blankPurchaseForm();
  return {
    productName: purchase.productName,
    category: purchase.category || 'Ropa',
    totalCashPrice: purchase.totalCashPrice === null ? '' : String(purchase.totalCashPrice),
    paymentMethod: purchase.paymentMethod ?? '',
    installments: purchase.installments === null ? '' : String(purchase.installments),
    amountPerInstallment: purchase.amountPerInstallment === null ? '' : String(purchase.amountPerInstallment),
    paymentStartMonth: purchase.paymentStartMonth || currentMonth(),
    financingFees: purchase.financingFees === null ? '' : String(purchase.financingFees),
  };
}

export function regretToForm(regret: RegretAnswers | null): RegretForm {
  if (!regret) return { needNow: '', alreadyHave: '', waitOutcome: '', waitNote: '' };
  return {
    needNow: regret.needNow ?? '',
    alreadyHave: regret.alreadyHave ?? '',
    waitOutcome: regret.waitOutcome ?? '',
    waitNote: regret.waitNote,
  };
}

export function parsePurchaseForm(form: PurchaseForm): { purchase: PurchaseInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!form.productName.trim()) errors.productName = 'Escribe qué quieres comprar.';
  const price = parseAmountInput(form.totalCashPrice);
  if (!price.ok) errors.totalCashPrice = 'Escribe el precio con números. Ejemplo: 3000.';
  else if (price.value === null) errors.totalCashPrice = 'Falta el precio de contado.';

  if (form.paymentMethod !== 'cash' && form.paymentMethod !== 'installments') {
    errors.paymentMethod = 'Elige si pagarías de contado o en pagos.';
  }

  let installments: number | null = null;
  let amount: number | null = null;
  let fees: number | null = null;
  if (form.paymentMethod === 'installments') {
    if (!/^\d+$/.test(form.installments.trim()) || Number(form.installments) <= 0) {
      errors.installments = 'El número de pagos debe ser un entero mayor que cero.';
    } else {
      installments = Number(form.installments);
    }
    const parsedAmount = parseAmountInput(form.amountPerInstallment);
    if (!parsedAmount.ok) errors.amountPerInstallment = 'Escribe cada pago con números.';
    else if (parsedAmount.value === null) errors.amountPerInstallment = 'Falta el monto de cada pago.';
    else amount = parsedAmount.value;
    if (!isValidMonth(form.paymentStartMonth)) errors.paymentStartMonth = 'Elige un mes de inicio válido.';
    if (form.financingFees.trim() === '') fees = null;
    else {
      const parsedFees = parseAmountInput(form.financingFees);
      if (!parsedFees.ok || parsedFees.value === null) {
        errors.financingFees = 'Escribe la comisión con números, 0 si no hay, o déjala vacía si no la conoces.';
      } else {
        fees = parsedFees.value;
      }
    }
  }

  return {
    errors,
    purchase: {
      ...emptyPurchase(),
      productName: form.productName.trim(),
      category: form.category || 'Ropa',
      totalCashPrice: price.ok ? price.value : null,
      paymentMethod: form.paymentMethod === '' ? null : form.paymentMethod,
      installments: form.paymentMethod === 'installments' ? installments : null,
      amountPerInstallment: form.paymentMethod === 'installments' ? amount : null,
      paymentStartMonth: isValidMonth(form.paymentStartMonth) ? form.paymentStartMonth : null,
      financingFees: form.paymentMethod === 'installments' ? fees : 0,
    },
  };
}

export function parseRegretForm(form: RegretForm): { regret: RegretAnswers; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!form.needNow) errors.needNow = 'Elige una respuesta. “No estoy seguro” también cuenta.';
  if (!form.alreadyHave) errors.alreadyHave = 'Elige una respuesta.';
  if (!form.waitOutcome) errors.waitOutcome = 'Elige qué pasaría si esperas 7 días.';
  return {
    errors,
    regret: {
      ...emptyRegret(),
      needNow: form.needNow || null,
      alreadyHave: form.alreadyHave || null,
      waitOutcome: form.waitOutcome || null,
      waitNote: form.waitNote.trim(),
    },
  };
}
