<?php

declare(strict_types=1);

namespace App\Domain\Shared\Period;

use DateInterval;
use DatePeriod;
use DateTimeImmutable;
use DateTimeInterface;

/**
 * Período de pago con fechas inclusivas: quincena (1–15 y 16–fin de mes),
 * bisemana (14 días desde una fecha de inicio) o mes calendario.
 */
final readonly class PayPeriod
{
    private function __construct(
        public PayFrequency $frequency,
        public DateTimeImmutable $start,
        public DateTimeImmutable $end,
    ) {}

    /**
     * @param  int  $half  1 = días 1–15; 2 = día 16 al último del mes.
     */
    public static function fortnight(int $year, int $month, int $half): self
    {
        return match ($half) {
            1 => new self(PayFrequency::Quincenal, CalendarDate::of($year, $month, 1), CalendarDate::of($year, $month, 15)),
            2 => self::untilEndOfMonth(PayFrequency::Quincenal, CalendarDate::of($year, $month, 16)),
            default => throw PeriodException::invalidFortnight($half),
        };
    }

    /** Bisemana: 14 días, el de inicio incluido. */
    public static function biweekly(DateTimeInterface $start): self
    {
        $first = CalendarDate::from($start);

        return new self(PayFrequency::Bisemanal, $first, $first->modify('+13 days'));
    }

    public static function month(int $year, int $month): self
    {
        return self::untilEndOfMonth(PayFrequency::Mensual, CalendarDate::of($year, $month, 1));
    }

    /** Días de calendario del período, ambos extremos incluidos. */
    public function days(): int
    {
        return iterator_count(new DatePeriod($this->start, new DateInterval('P1D'), $this->end, DatePeriod::INCLUDE_END_DATE));
    }

    public function contains(DateTimeInterface $date): bool
    {
        $day = CalendarDate::from($date);

        return $day >= $this->start && $day <= $this->end;
    }

    /**
     * Partida del XIII mes a la que pertenece el período (RULE-030).
     *
     * @throws PeriodException si el período cruza dos partidas (posible en meses y bisemanas).
     */
    public function thirteenthMonthInstallment(): ThirteenthMonthInstallment
    {
        $installments = $this->thirteenthMonthInstallments();

        if (count($installments) > 1) {
            throw PeriodException::spansSeveralInstallments($this);
        }

        return $installments[0];
    }

    /**
     * Las partidas que el período toca, en orden: la del inicio y, si es distinta, la del
     * fin. Un período dura como máximo un mes y una partida cuatro, así que nunca hay más
     * de dos. Cómo repartir el salario entre ellas no está definido en el catálogo y se
     * resolverá en el motor de XIII mes.
     *
     * @return non-empty-list<ThirteenthMonthInstallment>
     */
    public function thirteenthMonthInstallments(): array
    {
        $first = ThirteenthMonthInstallment::forDate($this->start);
        $last = ThirteenthMonthInstallment::forDate($this->end);

        return $first->equals($last) ? [$first] : [$first, $last];
    }

    private static function untilEndOfMonth(PayFrequency $frequency, DateTimeImmutable $start): self
    {
        return new self($frequency, $start, $start->modify('last day of this month'));
    }
}
