<?php

declare(strict_types=1);

use App\Domain\Shared\Period\CalendarDate;
use App\Domain\Shared\Period\PeriodException;
use App\Domain\Shared\Period\ThirteenthMonthInstallment;

mutates(ThirteenthMonthInstallment::class);

function installmentFor(string $date): ThirteenthMonthInstallment
{
    return ThirteenthMonthInstallment::forDate(new DateTimeImmutable($date));
}

it('cita RULE-030', function (): void {
    expect(ThirteenthMonthInstallment::RULE_ID)->toBe('RULE-030');
});

it('asigna cada fecha límite a su partida', function (string $date, int $year, int $number): void {
    $installment = installmentFor($date);

    expect($installment->year)->toBe($year)
        ->and($installment->number)->toBe($number);
})->with([
    ['2026-01-01', 2026, 1],
    ['2026-04-15', 2026, 1],
    ['2026-04-16', 2026, 2],
    ['2026-08-15', 2026, 2],
    ['2026-08-16', 2026, 3],
    ['2026-12-15', 2026, 3],
    ['2026-12-16', 2027, 1],
    ['2026-12-31', 2027, 1],
]);

it('define el período y la fecha de pago de cada partida', function (string $date, string $start, string $end): void {
    $installment = installmentFor($date);

    expect($installment->start->format('Y-m-d'))->toBe($start)
        ->and($installment->end->format('Y-m-d'))->toBe($end)
        ->and($installment->paymentDate()->format('Y-m-d'))->toBe($end);
})->with([
    'partida 1 empieza el año anterior' => ['2027-02-01', '2026-12-16', '2027-04-15'],
    'partida 2' => ['2027-06-01', '2027-04-16', '2027-08-15'],
    'partida 3' => ['2027-10-01', '2027-08-16', '2027-12-15'],
]);

it('encadena las partidas en orden', function (string $date, int $year, int $number): void {
    $next = installmentFor($date)->next();

    expect($next->year)->toBe($year)
        ->and($next->number)->toBe($number);
})->with([
    'de 1 a 2' => ['2026-02-01', 2026, 2],
    'de 2 a 3' => ['2026-06-01', 2026, 3],
    'de 3 a la 1 del año siguiente' => ['2026-10-01', 2027, 1],
]);

it('contiene sus extremos y no los días vecinos', function (string $date, bool $expected): void {
    expect(installmentFor('2026-06-01')->contains(new DateTimeImmutable($date)))->toBe($expected);
})->with([
    ['2026-04-15', false],
    ['2026-04-16', true],
    ['2026-08-15 20:00:00', true],
    ['2026-08-16', false],
]);

it('compara partidas por año y número', function (): void {
    $installment = installmentFor('2026-06-01');

    expect($installment->equals(installmentFor('2026-07-01')))->toBeTrue()
        ->and($installment->equals(installmentFor('2027-06-01')))->toBeFalse()
        ->and($installment->equals(installmentFor('2026-10-01')))->toBeFalse();
});

it('rechaza fechas de calendario inexistentes', function (): void {
    expect(fn () => CalendarDate::of(2026, 2, 30))
        ->toThrow(PeriodException::class, 'Fecha inválida: 2026-02-30.');
});
