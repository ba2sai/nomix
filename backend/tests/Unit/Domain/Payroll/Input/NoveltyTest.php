<?php

declare(strict_types=1);

use App\Domain\Payroll\Input\Novelty;
use App\Domain\Payroll\Input\NoveltyType;
use App\Domain\Payroll\PayrollException;
use App\Domain\Shared\Money\Money;

mutates(Novelty::class, NoveltyType::class);

it('separa las novedades de tiempo de las de dinero', function (NoveltyType $type, bool $time): void {
    expect($type->measuresTime())->toBe($time);
})->with([
    [NoveltyType::HoraExtra, true],
    [NoveltyType::Ausencia, true],
    [NoveltyType::Tardanza, true],
    [NoveltyType::Incapacidad, true],
    [NoveltyType::Bono, false],
    [NoveltyType::Comision, false],
    [NoveltyType::OtroIngreso, false],
    [NoveltyType::OtroDescuento, false],
]);

describe('novedades de tiempo', function (): void {
    it('guardan la cantidad, el subtipo y solo el día de la fecha', function (): void {
        $novelty = Novelty::time(
            NoveltyType::HoraExtra,
            new DateTimeImmutable('2026-10-05 21:30:00', new DateTimeZone('America/Panama')),
            '2.5',
            'diurna',
        );

        expect($novelty->type)->toBe(NoveltyType::HoraExtra)
            ->and($novelty->quantity)->toBe('2.5')
            ->and($novelty->amount)->toBeNull()
            ->and($novelty->subtype)->toBe('diurna')
            ->and($novelty->date->format('Y-m-d H:i:s e'))->toBe('2026-10-05 00:00:00 UTC');
    });

    it('admiten omitir el subtipo', function (): void {
        expect(Novelty::time(NoveltyType::Ausencia, new DateTimeImmutable('2026-10-05'), '1')->subtype)->toBeNull();
    });

    it('rechazan un tipo de dinero', function (): void {
        expect(fn () => Novelty::time(NoveltyType::Bono, new DateTimeImmutable('2026-10-05'), '1'))
            ->toThrow(PayrollException::class, "Una novedad de tipo 'bono' necesita un monto y no una cantidad.");
    });

    it('exigen una cantidad positiva', function (): void {
        expect(fn () => Novelty::time(NoveltyType::Tardanza, new DateTimeImmutable('2026-10-05'), '0'))
            ->toThrow(PayrollException::class, "El campo 'cantidad' vale 0");
    });
});

describe('novedades de dinero', function (): void {
    it('guardan el monto', function (): void {
        $novelty = Novelty::money(NoveltyType::Comision, new DateTimeImmutable('2026-10-10'), Money::of('250.75'), 'ventas');

        expect($novelty->type)->toBe(NoveltyType::Comision)
            ->and($novelty->amount?->toString())->toBe('250.75')
            ->and($novelty->quantity)->toBeNull()
            ->and($novelty->subtype)->toBe('ventas')
            ->and($novelty->date->format('Y-m-d'))->toBe('2026-10-10');
    });

    it('rechazan un tipo de tiempo', function (): void {
        expect(fn () => Novelty::money(NoveltyType::HoraExtra, new DateTimeImmutable('2026-10-05'), Money::of('10')))
            ->toThrow(PayrollException::class, "Una novedad de tipo 'hora_extra' necesita una cantidad (horas o días) y no un monto.");
    });

    it('exigen un monto positivo', function (string $amount): void {
        expect(fn () => Novelty::money(NoveltyType::Bono, new DateTimeImmutable('2026-10-05'), Money::of($amount)))
            ->toThrow(PayrollException::class, "El campo 'monto' vale {$amount}, fuera del rango (0, ∞).");
    })->with(['0', '-5.00']);

    it('exigen 2 decimales como máximo', function (): void {
        expect(fn () => Novelty::money(NoveltyType::Bono, new DateTimeImmutable('2026-10-05'), Money::of('10.005')))
            ->toThrow(PayrollException::class, "El campo 'monto' tiene el monto 10.005, que no cabe en 2 decimales.");
    });
});

it('rechaza un subtipo en blanco', function (string $subtype): void {
    expect(fn () => Novelty::time(NoveltyType::HoraExtra, new DateTimeImmutable('2026-10-05'), '1', $subtype))
        ->toThrow(PayrollException::class, 'El subtipo de una novedad no puede estar vacío; omítelo si no aplica.')
        ->and(fn () => Novelty::money(NoveltyType::Bono, new DateTimeImmutable('2026-10-05'), Money::of('1'), $subtype))
        ->toThrow(PayrollException::class, 'El subtipo de una novedad no puede estar vacío');
})->with(['', '  ']);
