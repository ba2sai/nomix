<?php

declare(strict_types=1);

/*
 * Casos independientes de la revisión de Codex del PR #9 (NMX-010), derivados del catálogo
 * (RULE-080, propuesta PENDIENTE) y de los contratos documentados antes de inspeccionar la
 * implementación. Se conservan como regresión de los hallazgos R1 a R3.
 *
 * Los montos son fixtures de redondeo y sumas: no son una regla fiscal nueva ni validan tasas.
 */

use App\Domain\Payroll\Input\EmployeeSnapshot;
use App\Domain\Payroll\Input\WorkShift;
use App\Domain\Payroll\PayrollException;
use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Payroll\Result\PayrollResult;
use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Period\PayFrequency;
use App\Domain\Shared\Rules\RoundingRule;
use App\Domain\Shared\Rules\RuleTrace;
use App\Domain\Shared\Rules\RuleTraceException;
use App\Domain\Shared\Rules\TraceInput;
use Tests\Support\LegalCatalog;

function reviewerRounding(VerificationStatus $status = VerificationStatus::Pendiente): RoundingRule
{
    $parameter = LegalParameter::of('REDONDEO_POLITICA', 'RULE-080', null,
        ['escala' => 2, 'modo' => 'HALF_UP', 'escala_intermedia' => 6], null, null, $status,
        'Propuesta RULE-080 del catálogo; fixture independiente del revisor');

    return RoundingRule::from(LegalParameters::on(new DateTimeImmutable('2026-10-15'), [$parameter]));
}

it('respeta los bordes HALF_UP derivados del catálogo', function (string $raw, string $expected): void {
    $trace = RuleTrace::calculated('RULE-080', 'Redondear el concepto', [], Money::of($raw), reviewerRounding());
    expect($trace->result->toString())->toBe($expected);
})->with([
    ['1.005000', '1.01'], ['1.004999', '1.00'], ['0.005000', '0.01'], ['0.004999', '0.00'], ['999999999999.995000', '1000000000000.00'],
]);

it('suma conceptos después del redondeo sin redondear el total', function (): void {
    $rounding = reviewerRounding();
    $lines = [];
    foreach ([[Concept::Bono, '100.005000'], [Concept::CssObrero, '9.754875'], [Concept::Descuento, '5.005000'], [Concept::CssPatronal, '13.250000']] as [$concept, $raw]) {
        $lines[] = new LineItem($concept, RuleTrace::calculated('RULE-080', 'Concepto de prueba', [], Money::of($raw), $rounding));
    }
    $result = new PayrollResult($lines);
    expect($result->gross->toString())->toBe('100.01')
        ->and($result->totalDeductions->toString())->toBe('14.76')
        ->and($result->net->toString())->toBe('85.25')
        ->and($result->employerCost->toString())->toBe('13.25');
    $halfCent = new LineItem(Concept::Bono, RuleTrace::calculated('RULE-080', 'Concepto de prueba', [], Money::of('0.005000'), $rounding));
    expect((new PayrollResult([$halfCent, $halfCent]))->gross->toString())->toBe('0.02');
});

it('conserva RULE-080 PENDIENTE del catálogo sin habilitar producción', function (): void {
    $rounding = RoundingRule::from(LegalCatalog::forDate('2026-10-15'));
    $trace = RuleTrace::calculated('RULE-080', 'Concepto de prueba', [], Money::of('1.005000'), $rounding);
    $result = new PayrollResult([new LineItem(Concept::Bono, $trace)]);
    expect($rounding->policy->intermediateScale)->toBe(6)
        ->and($trace->pendingParameterCodes())->toBe(['REDONDEO_POLITICA'])
        ->and($result->allowsProduction())->toBeFalse();
});

it('oculta salario base al serializar explícitamente la traza', function (): void {
    $input = TraceInput::money('salario_base', Money::of('4321.67'), sensitive: true);
    $trace = RuleTrace::calculated('RULE-001', 'bruto × tasa', [$input], Money::of('1.005000'), reviewerRounding());
    expect(json_encode($trace->toArray(), JSON_THROW_ON_ERROR))->not->toContain('4321.67');
});

it('R1: no expone salario base en el mensaje de una excepción de validación', function (): void {
    try {
        new EmployeeSnapshot(Money::of('4321.675'), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-01'));
    } catch (PayrollException $exception) {
        expect($exception->getMessage())->not->toContain('4321.675');

        return;
    }
    throw new RuntimeException('El salario con más de dos decimales debía rechazarse');
});

it('R2: no expone una entrada sensible en la serialización JSON estándar', function (): void {
    $input = TraceInput::money('salario_base', Money::of('4321.67'), sensitive: true);
    expect(json_encode($input, JSON_THROW_ON_ERROR))->not->toContain('4321.67');
});

it('R3: ningún parámetro pendiente desaparece por deduplicar códigos', function (bool $pendingFirst): void {
    $pending = LegalParameter::of('CSS_OBRERO_SALARIO', 'RULE-001', '0.097500', null, null, null, VerificationStatus::Pendiente, 'Fixture pendiente');
    $validated = LegalParameter::of('CSS_OBRERO_SALARIO', 'RULE-001', '0.097500', null, null, null, VerificationStatus::Validado, 'Fixture validado');
    $inputs = $pendingFirst
        ? [TraceInput::parameter($pending), TraceInput::parameter($validated)]
        : [TraceInput::parameter($validated), TraceInput::parameter($pending)];

    // Corrección elegida: la traza rechaza las versiones en conflicto, así que ninguna
    // puede quedar fuera de allowsProduction() ni de pendingParameterCodes().
    expect(fn () => RuleTrace::calculated('RULE-001', 'bruto × tasa', $inputs, Money::of('1'), reviewerRounding(VerificationStatus::Validado)))
        ->toThrow(RuleTraceException::class, "'CSS_OBRERO_SALARIO'");
})->with(['pendiente primero' => [true], 'validado primero' => [false]]);
