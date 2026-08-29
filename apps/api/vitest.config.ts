import { defineConfig } from 'vitest/config';

/**
 * Las pruebas de la API no corren en paralelo entre archivos.
 *
 * No es una preferencia de rendimiento: `membresia.test.ts` **vence a
 * propósito** la membresía del usuario demo para comprobar ARCHITECTURE §5.4,
 * y `tenant.test.ts` lee esa misma membresía para comprobar el aislamiento.
 * Contra una única base de datos compartida, esos dos archivos se pisan — y el
 * síntoma es una suite que pasa o falla según qué archivo gane la carrera, que
 * es peor que una que falla siempre.
 *
 * La alternativa —una base por archivo, o un usuario distinto por prueba—
 * compraría paralelismo a cambio de que la prueba deje de ejercitar el dato
 * real que usa la aplicación. Para una suite que tarda tres segundos, el
 * paralelismo no vale ese precio.
 */
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
