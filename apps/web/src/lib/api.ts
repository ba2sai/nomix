// Cliente de API. Rutas relativas /api → mismo origen (Vite proxy en dev,
// Caddy en prod), así la cookie de sesión viaja sola. credentials: 'include'.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'include' };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Membresia {
  empresaId: string;
  nombreComercial: string;
  rol: string;
}
export interface Me {
  usuarioId: string;
  empresaActivaId: string | null;
  empresas: Membresia[];
}

export interface Colaborador {
  id: string;
  codEmpleado: string;
  nombres: string;
  apellidos: string;
  cargo: string | null;
  identificacion: string;
  salarioMensual: string;
  status: string;
  [k: string]: unknown;
}

export interface PreviewLinea {
  concepto: string;
  base: string;
  tasa: string;
  monto: string;
  baseLegal: string;
}
export interface PreviewColaborador {
  nombre: string;
  baseCotizable: string;
  deduccionesObrero: PreviewLinea[];
  totalDeduccionesObrero: string;
  netoAntesIsr: string;
  cargasPatronales: PreviewLinea[];
  costoEmpleador: string;
}
export interface PreviewTotales {
  bruto: string;
  deduccionesObrero: string;
  cargasPatronales: string;
  netoAntesIsr: string;
  costoEmpleador: string;
}
export interface Preview {
  periodo: string;
  tasasVigentes: Record<string, string>;
  colaboradores: PreviewColaborador[];
  totales: PreviewTotales;
  baseCalculo?: string;
  pendiente: { isr: string };
}

export interface Planilla {
  id: string;
  tipo: string;
  periodoDesde: string;
  periodoHasta: string;
  fechaPago: string | null;
  estado: string;
  totales: {
    colaboradores?: number;
    bruto?: string;
    deduccionesObrero?: string;
    cargasPatronales?: string;
    netoAntesIsr?: string;
    costoEmpleador?: string;
  } | null;
}
export interface PlanillaLinea {
  concepto: string;
  tipo: string;
  base: string | null;
  monto: string;
}
export interface PlanillaDetalle extends Planilla {
  colaboradores: { colaboradorId: string; nombre: string; lineas: PlanillaLinea[] }[];
}

export const api = {
  me: () => req<Me>('GET', '/auth/me'),
  login: (email: string, password: string) =>
    req<{ usuarioId: string; empresas: Membresia[] }>('POST', '/auth/login', { email, password }),
  seleccionarEmpresa: (empresaId: string) =>
    req<{ empresaActivaId: string; rol: string }>('POST', '/auth/empresa', { empresaId }),
  logout: () => req<{ ok: true }>('POST', '/auth/logout'),
  colaboradores: () => req<Colaborador[]>('GET', '/colaboradores'),
  crearColaborador: (dto: Record<string, unknown>) =>
    req<Colaborador>('POST', '/colaboradores', dto),
  previewEmpresa: (fecha: string) =>
    req<Preview>('GET', `/planillas/preview-empresa?fecha=${fecha}`),
  // Planillas persistidas
  planillas: () => req<Planilla[]>('GET', '/planillas'),
  planilla: (id: string) => req<PlanillaDetalle>('GET', `/planillas/${id}`),
  crearPlanilla: (dto: {
    tipo: string;
    periodoDesde: string;
    periodoHasta: string;
    fechaPago?: string;
  }) => req<Planilla>('POST', '/planillas', dto),
  calcularPlanilla: (id: string) => req<Planilla>('POST', `/planillas/${id}/calcular`),
  aprobarPlanilla: (id: string) => req<Planilla>('POST', `/planillas/${id}/aprobar`),
  cerrarPlanilla: (id: string) => req<Planilla>('POST', `/planillas/${id}/cerrar`),
};
