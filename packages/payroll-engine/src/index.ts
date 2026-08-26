// @nomix/payroll-engine — API pública del motor de cálculo.
//
// Este paquete NO importa nada del proyecto (salvo decimal.js). Recibe
// insumos y reglas ya resueltas, devuelve resultados con trazabilidad.
// Por eso corre igual en el servidor y en el navegador (ARCHITECTURE §2).

export { Money, Rate } from './money.js';
export {
  calcularSeguridadSocial,
  type TasasSeguridadSocial,
  type ResultadoSeguridadSocial,
  type LineaCalculada,
} from './seguridad-social/css.js';
