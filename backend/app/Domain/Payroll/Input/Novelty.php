<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Input;

use App\Domain\Payroll\PayrollException;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Period\CalendarDate;
use DateTimeImmutable;
use DateTimeInterface;

/**
 * Un hecho del período que afecta el cálculo (`novedades`, docs/nomix/06). Las de tiempo
 * llevan cantidad (horas o días) y las de dinero, monto. El subtipo (p. ej. el recargo de
 * una hora extra) lo interpreta la regla que la calcula.
 */
final readonly class Novelty
{
    public DateTimeImmutable $date;

    private function __construct(
        public NoveltyType $type,
        DateTimeInterface $date,
        public ?string $quantity,
        public ?Money $amount,
        public ?string $subtype,
    ) {
        $this->date = CalendarDate::from($date);
    }

    /** Hora extra, ausencia, tardanza o incapacidad: horas o días. */
    public static function time(NoveltyType $type, DateTimeInterface $date, string $quantity, ?string $subtype = null): self
    {
        if (! $type->measuresTime()) {
            throw PayrollException::noveltyAmountRequired($type->value);
        }

        return new self($type, $date, Decimals::positive('cantidad', $quantity), null, self::checkSubtype($subtype));
    }

    /** Bono, comisión, otro ingreso u otro descuento: un monto con 2 decimales como máximo. */
    public static function money(NoveltyType $type, DateTimeInterface $date, Money $amount, ?string $subtype = null): self
    {
        if ($type->measuresTime()) {
            throw PayrollException::noveltyQuantityRequired($type->value);
        }

        if (! $amount->isPositive()) {
            throw PayrollException::outOfRange('monto', $amount->toDecimalString(), '(0, ∞)');
        }

        if (! $amount->fitsScale(2)) {
            throw PayrollException::amountNotRounded('monto', $amount->toDecimalString());
        }

        return new self($type, $date, null, $amount, self::checkSubtype($subtype));
    }

    private static function checkSubtype(?string $subtype): ?string
    {
        if ($subtype !== null && trim($subtype) === '') {
            throw PayrollException::emptySubtype();
        }

        return $subtype;
    }
}
