import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type Me } from './api';

interface AuthState {
  cargando: boolean;
  me: Me | null;
  login: (email: string, password: string) => Promise<void>;
  seleccionarEmpresa: (empresaId: string) => Promise<void>;
  logout: () => Promise<void>;
  refrescar: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [cargando, setCargando] = useState(true);

  async function refrescar() {
    try {
      setMe(await api.me());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMe(null);
      else throw e;
    }
  }

  useEffect(() => {
    void refrescar().finally(() => setCargando(false));
  }, []);

  const value: AuthState = {
    cargando,
    me,
    login: async (email, password) => {
      await api.login(email, password);
      await refrescar();
    },
    seleccionarEmpresa: async (empresaId) => {
      await api.seleccionarEmpresa(empresaId);
      await refrescar();
    },
    logout: async () => {
      await api.logout();
      setMe(null);
    },
    refrescar,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
