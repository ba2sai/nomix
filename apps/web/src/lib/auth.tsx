import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type Me, type Permiso } from './api';

interface AuthState {
  cargando: boolean;
  me: Me | null;
  /**
   * ¿El rol vigente tiene este permiso? (`ADR-018`)
   *
   * Sirve para NO ofrecer lo que el servidor va a rechazar — un botón
   * "Aprobar" que siempre devuelve 403 es peor que no tenerlo. Pero es
   * cortesía de interfaz, **no** el control de acceso: la decisión la toma el
   * `PermisoGuard` del backend y el RLS de la base. Ocultar un botón aquí no
   * protege nada por sí solo, y el día que alguien llame a la API a mano el
   * resultado tiene que ser el mismo.
   */
  puede: (permiso: Permiso) => boolean;
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
    // Sin sesión cargada no se asume nada: hasta saber el rol, no se puede.
    puede: (permiso) => me?.permisos.includes(permiso) ?? false,
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
