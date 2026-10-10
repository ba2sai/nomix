<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Input;

use App\Domain\Payroll\PayrollException;
use Brick\Math\BigDecimal;

/**
 * Validación de cantidades y tasas que llegan como string decimal (horas, días, tasas).
 *
 * @internal
 */
final class Decimals
{
    private const string DECIMAL_PATTERN = '/^-?\d+(\.\d+)?$/';

    /** Mayor que cero y, si se indica, como máximo `$max`. */
    public static function positive(string $field, string $value, ?string $max = null): string
    {
        $decimal = self::parse($field, $value);

        if (! $decimal->isPositive() || ($max !== null && $decimal->isGreaterThan($max))) {
            throw PayrollException::outOfRange($field, $value, $max === null ? '(0, ∞)' : "(0, {$max}]");
        }

        return $value;
    }

    /** Tasa entre 0 (incluido) y 1 (excluido): 0.021000 = 2.10%. */
    public static function rate(string $field, string $value): string
    {
        $decimal = self::parse($field, $value);

        if ($decimal->isNegative() || $decimal->isGreaterThanOrEqualTo(1)) {
            throw PayrollException::outOfRange($field, $value, '[0, 1)');
        }

        return $value;
    }

    private static function parse(string $field, string $value): BigDecimal
    {
        if (preg_match(self::DECIMAL_PATTERN, $value) !== 1) {
            throw PayrollException::invalidDecimal($field, $value);
        }

        return BigDecimal::of($value);
    }
}
