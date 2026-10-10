<?php

declare(strict_types=1);

use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Payroll\Result\PayrollResult;
use App\Domain\Payroll\Result\PayrollWarning;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Rules\RuleTrace;
use App\Domain\Shared\Rules\TraceInput;
use Tests\Support\Parameters;

mutates(PayrollResult::class);

function enteredLine(Concept $concept, string $amount): LineItem
{
    return new LineItem($concept, RuleTrace::entered('Monto de prueba', [], Money::of($amount)));
}

/** Una línea de cada categoría. Montos ilustrativos para probar sumas: no salen de las reglas legales. */
function sampleResult(): PayrollResult
{
    return new PayrollResult([
        enteredLine(Concept::Salario, '1000.00'),
        enteredLine(Concept::HoraExtra, '12.50'),
        enteredLine(Concept::Bono, '100.00'),
        enteredLine(Concept::CssObrero, '108.43'),
        enteredLine(Concept::SeObrero, '13.91'),
        enteredLine(Concept::Isr, '25.00'),
        enteredLine(Concept::Descuento, '40.00'),
        enteredLine(Concept::OtroDescuento, '10.00'),
        enteredLine(Concept::CssPatronal, '147.36'),
        enteredLine(Concept::SePatronal, '16.69'),
        enteredLine(Concept::RiesgoProfesional, '23.36'),
    ]);
}

it('suma los totales de planilla_colaboradores', function (): void {
    $result = sampleResult();

    // Bruto 1,112.50; deducciones 147.34 de ley + 50.00 de descuentos; neto 915.16; patronal 187.41.
    expect($result->gross->toString())->toBe('1112.50')
        ->and($result->lawDeductions->toString())->toBe('147.34')
        ->and($result->thirdPartyDeductions->toString())->toBe('50.00')
        ->and($result->totalDeductions->toString())->toBe('197.34')
        ->and($result->net->toString())->toBe('915.16')
        ->and($result->employerCost->toString())->toBe('187.41');
});

it('da totales en cero sin líneas', function (): void {
    $result = new PayrollResult([]);

    expect($result->gross->isZero())->toBeTrue()
        ->and($result->net->isZero())->toBeTrue()
        ->and($result->employerCost->isZero())->toBeTrue()
        ->and($result->lines())->toBe([])
        ->and($result->warnings())->toBe([]);
});

it('no corrige un neto negativo: lo resuelve RULE-070', function (): void {
    $result = new PayrollResult([enteredLine(Concept::Salario, '10.00'), enteredLine(Concept::Descuento, '25.00')]);

    expect($result->net->toString())->toBe('-15.00');
});

it('filtra las líneas de un concepto', function (): void {
    $overtimeDay = enteredLine(Concept::HoraExtra, '12.50');
    $overtimeNight = enteredLine(Concept::HoraExtra, '15.00');
    $result = new PayrollResult([enteredLine(Concept::Salario, '500.00'), $overtimeDay, $overtimeNight]);

    expect($result->linesOf(Concept::HoraExtra))->toBe([$overtimeDay, $overtimeNight])
        ->and($result->linesOf(Concept::Isr))->toBe([])
        ->and($result->lines())->toHaveCount(3);
});

it('conserva los avisos', function (): void {
    $warning = new PayrollWarning('horas_extra_sobre_limite', 'Supera el límite semanal.', 'RULE-020');

    expect((new PayrollResult([], [$warning]))->warnings())->toBe([$warning]);
});

it('reúne los parámetros PENDIENTE de todas las líneas, sin repetir y ordenados', function (): void {
    $rounding = Parameters::rounding(status: VerificationStatus::Pendiente);
    $isr = RuleTrace::calculated('RULE-011', 'f', [
        TraceInput::parameter(Parameters::make('ISR_DEDUCCION_DEPENDIENTE', status: VerificationStatus::Pendiente)),
    ], Money::of('25'), $rounding);
    $css = RuleTrace::calculated('RULE-001', 'f', [
        TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO')),
    ], Money::of('48.75'), $rounding);

    // La línea de CSS va primero: sin ordenar saldría REDONDEO_POLITICA antes que ISR_….
    $result = new PayrollResult([new LineItem(Concept::CssObrero, $css), new LineItem(Concept::Isr, $isr), enteredLine(Concept::Bono, '1')]);

    expect($result->pendingParameterCodes())->toBe(['ISR_DEDUCCION_DEPENDIENTE', 'REDONDEO_POLITICA'])
        ->and($result->allowsProduction())->toBeFalse();
});

it('solo permite producción si todas las líneas lo permiten', function (): void {
    $validated = RuleTrace::calculated('RULE-001', 'f', [
        TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO', status: VerificationStatus::Validado)),
    ], Money::of('48.75'), Parameters::rounding(status: VerificationStatus::Validado));
    $partial = RuleTrace::calculated('RULE-030', 'f', [
        TraceInput::parameter(Parameters::make('XIII_DIVISOR', '12', VerificationStatus::Parcial)),
    ], Money::of('1'), Parameters::rounding(status: VerificationStatus::Validado));

    expect((new PayrollResult([new LineItem(Concept::CssObrero, $validated), enteredLine(Concept::Bono, '1')]))->allowsProduction())->toBeTrue()
        ->and((new PayrollResult([new LineItem(Concept::CssObrero, $validated), new LineItem(Concept::Bono, $partial)]))->allowsProduction())->toBeFalse()
        ->and((new PayrollResult([]))->allowsProduction())->toBeTrue();
});

it('se serializa con totales, líneas y avisos', function (): void {
    $salary = enteredLine(Concept::Salario, '500.00');
    $css = enteredLine(Concept::CssObrero, '48.75');
    $warning = new PayrollWarning('codigo', 'mensaje');

    expect((new PayrollResult([$salary, $css], [$warning]))->toArray())->toBe([
        'bruto' => '500.00',
        'total_deducciones' => '48.75',
        'neto' => '451.25',
        'total_patronal' => '0.00',
        'lineas' => [$salary->toArray(), $css->toArray()],
        'avisos' => [['codigo' => 'codigo', 'mensaje' => 'mensaje', 'regla' => null]],
    ]);
});
