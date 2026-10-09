<?php

declare(strict_types=1);

namespace App\Domain\Shared\Legal;

/**
 * Códigos de `parametros_legales`. Cada caso cita la regla del catálogo (docs/nomix/04)
 * de la que sale su valor; el valor y la vigencia nunca viven en el código.
 */
enum LegalParameterCode: string
{
    // RULE-001 / RULE-002: cuotas CSS sobre salario.
    case CssObreroSalario = 'CSS_OBRERO_SALARIO';
    case CssPatronalSalario = 'CSS_PATRONAL_SALARIO';

    // RULE-003 / RULE-004: cuotas CSS sobre XIII mes.
    case CssObreroXiii = 'CSS_OBRERO_XIII';
    case CssPatronalXiii = 'CSS_PATRONAL_XIII';

    // RULE-005 / RULE-006: Seguro Educativo.
    case SeObreroSalario = 'SE_OBRERO_SALARIO';
    case SePatronalSalario = 'SE_PATRONAL_SALARIO';

    // RULE-007: rango de referencia; la tasa real es por empresa.
    case RiesgoProfesionalTasaMinima = 'RIESGO_PROFESIONAL_TASA_MINIMA';
    case RiesgoProfesionalTasaMaxima = 'RIESGO_PROFESIONAL_TASA_MAXIMA';

    // RULE-010 / RULE-011 / RULE-012: ISR.
    case IsrTarifaAnual = 'ISR_TARIFA_ANUAL';
    case IsrProyeccionFactorAnual = 'ISR_PROYECCION_FACTOR_ANUAL';
    case IsrDeduccionDeclaracionConjunta = 'ISR_DEDUCCION_DECLARACION_CONJUNTA';
    case IsrDeduccionDependiente = 'ISR_DEDUCCION_DEPENDIENTE';
    case IsrGastosRepresentacionTarifa = 'ISR_GASTOS_REPRESENTACION_TARIFA';

    // RULE-020: horas extra.
    case HoraExtraRecargoDiurno = 'HORA_EXTRA_RECARGO_DIURNO';
    case HoraExtraRecargoNocturno = 'HORA_EXTRA_RECARGO_NOCTURNO';
    case HoraExtraRecargoExtensionNocturna = 'HORA_EXTRA_RECARGO_EXTENSION_NOCTURNA';
    case HoraExtraMaximoDiario = 'HORA_EXTRA_MAXIMO_DIARIO';
    case HoraExtraMaximoSemanal = 'HORA_EXTRA_MAXIMO_SEMANAL';

    // RULE-021: recargos de domingo, descanso y días de fiesta.
    case RecargoDomingoDescanso = 'RECARGO_DOMINGO_DESCANSO';
    case RecargoDiaFiesta = 'RECARGO_DIA_FIESTA';

    // RULE-022: conversión a salario por hora.
    case HorasMensualesJornada48 = 'HORAS_MENSUALES_JORNADA_48H';

    // RULE-030: XIII mes.
    case XiiiDivisor = 'XIII_DIVISOR';

    // RULE-040: vacaciones.
    case VacacionesDiasPorPeriodo = 'VACACIONES_DIAS_POR_PERIODO';
    case VacacionesMesesPorPeriodo = 'VACACIONES_MESES_POR_PERIODO';
    case VacacionesDiasServicioPorDia = 'VACACIONES_DIAS_SERVICIO_POR_DIA';

    // RULE-050 / RULE-051 / RULE-052: terminación.
    case PrimaAntiguedadSemanasPorAnio = 'PRIMA_ANTIGUEDAD_SEMANAS_POR_ANIO';
    case IndemnizacionEscala = 'INDEMNIZACION_ESCALA';
    case PreavisoDespidoDias = 'PREAVISO_DESPIDO_DIAS';
    case PreavisoRenunciaDias = 'PREAVISO_RENUNCIA_DIAS';
    case PreavisoRenunciaDescuentoSemanas = 'PREAVISO_RENUNCIA_DESCUENTO_SEMANAS';

    // RULE-080: redondeo.
    case RedondeoPolitica = 'REDONDEO_POLITICA';
}
