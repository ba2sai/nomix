<?php

declare(strict_types=1);

use App\Domain\Shared\Period\CalendarDate;
use App\Domain\Shared\Period\PayFrequency;
use App\Domain\Shared\Period\PayPeriod;
use App\Domain\Shared\Period\PeriodException;
use App\Domain\Shared\Period\ThirteenthMonthInstallment;

mutates(PayPeriod::class, PeriodException::class, CalendarDate::class);

function ymd(DateTimeInterface $date): string
{
    return $date->format('Y-m-d');
}

/** @param list<ThirteenthMonthInstallment> $installments */
function installmentKeys(array $installments): array
{
    return array_map(fn (ThirteenthMonthInstallment $i): string => $i->year.'-'.$i->number, $installments);
}

describe('quincenas', function (): void {
    it('crea la primera quincena (días 1–15)', function (): void {
        $period = PayPeriod::fortnight(2026, 10, 1);

        expect($period->frequency)->toBe(PayFrequency::Quincenal)
            ->and(ymd($period->start))->toBe('2026-10-01')
            ->and(ymd($period->end))->toBe('2026-10-15')
            ->and($period->days())->toBe(15);
    });

    it('crea la segunda quincena (16–fin de mes)', function (): void {
        $period = PayPeriod::fortnight(2026, 10, 2);

        expect(ymd($period->start))->toBe('2026-10-16')
            ->and(ymd($period->end))->toBe('2026-10-31')
            ->and($period->days())->toBe(16);
    });

    it('termina la quincena de febrero el 29 en año bisiesto', function (int $year): void {
        $period = PayPeriod::fortnight($year, 2, 2);

        expect(ymd($period->end))->toBe("{$year}-02-29")
            ->and($period->days())->toBe(14);
    })->with([2024, 2028]);

    it('termina la quincena de febrero el 28 en año no bisiesto', function (): void {
        $period = PayPeriod::fortnight(2026, 2, 2);

        expect(ymd($period->end))->toBe('2026-02-28')
            ->and($period->days())->toBe(13);
    });

    it('termina el 30 en meses de 30 días', function (): void {
        expect(ymd(PayPeriod::fortnight(2026, 4, 2)->end))->toBe('2026-04-30');
    });

    it('rechaza quincenas distintas de 1 y 2', function (int $half): void {
        expect(fn () => PayPeriod::fortnight(2026, 1, $half))
            ->toThrow(PeriodException::class, "Quincena inválida: {$half}. Usa 1 (días 1–15) o 2 (16–fin de mes).");
    })->with([0, 3]);

    it('rechaza meses inválidos', function (int $month): void {
        expect(fn () => PayPeriod::fortnight(2026, $month, 1))
            ->toThrow(PeriodException::class, sprintf('Fecha inválida: 2026-%02d-01.', $month));
    })->with([0, 13]);
});

describe('meses y bisemanas', function (): void {
    it('crea el mes calendario', function (): void {
        $period = PayPeriod::month(2026, 4);

        expect($period->frequency)->toBe(PayFrequency::Mensual)
            ->and(ymd($period->start))->toBe('2026-04-01')
            ->and(ymd($period->end))->toBe('2026-04-30')
            ->and($period->days())->toBe(30)
            ->and(PayPeriod::month(2028, 2)->days())->toBe(29);
    });

    it('crea una bisemana de 14 días que puede cruzar de año', function (): void {
        $period = PayPeriod::biweekly(new DateTimeImmutable('2026-12-28'));

        expect($period->frequency)->toBe(PayFrequency::Bisemanal)
            ->and(ymd($period->start))->toBe('2026-12-28')
            ->and(ymd($period->end))->toBe('2027-01-10')
            ->and($period->days())->toBe(14);
    });

    it('toma solo el día de calendario de la fecha de inicio', function (): void {
        $start = new DateTimeImmutable('2026-10-05 23:30:00', new DateTimeZone('America/Panama'));
        $period = PayPeriod::biweekly($start);

        expect(ymd($period->start))->toBe('2026-10-05')
            ->and($period->start->format('H:i:s e'))->toBe('00:00:00 UTC');
    });

    it('cuenta los días aunque haya cambio de horario en la zona del servidor', function (): void {
        // Las fechas se normalizan a UTC, así que un cambio de horario local no altera el conteo.
        expect(PayPeriod::month(2026, 3)->days())->toBe(31)
            ->and(PayPeriod::month(2026, 11)->days())->toBe(30);
    });
});

describe('pertenencia de fechas', function (): void {
    it('incluye ambos extremos y excluye los días vecinos', function (string $date, bool $expected): void {
        expect(PayPeriod::fortnight(2026, 10, 1)->contains(new DateTimeImmutable($date)))->toBe($expected);
    })->with([
        'día anterior' => ['2026-09-30', false],
        'inicio' => ['2026-10-01', true],
        'fin con hora' => ['2026-10-15 18:45:00', true],
        'día siguiente' => ['2026-10-16', false],
    ]);
});

describe('partida del XIII mes (RULE-030)', function (): void {
    it('asigna cada quincena a su partida', function (int $year, int $month, int $half, string $expected): void {
        $installment = PayPeriod::fortnight($year, $month, $half)->thirteenthMonthInstallment();

        expect($installment->year.'-'.$installment->number)->toBe($expected);
    })->with([
        'enero' => [2026, 1, 1, '2026-1'],
        '1–15 de abril cierra la partida 1' => [2026, 4, 1, '2026-1'],
        '16–30 de abril abre la partida 2' => [2026, 4, 2, '2026-2'],
        '1–15 de agosto cierra la partida 2' => [2026, 8, 1, '2026-2'],
        '16–31 de agosto abre la partida 3' => [2026, 8, 2, '2026-3'],
        '1–15 de diciembre cierra la partida 3' => [2026, 12, 1, '2026-3'],
        '16–31 de diciembre es la partida 1 del año siguiente' => [2026, 12, 2, '2027-1'],
    ]);

    it('lista las partidas que cruza un mes', function (): void {
        expect(installmentKeys(PayPeriod::month(2026, 4)->thirteenthMonthInstallments()))->toBe(['2026-1', '2026-2'])
            ->and(installmentKeys(PayPeriod::month(2026, 12)->thirteenthMonthInstallments()))->toBe(['2026-3', '2027-1'])
            ->and(installmentKeys(PayPeriod::month(2026, 5)->thirteenthMonthInstallments()))->toBe(['2026-2']);
    });

    it('lista las partidas que cruza una bisemana', function (): void {
        expect(installmentKeys(PayPeriod::biweekly(new DateTimeImmutable('2026-08-10'))->thirteenthMonthInstallments()))
            ->toBe(['2026-2', '2026-3']);
    });

    it('rechaza pedir una sola partida si el período cruza dos', function (): void {
        expect(fn () => PayPeriod::month(2026, 4)->thirteenthMonthInstallment())
            ->toThrow(PeriodException::class, 'El período 2026-04-01–2026-04-30 cruza varias partidas del XIII mes; usa thirteenthMonthInstallments().');
    });

    it('devuelve la partida de un mes que no cruza', function (): void {
        $installment = PayPeriod::month(2026, 5)->thirteenthMonthInstallment();

        expect($installment->year)->toBe(2026)
            ->and($installment->number)->toBe(2);
    });
});
