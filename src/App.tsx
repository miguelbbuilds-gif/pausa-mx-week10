import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DecisionsPage } from './pages/DecisionsPage';
import { DemoPage } from './pages/DemoPage';
import { EvaluatePage } from './pages/EvaluatePage';
import { LandingPage } from './pages/LandingPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ProfilePage } from './pages/ProfilePage';
import { AppStateProvider } from './state/store';

function NotFoundPage() {
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl text-navy">Esta página no existe</h1>
      <p className="mt-3 leading-relaxed">El enlace no corresponde a una sección de PAUSA MX.</p>
      <Link to="/" className="mt-4 inline-flex font-semibold text-teal-dark underline underline-offset-4">Volver al inicio</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppStateProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="evaluar" element={<EvaluatePage />} />
            <Route path="pagos" element={<PaymentsPage />} />
            <Route path="decisiones" element={<DecisionsPage />} />
            <Route path="privacidad" element={<PrivacyPage />} />
            <Route path="demo" element={<DemoPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AppStateProvider>
    </BrowserRouter>
  );
}
