import { describe, it, expect } from 'vitest';
import { puede, permisosDe, esRolConocido, PERMISOS, ROLES, PERMISOS_SENSIBLES } from './permisos.js';
import type { Permiso, Rol } from './permisos.js';

/**
 * La matriz de autorización (ADR-018) es una decisión de seguridad, así que se
 * prueba como tal: no "el código hace lo que hace", sino que las propiedades
 * que justifican el diseño siguen ciertas cuando alguien edite la tabla.
 */
describe('matriz de permisos (ADR-018)', () => {
  describe('fail-closed', () => {
    it('un rol desconocido no tiene ningún permiso', () => {
      for (const p of PERMISOS) {
        expect(puede('superusuario_inventado', p)).toBe(false);
      }
      expect(permisosDe('superusuario_inventado')).toEqual([]);
      expect(esRolConocido('superusuario_inventado')).toBe(false);
    });

    it('la cadena vacía y valores raros de la columna `rol` no abren nada', () => {
      for (const rol of ['', ' ', 'ADMIN_RRHH', 'admin rrhh', '*']) {
        expect(permisosDe(rol)).toEqual([]);
      }
    });
  });

  describe('separación de funciones — el control que motiva el ADR', () => {
    it('quien captura y calcula la planilla no puede aprobarla', () => {
      expect(puede('AsistRRHH', 'planilla:calcular')).toBe(true);
      expect(puede('AsistRRHH', 'planilla:aprobar')).toBe(false);
      expect(puede('AsistRRHH', 'planilla:cerrar')).toBe(false);
    });

    /**
     * Acumular "preparo la planilla" y "la mando a pagar" en un mismo rol es
     * exactamente lo que el control interno de una nómina existe para impedir.
     * Se permite en los roles de mando —que responden por ello— y en soporte;
     * si alguien se lo concede a un asistente, esta prueba lo detiene.
     */
    it('solo los roles de mando acumulan calcular + aprobar', () => {
      const acumulan = ROLES.filter(
        (r) => puede(r, 'planilla:calcular') && puede(r, 'planilla:aprobar'),
      );
      expect(acumulan).toEqual(['GlobalAdmin', 'AdminFinanzas', 'AdminRRHH']);
    });

    it('aprobar y cerrar van siempre juntos: aprobar sin poder cerrar deja el proceso a medias', () => {
      for (const r of ROLES) {
        expect(puede(r, 'planilla:cerrar')).toBe(puede(r, 'planilla:aprobar'));
      }
    });
  });

  describe('AsistContable es de solo lectura', () => {
    const escrituras: Permiso[] = [
      'colaborador:escribir',
      'planilla:calcular',
      'planilla:aprobar',
      'planilla:cerrar',
      'movimiento:escribir',
      'liquidacion:proponer',
    ];

    it.each(escrituras)('no puede %s', (p) => {
      expect(puede('AsistContable', p)).toBe(false);
    });

    it('sí puede leer la bitácora — un rastro que solo ve el auditado no audita', () => {
      expect(puede('AsistContable', 'auditoria:leer')).toBe(true);
    });

    /**
     * Ve los resultados de la planilla, no la ficha: para cuadrar un asiento
     * hace falta cuánto se pagó y a quién, no la cédula ni la cuenta bancaria.
     */
    it('ve los resultados de planilla pero no la ficha del colaborador', () => {
      expect(puede('AsistContable', 'planilla:leer')).toBe(true);
      expect(puede('AsistContable', 'colaborador:leer')).toBe(false);
    });
  });

  describe('alcance por empresa (ADR-020)', () => {
    /**
     * `GlobalAdmin` es "todo" DENTRO de su empresa, no sobre todas. El alcance
     * multi-empresa no vive en esta matriz sino en la membresía, y esta prueba
     * está aquí para que quien busque "cómo doy acceso global" lea el ADR en
     * vez de inventarse un permiso comodín.
     */
    it('GlobalAdmin tiene todos los permisos existentes', () => {
      for (const p of PERMISOS) {
        expect(puede('GlobalAdmin', p)).toBe(true);
      }
    });

    it('ningún rol otorga acceso fuera de su empresa: no existe tal permiso', () => {
      expect([...PERMISOS].some((p) => (p as string).includes('global'))).toBe(false);
    });
  });

  describe('cobertura de la bitácora (ADR-019)', () => {
    it('todo permiso sensible es un permiso declarado', () => {
      for (const p of PERMISOS_SENSIBLES) {
        expect(PERMISOS).toContain(p);
      }
    });

    /**
     * Si un rol puede leer colaboradores o planillas, está viendo
     * remuneración identificable y su acceso tiene que quedar registrado.
     */
    it('leer colaboradores o planillas siempre cuenta como acceso sensible', () => {
      expect(PERMISOS_SENSIBLES.has('colaborador:leer')).toBe(true);
      expect(PERMISOS_SENSIBLES.has('planilla:leer')).toBe(true);
    });
  });

  describe('integridad de la matriz', () => {
    it('todo permiso concedido a algún rol existe en PERMISOS', () => {
      for (const rol of ROLES) {
        for (const p of permisosDe(rol)) {
          expect(PERMISOS).toContain(p);
        }
      }
    });

    it('todo permiso declarado lo tiene al menos un rol — nada queda inalcanzable', () => {
      const alcanzables = new Set<Permiso>(ROLES.flatMap((r: Rol) => permisosDe(r)));
      expect([...PERMISOS].filter((p) => !alcanzables.has(p))).toEqual([]);
    });
  });
});
