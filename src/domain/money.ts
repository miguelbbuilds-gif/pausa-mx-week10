export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return value;
  return Number(value.toFixed(2));
}

export function cents(value: number): number {
  return Math.round(value * 100);
}

export function compareMoney(a: number, b: number): number {
  return Math.sign(cents(a) - cents(b));
}

export function isUsableAmount(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function formatMXN(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseAmountInput(raw: string): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim().replace(/\$/g, '').replace(/\s/g, '').replace(/,/g, '');
  if (trimmed === '') return { ok: true, value: null };
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false };
  return { ok: true, value: roundMoney(value) };
}

/** Returns null when count is zero, negative, or not a positive integer. */
export function splitAcrossInstallments(total: number, count: number): number | null {
  if (!Number.isFinite(total) || !Number.isFinite(count)) return null;
  if (count <= 0 || !Number.isInteger(count)) return null;
  return roundMoney(total / count);
}
