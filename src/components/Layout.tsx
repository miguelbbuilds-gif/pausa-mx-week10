import { CalendarClock, House, ListChecks, Pause, Scale, Shield, UserRound } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppState } from '../state/store';

const LINKS = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/evaluar', label: 'Evaluar', icon: Scale },
  { to: '/pagos', label: 'Pagos', icon: CalendarClock },
  { to: '/decisiones', label: 'Decisiones', icon: ListChecks },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
];

function navClass(isActive: boolean, desktop = false): string {
  const base = desktop
    ? 'rounded-full px-3 py-2 text-sm font-semibold'
    : 'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold';
  return `${base} ${isActive ? 'bg-teal-soft text-teal-dark' : 'text-navy'}`;
}

export function Layout() {
  const { state, notice, dismissNotice } = useAppState();
  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-navy">
            <Pause aria-hidden="true" />
            <span>
              <span className="block font-display text-2xl leading-none">PAUSA MX</span>
              <span className="text-sm text-muted">Tu dinero. Tu decisión.</span>
            </span>
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Secciones">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => navClass(isActive, true)}>
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/demo" className={({ isActive }) => navClass(isActive, true)}>Demo</NavLink>
            <NavLink to="/privacidad" className={({ isActive }) => navClass(isActive, true)}>Privacidad</NavLink>
          </nav>
          <div className="flex gap-3 md:hidden">
            <NavLink to="/demo" className="text-sm font-semibold text-navy">Demo</NavLink>
            <NavLink to="/privacidad" className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
              <Shield aria-hidden="true" size={16} /> Privacidad
            </NavLink>
          </div>
        </div>
      </header>
      {state.demoMode ? (
        <div className="bg-amber-soft text-amber" role="status">
          <p className="mx-auto max-w-5xl px-4 py-2 text-sm font-semibold">
            EJEMPLO / DATOS FICTICIOS. Este escenario no es una persona real, no viene de una entrevista y no es un resultado de prueba.
          </p>
        </div>
      ) : null}
      {notice ? (
        <div className="border-b border-line bg-white" role="status">
          <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 py-3 text-sm">
            <p>{notice}</p>
            <button type="button" onClick={dismissNotice} className="font-semibold text-teal-dark">
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
      <main id="contenido" className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 md:pb-10">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-28 text-sm leading-relaxed text-muted md:pb-8">
        Prototipo funcional de ficción para AI 2041, semana 10. No es asesoría financiera. No compra nada y no se conecta a un banco.
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card md:hidden" aria-label="Principal">
        <div className="mx-auto flex max-w-5xl">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => navClass(isActive)}>
                <Icon aria-hidden="true" size={18} />
                {link.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
