<?php

declare(strict_types=1);

use App\Domain\Shared\Money\MoneyException;
use App\Domain\Shared\Money\RoundingMode;
use App\Domain\Shared\Money\RoundingPolicy;
use Brick\Math\RoundingMode as BrickRoundingMode;

mutates(RoundingPolicy::class, RoundingMode::class);

it('cita RULE-080', function (): void {
    expect(RoundingPolicy::RULE_ID)->toBe('RULE-080');
});

it('conserva sus parámetros', function (): void {
    $policy = new RoundingPolicy(2, RoundingMode::HalfEven, 6);

    expect($policy->scale)->toBe(2)
        ->and($policy->mode)->toBe(RoundingMode::HalfEven)
        ->and($policy->intermediateScale)->toBe(6);
});

it('acepta escala final cero y escala intermedia igual a la final', function (): void {
    expect(new RoundingPolicy(0, RoundingMode::HalfUp, 0))->toBeInstanceOf(RoundingPolicy::class)
        ->and(new RoundingPolicy(2, RoundingMode::HalfUp, 2))->toBeInstanceOf(RoundingPolicy::class);
});

it('rechaza una escala final negativa', function (): void {
    expect(fn () => new RoundingPolicy(-1, RoundingMode::HalfUp, 6))
        ->toThrow(MoneyException::class, 'Política de redondeo inválida: la escala final no puede ser negativa.');
});

it('rechaza una escala intermedia menor que la final', function (): void {
    expect(fn () => new RoundingPolicy(2, RoundingMode::HalfUp, 1))
        ->toThrow(MoneyException::class, 'Política de redondeo inválida: la escala intermedia no puede ser menor que la final.');
});

it('traduce cada modo al de brick/math', function (RoundingMode $mode, BrickRoundingMode $brick): void {
    expect($mode->toBrick())->toBe($brick);
})->with([
    [RoundingMode::HalfUp, BrickRoundingMode::HalfUp],
    [RoundingMode::HalfEven, BrickRoundingMode::HalfEven],
    [RoundingMode::HalfDown, BrickRoundingMode::HalfDown],
    [RoundingMode::Up, BrickRoundingMode::Up],
    [RoundingMode::Down, BrickRoundingMode::Down],
]);

it('usa los nombres de modo que se guardarán en parametros_legales', function (): void {
    expect(RoundingMode::from('HALF_UP'))->toBe(RoundingMode::HalfUp)
        ->and(array_map(fn (RoundingMode $mode): string => $mode->value, RoundingMode::cases()))
        ->toBe(['HALF_UP', 'HALF_EVEN', 'HALF_DOWN', 'UP', 'DOWN']);
});
