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
    it('quien calcula la planilla no puede aprobarla', () => {
      expect(puede('operador_nomina', 'planilla:calcular')).toBe(true);
      expect(puede('operador_nomina', 'planilla:aprobar')).toBe(false);
      expect(puede('operador_nomina', 'planilla:cerrar')).toBe(false);
    });

    it('ningún rol operativo acumula calcular + aprobar salvo admin_rrhh', () => {
      const acumulan = ROLES.filter(
        (r) => puede(r, 'planilla:calcular') && puede(r, 'planilla:aprobar'),
      );
      expect(acumulan).toEqual(['admin_rrhh']);
    });
  });

  describe('contador_auditor es de solo lectura', () => {
    const escrituras: Permiso[] = [
      'colaborador:escribir',
      'planilla:calcular',
      'planilla:aprobar',
      'planilla:cerrar',
      'movimiento:escribir',
    ];

    it.each(escrituras)('no puede %s', (p) => {
      expect(puede('contador_auditor', p)).toBe(false);
    });

    it('sí puede leer la bitácora — un rastro que solo ve el auditado no audita', () => {
      expect(puede('contador_auditor', 'auditoria:leer')).toBe(true);
    });
  });

  describe('portal del colaborador', () => {
    /**
     * Mientras no exista el filtro "solo lo mío", darle `colaborador:leer`
     * sería darle la nómina completa de la empresa. La lista vacía es la
     * decisión, no un olvido — si alguien la puebla sin añadir el filtro por
     * sujeto, esta prueba falla y obliga a leer el ADR.
     */
    it('no tiene permisos hasta que exista el filtro por sujeto', () => {
      expect(permisosDe('colaborador')).toEqual([]);
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
