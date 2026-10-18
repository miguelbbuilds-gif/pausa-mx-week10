import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · PAUSA MX`;
  }, [title]);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

const BUTTON_VARIANTS = {
  primary: 'bg-teal text-white hover:bg-teal-dark',
  secondary: 'bg-navy text-white hover:bg-navy-soft',
  ghost: 'border border-line bg-card text-navy hover:border-navy',
  danger: 'border border-clay bg-clay-soft text-clay hover:bg-white',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-card p-5 shadow-sm ${className}`}>{children}</section>;
}

export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 max-w-3xl">
      {eyebrow ? <p className="mb-2 text-sm font-semibold tracking-[0.16em] text-teal-dark uppercase">{eyebrow}</p> : null}
      <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">{title}</h1>
      {children ? <div className="mt-3 text-lg leading-relaxed text-ink">{children}</div> : null}
    </header>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-teal-dark underline decoration-teal/40 underline-offset-4">
      {children}
    </Link>
  );
}

const FIELD_CLASS = 'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink';

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required = false,
  autoComplete = 'off',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-amber"> *</span> : null}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={FIELD_CLASS}
      />
      {hint ? <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-clay">{error}</p> : null}
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-amber"> *</span> : null}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={FIELD_CLASS}
      />
      {hint ? <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-clay">{error}</p> : null}
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={FIELD_CLASS}>
        {children}
      </select>
    </div>
  );
}

export function MonthField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <input
        id={id}
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={FIELD_CLASS}
      />
      {hint ? <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-clay">{error}</p> : null}
    </div>
  );
}

export function ChoiceGroup({
  legend,
  name,
  value,
  onChange,
  options,
  error,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
  error?: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-base font-semibold text-ink">{legend}</legend>
      <div className="grid gap-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <label key={option.value} htmlFor={id} className="flex cursor-pointer gap-3 rounded-2xl border border-line bg-white px-3 py-3">
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-navy">{option.label}</span>
                {option.hint ? <span className="mt-0.5 block text-sm text-muted">{option.hint}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-clay">{error}</p> : null}
    </fieldset>
  );
}
