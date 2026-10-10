<?php

declare(strict_types=1);

namespace App\Domain\Shared\Rules;

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Money\RoundingMode;
use App\Domain\Shared\Money\RoundingPolicy;

/**
 * La política de redondeo vigente (RULE-080), construida desde REDONDEO_POLITICA en
 * parametros_legales. Conserva el parámetro para que cada traza que redondea muestre
 * su estado de verificación: mientras RULE-080 esté PENDIENTE, toda traza lo está.
 */
final readonly class RoundingRule
{
    public const string RULE_ID = 'RULE-080';

    private function __construct(
        public RoundingPolicy $policy,
        public LegalParameter $parameter,
    ) {}

    public static function from(LegalParameters $parameters): self
    {
        $parameter = $parameters->get(LegalParameterCode::RedondeoPolitica);
        $table = $parameter->table();

        $scale = $table['escala'] ?? null;
        $mode = $table['modo'] ?? null;
        $intermediateScale = $table['escala_intermedia'] ?? null;

        if (! is_int($scale) || ! is_int($intermediateScale)) {
            throw RuleTraceException::invalidRoundingTable('"escala" y "escala_intermedia" deben ser enteros');
        }

        if (! is_string($mode) || RoundingMode::tryFrom($mode) === null) {
            throw RuleTraceException::invalidRoundingTable('"modo" debe ser uno de '.implode(', ', array_map(
                static fn (RoundingMode $case): string => $case->value,
                RoundingMode::cases(),
            )));
        }

        return new self(new RoundingPolicy($scale, RoundingMode::from($mode), $intermediateScale), $parameter);
    }

    public function round(Money $amount): Money
    {
        return $amount->round($this->policy);
    }
}
