<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Rules;

use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Money\Money;

/**
 * RULE-001 — Cuota obrera de la CSS sobre salario: base gravable × CSS_OBRERO_SALARIO, sin
 * tope de cotización (docs/nomix/04 §1).
 */
final readonly class CssEmployeeRule
{
    public const string RULE_ID = 'RULE-001';

    public function calculate(Money $taxableBase, LegalParameters $parameters): LineItem
    {
        return RateContribution::fromParameter(Concept::CssObrero, self::RULE_ID, LegalParameterCode::CssObreroSalario, $taxableBase, $parameters);
    }
}
