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
 * `AsistRRHH` llega hasta `calcular`; `aprobar` y `cerrar` son de `AdminRRHH`
 * y `AdminFinanzas`. `GAP-005` preguntaba exactamente esto ("quién aprueba y
 * quién puede revertir") y esta es la respuesta declarada, no una omisión.
 *
 * # El alcance sigue siendo POR EMPRESA, incluido GlobalAdmin
 *
 * `GlobalAdmin` tiene todos los permisos **dentro de la empresa donde se le
 * asignó**, no sobre todas a la vez. Dar soporte a una empresa exige tener
 * membresía en ella, con su fecha y su rastro. Un rol verdaderamente global
 * habría obligado a abrir una excepción en `app_current_empresa()`, que es la
 * pieza de la que cuelga todo el aislamiento multi-inquilino (`ADR-020`):
 * cambiar eso por comodidad de soporte habría sido cambiar la propiedad más
 * cara de defender del sistema por la más fácil de conceder.
 *
 * # Nomenclatura
 *
 * Los nombres van tal como los definió el negocio (`GlobalAdmin`, no
 * `global_admin`), aunque el resto de columnas enumeradas del esquema usen
 * snake_case. Se prefiere que el valor guardado en `usuario_empresa.rol` sea
 * exactamente el término que la gente usa al hablar, sin una capa de
 * traducción que solo existiría para satisfacer una convención.
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

export const ROLES = [
  'GlobalAdmin',
  'AdminFinanzas',
  'AdminRRHH',
  'AsistContable',
  'AsistRRHH',
] as const;

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
 *
 * Solo se reparten los permisos que HOY tienen ruta. Contabilidad, marcaciones,
 * incidentes, configuración de la aplicación y alta de usuarios son parte del
 * modelo de roles del negocio pero todavía no existen como funcionalidad; sus
 * permisos se añadirán al construirse cada uno, en vez de declararlos ahora y
 * dejar una matriz que promete accesos a pantallas inexistentes.
 */
const MATRIZ: Readonly<Record<Rol, readonly Permiso[]>> = {
  /**
   * Soporte de la aplicación. Todo, dentro de la empresa donde tenga
   * membresía. No ejecuta el proceso de nómina de forma habitual, pero no se
   * le recorta nada: un rol de soporte que no puede reproducir el problema del
   * usuario no sirve para dar soporte.
   */
  GlobalAdmin: [
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
   * Ve todo menos lo administrativo de la aplicación, que es exclusivo de
   * `GlobalAdmin`.
   *
   * Hoy eso lo deja con los MISMOS permisos efectivos que `GlobalAdmin`, y no
   * es un descuido de copiar y pegar: lo único que los separa —configuración y
   * administración de la aplicación— todavía no existe como funcionalidad, así
   * que no hay ningún permiso que quitarle. La diferencia aparecerá sola
   * cuando esas pantallas se construyan.
   */
  AdminFinanzas: [
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
   * Dueño del proceso de personal: colaboradores, planillas y su aprobación.
   * Lo contable queda fuera (y aún no existe como permiso).
   *
   * NO recibe `auditoria:leer`, y esto es una decisión, no un olvido: RRHH es
   * el principal consumidor de datos de salario, o sea la parte AUDITADA. Una
   * bitácora que lee quien está siendo auditado no audita nada — el mismo
   * argumento por el que `AsistContable` sí la ve. Si el negocio prefiere lo
   * contrario, es cambiar esta línea, pero conviene que sea a sabiendas.
   */
  AdminRRHH: [
    'colaborador:leer',
    'colaborador:escribir',
    'planilla:leer',
    'planilla:calcular',
    'planilla:aprobar',
    'planilla:cerrar',
    'movimiento:escribir',
    'liquidacion:proponer',
    'catalogo:leer',
  ],

  /**
   * Contabilidad: ve los RESULTADOS de la planilla y no toca nada.
   *
   * Sin `colaborador:leer` a propósito: necesita cuánto se pagó y a quién, que
   * es justo lo que da `planilla:leer`. La ficha del colaborador lleva además
   * cédula, cuenta bancaria y domicilio, que no hacen falta para cuadrar un
   * asiento contable.
   */
  AsistContable: ['planilla:leer', 'catalogo:leer', 'auditoria:leer'],

  /**
   * Asistente de RRHH: da de alta colaboradores, captura el devengado del
   * período y calcula la planilla. No aprueba ni cierra — es la separación de
   * funciones que motiva todo el ADR.
   *
   * Tampoco propone liquidaciones: el cálculo de una salida es material para
   * negociar una terminación, no parte de correr la quincena.
   */
  AsistRRHH: [
    'colaborador:leer',
    'colaborador:escribir',
    'planilla:leer',
    'planilla:calcular',
    'movimiento:escribir',
    'catalogo:leer',
  ],
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
