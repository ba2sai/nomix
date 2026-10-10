<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Rules;

use App\Domain\Payroll\PayrollException;
use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Rules\RoundingRule;
use App\Domain\Shared\Rules\RuleTrace;
use App\Domain\Shared\Rules\TraceInput;

/**
 * Cuota = base gravable × tasa, redondeada según RULE-080. La comparten las cuotas sobre
 * salario de CSS, Seguro Educativo y Riesgos Profesionales.
 *
 * La base gravable llega ya armada: qué conceptos la forman sigue pendiente en el catálogo
 * (RULE-001) y lo decide el calculador (NMX-016).
 *
 * @internal
 */
final class RateContribution
{
    /** La tasa es un parámetro de parametros_legales, vigente en la fecha de `$parameters`. */
    public static function fromParameter(Concept $concept, string $ruleId, LegalParameterCode $rate, Money $taxableBase, LegalParameters $parameters): LineItem
    {
        $parameter = $parameters->get($rate);

        return self::line($concept, $ruleId, "base_gravable × {$parameter->code}", $taxableBase, $parameter->value(), [TraceInput::parameter($parameter)], $parameters);
    }

    /**
     * @param  string  $rate  tasa como string decimal, p. ej. '0.0975'
     * @param  list<TraceInput>  $rateInputs  de dónde sale la tasa, para la traza
     */
    public static function line(Concept $concept, string $ruleId, string $formula, Money $taxableBase, string $rate, array $rateInputs, LegalParameters $parameters): LineItem
    {
        if ($taxableBase->isNegative() || ! $taxableBase->fitsScale(2)) {
            throw PayrollException::invalidTaxableBase($ruleId);
        }

        return new LineItem($concept, RuleTrace::calculated(
            $ruleId,
            $formula,
            // La base puede coincidir con el salario base; solo se conserva en memoria.
            [TraceInput::money('base_gravable', $taxableBase, sensitive: true), ...$rateInputs],
            $taxableBase->multipliedBy($rate),
            RoundingRule::from($parameters),
        ));
    }
}
