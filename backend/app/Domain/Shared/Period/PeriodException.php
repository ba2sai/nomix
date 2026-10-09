<?php

declare(strict_types=1);

namespace App\Domain\Shared\Period;

use App\Domain\Shared\DomainException;

final class PeriodException extends DomainException
{
    public static function invalidDate(int $year, int $month, int $day): self
    {
        return new self(sprintf('Fecha inválida: %04d-%02d-%02d.', $year, $month, $day));
    }

    public static function invalidFortnight(int $half): self
    {
        return new self("Quincena inválida: {$half}. Usa 1 (días 1–15) o 2 (16–fin de mes).");
    }

    public static function spansSeveralInstallments(PayPeriod $period): self
    {
        return new self(sprintf(
            'El período %s–%s cruza varias partidas del XIII mes; usa thirteenthMonthInstallments().',
            $period->start->format('Y-m-d'),
            $period->end->format('Y-m-d'),
        ));
    }
}
