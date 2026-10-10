<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Rules;

use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Money\Money;

/**
 * RULE-005 — Seguro Educativo obrero: base gravable × SE_OBRERO_SALARIO (docs/nomix/04 §1).
 * No se aplica al XIII mes: el cálculo del XIII (NMX-050) no usa esta regla.
 */
final readonly class EducationInsuranceEmployeeRule
{
    public const string RULE_ID = 'RULE-005';

    public function calculate(Money $taxableBase, LegalParameters $parameters): LineItem
    {
        return RateContribution::fromParameter(Concept::SeObrero, self::RULE_ID, LegalParameterCode::SeObreroSalario, $taxableBase, $parameters);
    }
}
