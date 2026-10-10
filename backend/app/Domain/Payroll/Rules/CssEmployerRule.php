<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Rules;

use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Money\Money;

/**
 * RULE-002 — Cuota patronal de la CSS sobre salario: base gravable × CSS_PATRONAL_SALARIO
 * (docs/nomix/04 §1). La tasa cambia en 2027 y 2029 según el *mes de cuota*: la regla usa la
 * vigente en la fecha de los LegalParameters que recibe, y qué fecha es el mes de cuota lo
 * decide quien los carga (pendiente de confirmar).
 */
final readonly class CssEmployerRule
{
    public const string RULE_ID = 'RULE-002';

    public function calculate(Money $taxableBase, LegalParameters $parameters): LineItem
    {
        return RateContribution::fromParameter(Concept::CssPatronal, self::RULE_ID, LegalParameterCode::CssPatronalSalario, $taxableBase, $parameters);
    }
}
