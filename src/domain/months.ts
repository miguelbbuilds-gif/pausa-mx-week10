const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isValidMonth(value: string | null | undefined): value is string {
  return typeof value === 'string' && MONTH_RE.test(value);
}

export function monthToIndex(month: string): number | null {
  if (!isValidMonth(month)) return null;
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return year * 12 + (monthNumber - 1);
}

export function indexToMonth(index: number): string {
  const year = Math.floor(index / 12);
  const monthNumber = (index % 12) + 1;
  return `${String(year).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}`;
}

export function addMonths(month: string, delta: number): string | null {
  const index = monthToIndex(month);
  if (index === null || !Number.isFinite(delta)) return null;
  return indexToMonth(index + delta);
}

export function currentMonth(now = new Date()): string {
  const year = now.getFullYear();
  const monthNumber = now.getMonth() + 1;
  return `${String(year).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string): string {
  if (!isValidMonth(month)) return 'Fecha no válida';
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(
    new Date(year, monthNumber - 1, 1),
  );
}

export function formatMonthShort(month: string): string {
  if (!isValidMonth(month)) return '—';
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' }).format(
    new Date(year, monthNumber - 1, 1),
  );
}

export function formatLocalDate(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return 'Fecha no válida';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(time));
}
