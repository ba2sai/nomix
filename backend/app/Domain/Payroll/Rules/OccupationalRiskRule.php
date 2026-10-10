<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Rules;

use App\Domain\Payroll\Input\EmployerSnapshot;
use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Payroll\Result\PayrollWarning;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Rules\TraceInput;
use Brick\Math\BigDecimal;

/**
 * RULE-007 — Riesgos Profesionales (patronal): base gravable × tasa propia de la empresa,
 * asignada por la CSS según su actividad (empresas.tasa_riesgo_profesional). La regla es
 * PARCIAL: la base de cálculo y su aplicación al XIII mes siguen pendientes (docs/nomix/04 §1).
 *
 * La tasa no sale de parametros_legales, así que la traza incluye el rango de referencia del
 * catálogo (RIESGO_PROFESIONAL_TASA_MINIMA y _MAXIMA, PARCIAL): la línea hereda el estado de
 * la regla y no habilita producción. Una tasa fuera de ese rango no bloquea el cálculo, pero
 * genera un aviso (warnings()).
 */
final readonly class OccupationalRiskRule
{
    public const string RULE_ID = 'RULE-007';

    public const string OUT_OF_RANGE_WARNING = 'RIESGO_PROFESIONAL_FUERA_DE_RANGO';

    public function calculate(Money $taxableBase, EmployerSnapshot $employer, LegalParameters $parameters): LineItem
    {
        $rate = $employer->occupationalRiskRate;

        return RateContribution::line(Concept::RiesgoProfesional, self::RULE_ID, 'base_gravable × tasa_riesgo_profesional', $taxableBase, $rate, [
            TraceInput::quantity('tasa_riesgo_profesional', $rate),
            TraceInput::parameter($parameters->get(LegalParameterCode::RiesgoProfesionalTasaMinima)),
            TraceInput::parameter($parameters->get(LegalParameterCode::RiesgoProfesionalTasaMaxima)),
        ], $parameters);
    }

    /**
     * Aviso si la tasa de la empresa queda fuera del rango de referencia (extremos incluidos).
     *
     * @return list<PayrollWarning>
     */
    public function warnings(EmployerSnapshot $employer, LegalParameters $parameters): array
    {
        $rate = $employer->occupationalRiskRate;
        $minimum = $parameters->value(LegalParameterCode::RiesgoProfesionalTasaMinima);
        $maximum = $parameters->value(LegalParameterCode::RiesgoProfesionalTasaMaxima);

        if (BigDecimal::of($rate)->isLessThan($minimum) || BigDecimal::of($rate)->isGreaterThan($maximum)) {
            return [new PayrollWarning(
                self::OUT_OF_RANGE_WARNING,
                "La tasa de Riesgos Profesionales de la empresa ({$rate}) está fuera del rango de referencia del catálogo ({$minimum} a {$maximum}). Verifica la tasa que asignó la CSS.",
                self::RULE_ID,
            )];
        }

        return [];
    }
}
