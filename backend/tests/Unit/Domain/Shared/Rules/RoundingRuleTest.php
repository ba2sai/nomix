<?php

declare(strict_types=1);

use App\Domain\Shared\Legal\LegalParameterException;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Money\MoneyException;
use App\Domain\Shared\Money\RoundingMode;
use App\Domain\Shared\Rules\RoundingRule;
use App\Domain\Shared\Rules\RuleTraceException;
use Tests\Support\LegalCatalog;
use Tests\Support\Parameters;

mutates(RoundingRule::class);

it('cita RULE-080', function (): void {
    expect(RoundingRule::RULE_ID)->toBe('RULE-080');
});

it('construye la política del catálogo desde REDONDEO_POLITICA', function (): void {
    $rule = RoundingRule::from(LegalCatalog::forDate('2026-10-15'));

    expect($rule->policy->scale)->toBe(2)
        ->and($rule->policy->mode)->toBe(RoundingMode::HalfUp)
        ->and($rule->policy->intermediateScale)->toBe(6)
        ->and($rule->parameter->code)->toBe('REDONDEO_POLITICA')
        ->and($rule->parameter->ruleId)->toBe('RULE-080');
});

it('redondea según la política: 1,234.56 × 9.75% = 120.37', function (): void {
    $rule = RoundingRule::from(LegalCatalog::forDate('2026-10-15'));

    expect($rule->round(Money::of('1234.56')->multipliedBy('0.0975'))->toString())->toBe('120.37');
});

it('usa el modo y la escala de la tabla', function (): void {
    $rule = Parameters::rounding(scale: 1, mode: 'DOWN', intermediateScale: 4);

    expect($rule->policy->mode)->toBe(RoundingMode::Down)
        ->and($rule->policy->intermediateScale)->toBe(4)
        ->and($rule->round(Money::of('2.39'))->isEqualTo(Money::of('2.3')))->toBeTrue();
});

it('falla con un mensaje claro si falta el parámetro', function (): void {
    expect(fn () => RoundingRule::from(LegalParameters::on(new DateTimeImmutable('2026-10-15'), [])))
        ->toThrow(LegalParameterException::class, "No hay un valor vigente del parámetro legal 'REDONDEO_POLITICA' para el 2026-10-15.");
});

it('exige escalas enteras', function (array $table): void {
    expect(fn () => RoundingRule::from(Parameters::roundingTable($table)))
        ->toThrow(RuleTraceException::class, 'La política de redondeo de parametros_legales (REDONDEO_POLITICA, RULE-080) no es válida: "escala" y "escala_intermedia" deben ser enteros.');
})->with([
    'escala como texto' => [['escala' => '2', 'modo' => 'HALF_UP', 'escala_intermedia' => 6]],
    'sin escala' => [['modo' => 'HALF_UP', 'escala_intermedia' => 6]],
    'escala intermedia como texto' => [['escala' => 2, 'modo' => 'HALF_UP', 'escala_intermedia' => '6']],
    'sin escala intermedia' => [['escala' => 2, 'modo' => 'HALF_UP']],
]);

it('exige un modo conocido', function (array $table): void {
    expect(fn () => RoundingRule::from(Parameters::roundingTable($table)))
        ->toThrow(RuleTraceException::class, '"modo" debe ser uno de HALF_UP, HALF_EVEN, HALF_DOWN, UP, DOWN.');
})->with([
    'desconocido' => [['escala' => 2, 'modo' => 'HALF', 'escala_intermedia' => 6]],
    'numérico' => [['escala' => 2, 'modo' => 1, 'escala_intermedia' => 6]],
    'ausente' => [['escala' => 2, 'escala_intermedia' => 6]],
]);

it('aplica las validaciones de RoundingPolicy', function (): void {
    expect(fn () => Parameters::rounding(scale: 2, intermediateScale: 1))
        ->toThrow(MoneyException::class, 'la escala intermedia no puede ser menor que la final');
});
