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
    let msg = `Error ${String(res.status)}`;
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

/**
 * Variante para `multipart/form-data` (subida de documentos). No fija
 * `Content-Type`: el navegador debe escribir el boundary del multipart, algo
 * que `req()` no puede hacer porque siempre serializa a JSON.
 */
async function reqMultipart<T>(method: string, path: string, form: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, { method, credentials: 'include', body: form });
  if (!res.ok) {
    let msg = `Error ${String(res.status)}`;
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
/**
 * Verbos de autorizacion. Es una COPIA del vocabulario del backend
 * (`apps/api/src/auth/permisos.ts`, ADR-018) para que el editor avise de un
 * permiso mal escrito, pero la lista autorizada la manda el servidor en `me`:
 * aqui no se decide nada, solo se refleja.
 */
export type Permiso =
  | 'colaborador:leer'
  | 'colaborador:escribir'
  | 'planilla:leer'
  | 'planilla:calcular'
  | 'planilla:aprobar'
  | 'planilla:cerrar'
  | 'movimiento:escribir'
  | 'liquidacion:proponer'
  | 'catalogo:leer'
  | 'auditoria:leer';

export interface Me {
  usuarioId: string;
  empresaActivaId: string | null;
  empresas: Membresia[];
  /** Rol vigente en la empresa activa; null si no hay empresa elegida. */
  rol: string | null;
  /** Lo que ESTE rol puede hacer, resuelto por el servidor en cada `me`. */
  permisos: Permiso[];
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

/**
 * Ficha completa (`GET /colaboradores/:id`). Mismo shape que devuelve
 * `ColaboradorService.aSalida`: todos los campos del wizard, con
 * `identificacion` y `cuentaBancaria` ya descifrados por el servidor.
 */
export interface ColaboradorDetalle extends Colaborador {
  tipoDocumento: string;
  sexo: string | null;
  fechaNacimiento: string | null;
  estadoCivil: string | null;
  telefono: string | null;
  correo: string | null;
  tipoContrato: string;
  tipoPlanilla: string;
  fechaIngreso: string;
  fechaTermino: string | null;
  pProbatorio: boolean;
  esTecnico: boolean;
  formaPago: string | null;
  idBanco: string | null;
  tipoCuenta: string | null;
  cuentaBancaria: string | null;
  declaraRenta: boolean;
  gastoRep: string | null;
  montoAguinaldo: string | null;
}

/**
 * Concepto fijo asignado al colaborador (`ADR-021`): asignación recurrente
 * —gastos de representación, dietas, un descuento pactado— que se
 * materializa como movimiento en cada período sin volver a capturarla.
 * `monto` o `cantidad` (nunca los dos): la unidad la manda el CATÁLOGO, igual
 * que en `MovimientosPanel` — un concepto de horas o días se asigna por
 * `cantidad`, uno de monto por `monto`.
 *
 * `DELETE /colaboradores/:id/conceptos/:conceptoId` NO borra la fila: la
 * CIERRA con una fecha (`vigenteHasta`). Borrarla reescribiría planillas ya
 * calculadas que se apoyaron en que el concepto estaba vigente (`ADR-001`).
 */
export interface ConceptoColaborador {
  id: string;
  conceptoCodigo: string;
  monto: string | null;
  cantidad: string | null;
  vigenteDesde: string;
  vigenteHasta: string | null;
  nota: string | null;
}
export interface CrearConceptoColaborador {
  conceptoCodigo: string;
  monto?: string;
  cantidad?: string;
  vigenteDesde: string;
  vigenteHasta?: string;
  nota?: string;
}

/** Documento adjunto a la ficha (contrato, cédula, certificación, otro). */
export type TipoDocumento = 'contrato' | 'cedula' | 'certificacion' | 'otro';
export interface DocumentoColaborador {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  mime: string;
  /** Bytes, como texto — igual convención que los montos (ADR-006): nunca number en la frontera. */
  tamano: string;
  creadoEn: string;
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
    cargasPatronales?: string | null;
    netoAntesIsr?: string;
    /** Bruto - deducciones obrero, YA con el ISR retenido descontado. */
    neto?: string;
    costoEmpleador?: string | null;
    prorrateo?: string;
    /** Conceptos cuya incidencia todavia no esta verificada (ADR-002). */
    conceptosPendientes?: string[];
    /** Metodo de retencion de ISR y sus supuestos declarados (ADR-014). */
    isr?: { metodo: string; retenido: string; nota: string };
    /** Solo en planillas de XIII Mes: que partida se pago y sobre que ventana. */
    partida?: {
      numero: number;
      ventanaDesde: string;
      ventanaHasta: string;
      divisor: string;
      baseLegal: string;
    };
    /** Hallazgos que el usuario tiene que ver (aguinaldo aplicado, ventana distinta). */
    advertencias?: string[];
    /** Huecos declarados del calculo, como la cuota patronal sobre el XIII. */
    cuotaPatronal?: { estado: string; nota: string };
  } | null;
}
/** Procedencia de una linea calculada (ADR-005): que regla la produjo. */
export interface Traza {
  reglaCodigo: string;
  baseAplicada: string | null;
  tasaAplicada: string | null;
  resultado: string | null;
  articuloLegal: string | null;
  calculadoEn: string;
}
export interface PlanillaLinea {
  concepto: string;
  tipo: string;
  cantidad: string | null;
  base: string | null;
  monto: string;
  /** null = la linea se calculo sin dejar rastro. La UI lo declara. */
  traza: Traza | null;
}
export interface PlanillaDetalle extends Planilla {
  colaboradores: { colaboradorId: string; nombre: string; lineas: PlanillaLinea[] }[];
}

/** Fila del catalogo de conceptos (ADR-002). */
export interface Concepto {
  codigo: string;
  nombre: string;
  tipo: 'ingreso' | 'deduccion' | 'aporte_patronal' | 'provision';
  unidad: 'monto' | 'horas' | 'dias';
  baseLegal: string;
  confianza: 'verificado' | 'verificar' | 'pendiente';
  incidencia: {
    css: boolean;
    tasaCssEspecial: string | null;
    seguroEducativo: boolean;
    isr: boolean;
    regimenIsr: string;
    xiii: boolean;
    promedioVacaciones: boolean;
    liquidacion: boolean;
    inembargable: boolean;
  };
}

export interface Movimiento {
  id: string;
  colaboradorId: string;
  conceptoCodigo: string;
  cantidad: string | null;
  monto: string | null;
  nota: string | null;
  origen: string;
}
/** Respuesta de la ayuda de cálculo de vacaciones (ADR-016). */
export interface CicloVacaciones {
  diasAcumulados: string;
  cicloCompleto: boolean;
  ventanaDesde: string;
  ventanaHasta: string;
  advertencias: string[];
  linea: PreviewLinea;
}

export interface CrearMovimiento {
  colaboradorId: string;
  conceptoCodigo: string;
  cantidad?: string;
  monto?: string;
  nota?: string;
}

export const api = {
  me: () => req<Me>('GET', '/auth/me'),
  login: (email: string, password: string) =>
    req<{ usuarioId: string; empresas: Membresia[] }>('POST', '/auth/login', { email, password }),
  seleccionarEmpresa: (empresaId: string) =>
    req<{ empresaActivaId: string; rol: string; permisos: Permiso[] }>('POST', '/auth/empresa', {
      empresaId,
    }),
  logout: () => req<{ ok: true }>('POST', '/auth/logout'),
  colaboradores: () => req<Colaborador[]>('GET', '/colaboradores'),
  colaborador: (id: string) => req<ColaboradorDetalle>('GET', `/colaboradores/${id}`),
  crearColaborador: (dto: Record<string, unknown>) =>
    req<Colaborador>('POST', '/colaboradores', dto),
  actualizarColaborador: (id: string, dto: Record<string, unknown>) =>
    req<ColaboradorDetalle>('PATCH', `/colaboradores/${id}`, dto),
  // Conceptos fijos del colaborador (asignaciones recurrentes)
  conceptosColaborador: (colaboradorId: string) =>
    req<ConceptoColaborador[]>('GET', `/colaboradores/${colaboradorId}/conceptos`),
  crearConceptoColaborador: (colaboradorId: string, dto: CrearConceptoColaborador) =>
    req<ConceptoColaborador>('POST', `/colaboradores/${colaboradorId}/conceptos`, dto),
  /**
   * NO elimina la fila: la cierra con `vigenteHasta` (`ADR-021`). Sin fecha
   * explícita el servidor cierra con la de hoy.
   */
  cerrarConceptoColaborador: (colaboradorId: string, conceptoId: string, vigenteHasta?: string) =>
    req<ConceptoColaborador>(
      'DELETE',
      `/colaboradores/${colaboradorId}/conceptos/${conceptoId}`,
      vigenteHasta ? { vigenteHasta } : undefined,
    ),
  // Documentos del colaborador (multipart)
  documentosColaborador: (colaboradorId: string) =>
    req<DocumentoColaborador[]>('GET', `/colaboradores/${colaboradorId}/documentos`),
  subirDocumentoColaborador: (colaboradorId: string, archivo: File, tipo: TipoDocumento) => {
    const form = new FormData();
    // El campo `tipo` va ANTES que `archivo`: el backend lee los campos del
    // formulario acumulados hasta el momento en que encuentra la primera
    // parte de tipo archivo (`req.file()` de @fastify/multipart). Si `tipo`
    // llegara después, el servidor lo vería vacío y asignaría "otro" sin
    // avisar — un bug silencioso de orden, no de contenido.
    form.append('tipo', tipo);
    form.append('archivo', archivo);
    return reqMultipart<DocumentoColaborador>('POST', `/colaboradores/${colaboradorId}/documentos`, form);
  },
  eliminarDocumentoColaborador: (colaboradorId: string, docId: string) =>
    req<{ ok: true }>('DELETE', `/colaboradores/${colaboradorId}/documentos/${docId}`),
  /** URL de descarga directa: la cookie de sesión viaja sola en la navegación same-origin. */
  urlDescargaDocumentoColaborador: (colaboradorId: string, docId: string) =>
    `/api/colaboradores/${colaboradorId}/documentos/${docId}/descargar`,
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
  // Catalogo de conceptos y movimientos del periodo
  conceptos: (fecha: string) => req<Concepto[]>('GET', `/conceptos?fecha=${fecha}`),
  movimientos: (planillaId: string) =>
    req<Movimiento[]>('GET', `/planillas/${planillaId}/movimientos`),
  crearMovimiento: (planillaId: string, dto: CrearMovimiento) =>
    req<Movimiento>('POST', `/planillas/${planillaId}/movimientos`, dto),
  eliminarMovimiento: (planillaId: string, movId: string) =>
    req<{ ok: true }>('DELETE', `/planillas/${planillaId}/movimientos/${movId}`),
  calcularVacaciones: (planillaId: string, colaboradorId: string) =>
    req<CicloVacaciones>('GET', `/planillas/${planillaId}/vacaciones/${colaboradorId}`),
};
