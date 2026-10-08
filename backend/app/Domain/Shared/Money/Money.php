<?php

declare(strict_types=1);

namespace App\Domain\Shared\Money;

use Brick\Math\BigDecimal;
use Brick\Math\Exception\RoundingNecessaryException;
use JsonSerializable;
use Stringable;

/**
 * Monto en balboas/USD con aritmética decimal exacta (brick/math).
 *
 * Sumas, restas y multiplicaciones son exactas y conservan todos los decimales.
 * Solo dividedBy() y round() redondean, y siempre según una RoundingPolicy (RULE-080).
 * Para serializar, el monto debe caber en 2 decimales: redondea antes.
 */
final readonly class Money implements JsonSerializable, Stringable
{
    private const string DECIMAL_PATTERN = '/^-?\d+(\.\d+)?$/';

    private function __construct(private BigDecimal $amount) {}

    public static function of(string|int $amount): self
    {
        return new self(self::toDecimal($amount));
    }

    public static function zero(): self
    {
        return new self(BigDecimal::zero());
    }

    public function plus(self $other): self
    {
        return new self($this->amount->plus($other->amount));
    }

    public function minus(self $other): self
    {
        return new self($this->amount->minus($other->amount));
    }

    /**
     * Multiplicación exacta, p. ej. por una tasa ('0.0975' = 9.75%). No redondea.
     */
    public function multipliedBy(string|int $factor): self
    {
        return new self($this->amount->multipliedBy(self::toDecimal($factor)));
    }

    /**
     * División redondeada a la escala intermedia de la política.
     */
    public function dividedBy(string|int $divisor, RoundingPolicy $policy): self
    {
        $decimalDivisor = self::toDecimal($divisor);

        if ($decimalDivisor->isZero()) {
            throw MoneyException::divisionByZero();
        }

        return new self($this->amount->dividedBy($decimalDivisor, $policy->intermediateScale, $policy->mode->toBrick()));
    }

    /**
     * Redondeo final de un concepto según RULE-080.
     */
    public function round(RoundingPolicy $policy): self
    {
        return new self($this->amount->toScale($policy->scale, $policy->mode->toBrick()));
    }

    public function compareTo(self $other): int
    {
        return $this->amount->compareTo($other->amount);
    }

    public function isEqualTo(self $other): bool
    {
        return $this->compareTo($other) === 0;
    }

    public function isGreaterThan(self $other): bool
    {
        return $this->compareTo($other) > 0;
    }

    public function isGreaterThanOrEqualTo(self $other): bool
    {
        return $this->compareTo($other) >= 0;
    }

    public function isLessThan(self $other): bool
    {
        return $this->compareTo($other) < 0;
    }

    public function isLessThanOrEqualTo(self $other): bool
    {
        return $this->compareTo($other) <= 0;
    }

    public function isZero(): bool
    {
        return $this->amount->isZero();
    }

    public function isNegative(): bool
    {
        return $this->amount->isNegative();
    }

    public function isPositive(): bool
    {
        return $this->amount->isPositive();
    }

    /**
     * Representación con exactamente 2 decimales, p. ej. "1234.50".
     *
     * @throws MoneyException si el monto tiene más de 2 decimales significativos.
     */
    public function toString(): string
    {
        try {
            // La API siempre expone 2 decimales (docs/nomix/05 §2.6), con independencia de RULE-080.
            return $this->amount->toScale(2)->toString();
        } catch (RoundingNecessaryException) {
            throw MoneyException::notRounded($this->amount->toString());
        }
    }

    public function __toString(): string
    {
        return $this->toString();
    }

    public function jsonSerialize(): string
    {
        return $this->toString();
    }

    private static function toDecimal(string|int $value): BigDecimal
    {
        if (is_string($value) && preg_match(self::DECIMAL_PATTERN, $value) !== 1) {
            throw MoneyException::invalidAmount($value);
        }

        return BigDecimal::of($value);
    }
}
