<?php

declare(strict_types=1);

use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Money\MoneyException;
use App\Domain\Shared\Money\RoundingMode;
use App\Domain\Shared\Money\RoundingPolicy;

mutates(Money::class, MoneyException::class);

/** Propuesta de RULE-080 del catálogo; en producción vendrá de parametros_legales (NMX-006). */
function rule080(RoundingMode $mode = RoundingMode::HalfUp, int $scale = 2, int $intermediateScale = 6): RoundingPolicy
{
    return new RoundingPolicy($scale, $mode, $intermediateScale);
}

describe('criterios de aceptación de NMX-005', function (): void {
    it('suma 0.1 + 0.2 = 0.30 exacto', function (): void {
        $sum = Money::of('0.1')->plus(Money::of('0.2'));

        expect($sum->toString())->toBe('0.30')
            ->and($sum->isEqualTo(Money::of('0.3')))->toBeTrue();
    });

    it('calcula 1,234.56 × 9.75% = 120.37 (RULE-001, redondeo RULE-080)', function (): void {
        expect(Money::of('1234.56')->multipliedBy('0.0975')->round(rule080())->toString())->toBe('120.37');
    });
});

describe('aritmética', function (): void {
    it('calcula el caso de RULE-001: 500.00 × 9.75% = 48.75', function (): void {
        expect(Money::of('500.00')->multipliedBy('0.0975')->round(rule080())->toString())->toBe('48.75');
    });

    it('resta, incluso con resultado negativo', function (): void {
        expect(Money::of('10.00')->minus(Money::of('0.01'))->toString())->toBe('9.99')
            ->and(Money::of('5')->minus(Money::of('10.50'))->toString())->toBe('-5.50');
    });

    it('multiplica sin redondear', function (): void {
        $product = Money::of('1234.56')->multipliedBy('0.0975');

        expect($product->isEqualTo(Money::of('120.3696')))->toBeTrue()
            ->and(fn () => $product->toString())->toThrow(MoneyException::class);
    });

    it('multiplica por enteros', function (): void {
        expect(Money::of('12.25')->multipliedBy(4)->toString())->toBe('49.00');
    });

    it('es inmutable', function (): void {
        $original = Money::of('100.00');
        $original->plus(Money::of('1'));
        $original->minus(Money::of('1'));
        $original->multipliedBy('2');
        $original->round(rule080());

        expect($original->toString())->toBe('100.00');
    });

    it('acepta enteros y crea el cero', function (): void {
        expect(Money::of(100)->toString())->toBe('100.00')
            ->and(Money::of(-3)->toString())->toBe('-3.00')
            ->and(Money::zero()->toString())->toBe('0.00');
    });
});

describe('división', function (): void {
    it('divide exacto el caso de RULE-030: 6,000.00 ÷ 12 = 500.00', function (): void {
        expect(Money::of('6000.00')->dividedBy(12, rule080())->toString())->toBe('500.00');
    });

    it('usa la escala intermedia y el modo de la política', function (): void {
        expect(Money::of('2')->dividedBy('3', rule080(RoundingMode::HalfUp))->isEqualTo(Money::of('0.666667')))->toBeTrue()
            ->and(Money::of('2')->dividedBy('3', rule080(RoundingMode::Down))->isEqualTo(Money::of('0.666666')))->toBeTrue()
            ->and(Money::of('100')->dividedBy('3', rule080(intermediateScale: 8))->isEqualTo(Money::of('33.33333333')))->toBeTrue();
    });

    it('rechaza dividir entre cero', function (string|int $divisor): void {
        expect(fn () => Money::of('10')->dividedBy($divisor, rule080()))
            ->toThrow(MoneyException::class, 'No se puede dividir un monto entre cero.');
    })->with(['0', '0.00', 0]);
});

describe('redondeo según RULE-080', function (): void {
    it('redondea según el modo', function (RoundingMode $mode, string $amount, string $expected): void {
        expect(Money::of($amount)->round(rule080($mode))->toString())->toBe($expected);
    })->with([
        'HALF_UP sube en el punto medio' => [RoundingMode::HalfUp, '2.345', '2.35'],
        'HALF_UP baja bajo el punto medio' => [RoundingMode::HalfUp, '2.344', '2.34'],
        'HALF_UP negativo' => [RoundingMode::HalfUp, '-2.345', '-2.35'],
        'HALF_EVEN al par (abajo)' => [RoundingMode::HalfEven, '2.345', '2.34'],
        'HALF_EVEN al par (arriba)' => [RoundingMode::HalfEven, '2.355', '2.36'],
        'HALF_DOWN baja en el punto medio' => [RoundingMode::HalfDown, '2.345', '2.34'],
        'UP se aleja de cero' => [RoundingMode::Up, '2.341', '2.35'],
        'DOWN trunca' => [RoundingMode::Down, '2.349', '2.34'],
    ]);

    it('respeta la escala final de la política', function (): void {
        expect(Money::of('2.5')->round(rule080(scale: 0))->toString())->toBe('3.00')
            ->and(Money::of('2.345')->round(rule080(scale: 3))->isEqualTo(Money::of('2.345')))->toBeTrue();
    });
});

describe('comparación', function (): void {
    it('compara montos con distinta escala', function (): void {
        expect(Money::of('1.5')->isEqualTo(Money::of('1.50')))->toBeTrue()
            ->and(Money::of('1.5')->compareTo(Money::of('1.50')))->toBe(0)
            ->and(Money::of('1')->compareTo(Money::of('2')))->toBe(-1)
            ->and(Money::of('2')->compareTo(Money::of('1')))->toBe(1)
            ->and(Money::of('1.00')->isEqualTo(Money::of('1.01')))->toBeFalse();
    });

    it('ordena montos', function (string $left, string $right, bool $gt, bool $gte, bool $lt, bool $lte): void {
        $a = Money::of($left);
        $b = Money::of($right);

        expect($a->isGreaterThan($b))->toBe($gt)
            ->and($a->isGreaterThanOrEqualTo($b))->toBe($gte)
            ->and($a->isLessThan($b))->toBe($lt)
            ->and($a->isLessThanOrEqualTo($b))->toBe($lte);
    })->with([
        'mayor' => ['2.00', '1.99', true, true, false, false],
        'igual' => ['1.00', '1', false, true, false, true],
        'menor' => ['1.99', '2.00', false, false, true, true],
    ]);

    it('identifica el signo', function (string $amount, bool $zero, bool $negative, bool $positive): void {
        $money = Money::of($amount);

        expect($money->isZero())->toBe($zero)
            ->and($money->isNegative())->toBe($negative)
            ->and($money->isPositive())->toBe($positive);
    })->with([
        'cero' => ['0.00', true, false, false],
        'negativo' => ['-0.01', false, true, false],
        'positivo' => ['0.01', false, false, true],
    ]);
});

describe('validación y serialización', function (): void {
    it('rechaza montos y factores que no son decimales simples', function (string $value): void {
        expect(fn () => Money::of($value))
            ->toThrow(MoneyException::class, "Monto o factor inválido: '{$value}'. Usa un decimal como '1234.56'.")
            ->and(fn () => Money::of('1')->multipliedBy($value))->toThrow(MoneyException::class)
            ->and(fn () => Money::of('1')->dividedBy($value, rule080()))->toThrow(MoneyException::class);
    })->with(['1e3', '1,234.56', '', 'abc', '.5', '1.', ' 1', '1 ', 'x1', '1x', '+1', '--1']);

    it('serializa con 2 decimales como string', function (): void {
        $money = Money::of('1234.5');

        expect($money->toString())->toBe('1234.50')
            ->and((string) $money)->toBe('1234.50')
            ->and($money->jsonSerialize())->toBe('1234.50')
            ->and(json_encode(['monto' => $money]))->toBe('{"monto":"1234.50"}')
            ->and(Money::of('7.100000')->toString())->toBe('7.10');
    });

    it('exige redondear antes de serializar', function (): void {
        expect(fn () => Money::of('120.3696')->toString())
            ->toThrow(MoneyException::class, 'El monto 120.3696 tiene más de 2 decimales: redondéalo con una RoundingPolicy antes de serializarlo.')
            ->and(fn () => json_encode(Money::of('0.001'), JSON_THROW_ON_ERROR))->toThrow(MoneyException::class);
    });
});
