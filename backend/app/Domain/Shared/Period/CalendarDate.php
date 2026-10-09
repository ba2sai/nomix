<?php

declare(strict_types=1);

namespace App\Domain\Shared\Period;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

/**
 * Construye fechas de calendario sin hora (medianoche UTC), para que comparar y
 * contar días no dependa de la zona horaria ni de la fecha del sistema.
 *
 * @internal
 */
final class CalendarDate
{
    public static function of(int $year, int $month, int $day): DateTimeImmutable
    {
        if (! checkdate($month, $day, $year)) {
            throw PeriodException::invalidDate($year, $month, $day);
        }

        return new DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day), new DateTimeZone('UTC'));
    }

    /** Toma solo el día de calendario de cualquier fecha, en su propia zona horaria. */
    public static function from(DateTimeInterface $date): DateTimeImmutable
    {
        return self::of((int) $date->format('Y'), (int) $date->format('n'), (int) $date->format('j'));
    }
}
