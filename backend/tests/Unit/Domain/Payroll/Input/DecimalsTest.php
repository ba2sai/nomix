<?php

declare(strict_types=1);

use App\Domain\Payroll\Input\Decimals;
use App\Domain\Payroll\PayrollException;

mutates(Decimals::class);

describe('cantidades positivas', function (): void {
    it('acepta valores mayores que cero', function (string $value): void {
        expect(Decimals::positive('cantidad', $value))->toBe($value);
    })->with(['0.01', '8', '1000.5']);

    it('rechaza cero y negativos', function (string $value): void {
        expect(fn () => Decimals::positive('cantidad', $value))
            ->toThrow(PayrollException::class, "El campo 'cantidad' vale {$value}, fuera del rango (0, ∞).");
    })->with(['0', '0.00', '-1']);

    it('respeta el máximo, incluido', function (): void {
        expect(Decimals::positive('horas_semanales', '168', '168'))->toBe('168')
            ->and(fn () => Decimals::positive('horas_semanales', '168.01', '168'))
            ->toThrow(PayrollException::class, "El campo 'horas_semanales' vale 168.01, fuera del rango (0, 168].")
            ->and(fn () => Decimals::positive('horas_semanales', '0', '168'))
            ->toThrow(PayrollException::class, 'fuera del rango (0, 168].');
    });

    it('rechaza lo que no es un decimal simple', function (string $value): void {
        expect(fn () => Decimals::positive('cantidad', $value))
            ->toThrow(PayrollException::class, "El campo 'cantidad' tiene el valor '{$value}', que no es un decimal válido.");
    })->with(['8,5', 'ocho', '', '.5', '1e2']);
});

describe('tasas', function (): void {
    it('acepta de 0 a menos de 1', function (string $value): void {
        expect(Decimals::rate('tasa', $value))->toBe($value);
    })->with(['0', '0.021000', '0.999999']);

    it('rechaza negativos y valores desde 1', function (string $value): void {
        expect(fn () => Decimals::rate('tasa', $value))
            ->toThrow(PayrollException::class, "El campo 'tasa' vale {$value}, fuera del rango [0, 1).");
    })->with(['-0.01', '1', '1.5', '2.1']);

    it('rechaza lo que no es un decimal simple', function (): void {
        expect(fn () => Decimals::rate('tasa', '2,10%'))->toThrow(PayrollException::class, 'no es un decimal válido');
    });
});
