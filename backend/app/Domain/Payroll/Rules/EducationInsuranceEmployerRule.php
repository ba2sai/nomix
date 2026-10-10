<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Rules;

use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Money\Money;

/**
 * RULE-006 — Seguro Educativo patronal: base gravable × SE_PATRONAL_SALARIO (docs/nomix/04 §1).
 */
final readonly class EducationInsuranceEmployerRule
{
    public const string RULE_ID = 'RULE-006';

    public function calculate(Money $taxableBase, LegalParameters $parameters): LineItem
    {
        return RateContribution::fromParameter(Concept::SePatronal, self::RULE_ID, LegalParameterCode::SePatronalSalario, $taxableBase, $parameters);
    }
}
