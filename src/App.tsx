import { useEffect } from 'react';
import {
  BrowserRouter,
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useInRouterContext,
} from 'react-router-dom';
import { useAuthStore, DEFAULT_CASHIERS } from './store/authStore';
import { AppLayout } from './components/navigation/AppLayout';
import { HomePage } from './pages/HomePage';
import { PosPage } from './pages/PosPage';
import { CustomersPage } from './pages/CustomersPage';
import { HistoryPage } from './pages/HistoryPage';
import { SupervisorPage } from './pages/SupervisorPage';

export interface AppProps {
  initialEntries?: string[];
}

export function AppContent() {
  const {
    storeSession,
    setStoreSession,
    cashiers,
    setCashiers,
  } = useAuthStore();

  // Auto-init store session and default cashiers if empty
  useEffect(() => {
    if (!storeSession) {
      setStoreSession({
        storeId: 'ambar-store-1',
        storeName: 'Ámbar Bodega',
        authenticatedAt: new Date().toISOString(),
      });
    }

    if (cashiers.length === 0) {
      setCashiers(DEFAULT_CASHIERS);
    }
  }, [storeSession, cashiers.length, setStoreSession, setCashiers]);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/supervisor" element={<SupervisorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App({ initialEntries }: AppProps = {}) {
  const isInRouter = useInRouterContext();

  if (isInRouter) {
    return <AppContent />;
  }

  if (initialEntries) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <AppContent />
      </MemoryRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
