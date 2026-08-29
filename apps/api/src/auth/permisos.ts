/**
 * Matriz de autorización rol × permiso (`ADR-018`, cierra `GAP-005`).
 *
 * # Por qué esto vive en el código y no en `regla`
 *
 * El proyecto tiene una convención fuerte —"ninguna constante en el código,
 * todo dato versionado por vigencia"— pero esa convención habla de reglas
 * LEGALES: cambian por decreto, en una fecha, y recalcular 2024 exige las de
 * 2024. Una política de autorización no es nada de eso. Es postura de
 * seguridad de la aplicación, y tiene la propiedad contraria: debe ser
 * revisable en el diff, cubierta por pruebas, y **no** modificable por quien
 * consiga escribir en la base de datos. Meterla en `regla` convertiría un
 * acceso de escritura a una tabla en una escalada de privilegios.
 *
 * Lo que sí es dato es la ASIGNACIÓN de rol a persona: `usuario_empresa.rol`,
 * por empresa y con vigencia (ADR-011).
 *
 * # Separación de funciones
 *
 * Quien captura y calcula NO aprueba. No es un capricho de diseño: es el
 * control interno básico de una nómina, donde el mismo par de manos que
 * introduce un movimiento no debería poder cerrarlo y mandarlo a pagar.
 * `operador_nomina` llega hasta `calcular`; `aprobar` y `cerrar` son de
 * `admin_rrhh`. `GAP-005` preguntaba exactamente esto ("quién aprueba y quién
 * puede revertir") y esta es la respuesta declarada, no una omisión.
 */

/** Verbos de autorización. La ruta declara el que necesita, no el rol. */
export const PERMISOS = [
  'colaborador:leer',
  'colaborador:escribir',
  'planilla:leer',
  'planilla:calcular',
  'planilla:aprobar',
  'planilla:cerrar',
  'movimiento:escribir',
  'liquidacion:proponer',
  /**
   * Catálogo de conceptos y reglas vigentes. Es dato de REFERENCIA —tasas de
   * CSS, tramos de ISR, incidencia—, no dato personal: no lleva el nombre de
   * nadie ni una cifra que identifique a alguien. Tiene permiso propio en vez
   * de reusar `planilla:leer` para no inundar la bitácora con la consulta que
   * hace cada carga de pantalla, que enterraría los accesos que sí importan.
   */
  'catalogo:leer',
  'auditoria:leer',
] as const;

export type Permiso = (typeof PERMISOS)[number];

export const ROLES = ['admin_rrhh', 'operador_nomina', 'contador_auditor', 'colaborador'] as const;

export type Rol = (typeof ROLES)[number];

/**
 * Permisos que exponen remuneración identificable. Marcarlos aquí —y no en
 * cada controlador— es lo que garantiza la cobertura de la bitácora: una ruta
 * nueva que sirva salarios declara su permiso, y con eso ya queda auditada
 * (`ADR-019`). No se puede añadir un endpoint de salarios sin rastro salvo
 * quitando su permiso de esta lista, que es un cambio visible en el diff.
 */
export const PERMISOS_SENSIBLES: ReadonlySet<Permiso> = new Set<Permiso>([
  'colaborador:leer',
  'colaborador:escribir',
  'planilla:leer',
  'planilla:calcular',
  'liquidacion:proponer',
]);

/**
 * La matriz. Un rol ausente aquí no tiene ningún permiso: la asignación de un
 * rol desconocido en `usuario_empresa` deniega en vez de abrir (fail-closed).
 */
const MATRIZ: Readonly<Record<Rol, readonly Permiso[]>> = {
  /** Administrador de RRHH: control completo, incluida la aprobación. */
  admin_rrhh: [
    'colaborador:leer',
    'colaborador:escribir',
    'planilla:leer',
    'planilla:calcular',
    'planilla:aprobar',
    'planilla:cerrar',
    'movimiento:escribir',
    'liquidacion:proponer',
    'catalogo:leer',
    'auditoria:leer',
  ],

  /**
   * Operador de nómina: hace el trabajo del período —captura movimientos y
   * calcula— pero no aprueba ni cierra. Tampoco propone liquidaciones: el
   * cálculo de una salida es material para negociar una terminación y no es
   * parte de correr la quincena.
   */
  operador_nomina: [
    'colaborador:leer',
    'colaborador:escribir',
    'planilla:leer',
    'planilla:calcular',
    'movimiento:escribir',
    'catalogo:leer',
  ],

  /**
   * Contador / auditor externo: ve todo y no toca nada. Incluye la bitácora,
   * porque un rastro que solo puede leer el administrado no sirve para
   * auditarlo.
   */
  contador_auditor: ['colaborador:leer', 'planilla:leer', 'catalogo:leer', 'auditoria:leer'],

  /**
   * Colaborador (portal del empleado). Declarado con la lista vacía a
   * propósito: el portal todavía no existe, y sus permisos no son un
   * subconjunto de los de arriba sino otra dimensión —"lo mío"— que exige
   * filtrar por `colaborador.id`, no solo por empresa. Darle hoy
   * `colaborador:leer` le dejaría ver la nómina completa. Se queda sin acceso
   * hasta que exista el filtro por sujeto.
   */
  colaborador: [],
};

const PERMISOS_POR_ROL: ReadonlyMap<string, ReadonlySet<Permiso>> = new Map(
  Object.entries(MATRIZ).map(([rol, permisos]) => [rol, new Set(permisos)]),
);

export function esRolConocido(rol: string): rol is Rol {
  return PERMISOS_POR_ROL.has(rol);
}

/** ¿El rol tiene el permiso? Un rol desconocido no tiene ninguno. */
export function puede(rol: string, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL.get(rol)?.has(permiso) ?? false;
}

/** Permisos del rol, para que el frontend refleje la misma matriz (ADR-018). */
export function permisosDe(rol: string): readonly Permiso[] {
  const set = PERMISOS_POR_ROL.get(rol);
  return set ? [...set] : [];
}
