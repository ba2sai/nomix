<?php

declare(strict_types=1);

namespace App\Domain\Shared\Period;

use DateTimeImmutable;
use DateTimeInterface;

/**
 * Partida del décimo tercer mes (RULE-030):
 *
 * | Partida | Período                         | Pago           |
 * |---------|---------------------------------|----------------|
 * | 1       | 16 dic (año anterior) – 15 abr  | 15 de abril    |
 * | 2       | 16 abr – 15 ago                 | 15 de agosto   |
 * | 3       | 16 ago – 15 dic                 | 15 de diciembre |
 *
 * El año de la partida es el año de su pago: la partida 1 de 2027 empieza el 16-12-2026.
 */
final readonly class ThirteenthMonthInstallment
{
    public const string RULE_ID = 'RULE-030';

    public DateTimeImmutable $start;

    public DateTimeImmutable $end;

    /**
     * @param  int<1, 3>  $number
     */
    private function __construct(public int $year, public int $number)
    {
        $this->end = CalendarDate::of($year, self::endMonth($number), 15);
        $this->start = $number === 1
            ? CalendarDate::of($year - 1, 12, 16)
            : CalendarDate::of($year, self::endMonth($number - 1), 16);
    }

    /**
     * Mes en que termina (día 15) y se paga cada partida.
     *
     * @param  int<1, 3>  $number
     */
    private static function endMonth(int $number): int
    {
        return match ($number) {
            1 => 4,
            2 => 8,
            3 => 12,
        };
    }

    public static function forDate(DateTimeInterface $date): self
    {
        $day = CalendarDate::from($date);
        $year = (int) $day->format('Y');

        foreach ([1, 2, 3] as $number) {
            $installment = new self($year, $number);

            if ($day <= $installment->end) {
                return $installment;
            }
        }

        // Del 16 al 31 de diciembre: partida 1 del año siguiente.
        return new self($year + 1, 1);
    }

    public function paymentDate(): DateTimeImmutable
    {
        return $this->end;
    }

    public function next(): self
    {
        return $this->number === 3 ? new self($this->year + 1, 1) : new self($this->year, $this->number + 1);
    }

    public function contains(DateTimeInterface $date): bool
    {
        $day = CalendarDate::from($date);

        return $day >= $this->start && $day <= $this->end;
    }

    public function equals(self $other): bool
    {
        return $this->year === $other->year && $this->number === $other->number;
    }
}
