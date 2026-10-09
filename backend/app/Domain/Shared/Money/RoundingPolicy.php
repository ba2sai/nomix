<?php

declare(strict_types=1);

namespace App\Domain\Shared\Money;

/**
 * Política de redondeo (RULE-080, estado PENDIENTE en el catálogo).
 *
 * No tiene valores por defecto en el código: la propuesta del catálogo (2 decimales,
 * HALF_UP, 6 decimales intermedios) se cargará desde parametros_legales en NMX-006.
 */
final readonly class RoundingPolicy
{
    public const string RULE_ID = 'RULE-080';

    /** @var int<0, max> Decimales del resultado final de cada concepto. */
    public int $scale;

    /** @var int<0, max> Decimales de los cálculos intermedios inexactos (divisiones). */
    public int $intermediateScale;

    public function __construct(int $scale, public RoundingMode $mode, int $intermediateScale)
    {
        if ($scale < 0) {
            throw MoneyException::invalidPolicy('la escala final no puede ser negativa');
        }

        if ($intermediateScale < $scale) {
            throw MoneyException::invalidPolicy('la escala intermedia no puede ser menor que la final');
        }

        $this->scale = $scale;
        $this->intermediateScale = $intermediateScale;
    }
}
