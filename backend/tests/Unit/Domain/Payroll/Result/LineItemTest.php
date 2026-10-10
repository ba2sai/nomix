<?php

declare(strict_types=1);

use App\Domain\Payroll\PayrollException;
use App\Domain\Payroll\Result\Category;
use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Rules\RuleTrace;
use App\Domain\Shared\Rules\TraceInput;
use Tests\Support\Parameters;

mutates(LineItem::class, PayrollException::class);

it('toma el monto de la traza y la categoría del concepto', function (): void {
    $trace = RuleTrace::calculated('RULE-001', 'bruto × tasa', [], Money::of('120.3696'), Parameters::rounding());
    $line = new LineItem(Concept::CssObrero, $trace);

    expect($line->concept)->toBe(Concept::CssObrero)
        ->and($line->category)->toBe(Category::DeduccionLey)
        ->and($line->trace)->toBe($trace)
        ->and($line->amount->toString())->toBe('120.37');
});

it('acepta un monto cero', function (): void {
    expect((new LineItem(Concept::SeObrero, RuleTrace::entered('Sin aporte', [], Money::zero())))->amount->isZero())->toBeTrue();
});

it('rechaza montos negativos: el signo lo da la categoría', function (): void {
    expect(fn () => new LineItem(Concept::Descuento, RuleTrace::entered('Ajuste', [], Money::of('-0.01'))))
        ->toThrow(PayrollException::class, "La línea 'descuento' tiene un monto negativo (-0.01); el signo lo da su categoría.");
});

it('rechaza montos que no caben en 2 decimales', function (): void {
    $trace = RuleTrace::calculated('RULE-001', 'f', [], Money::of('1234.567'), Parameters::rounding(scale: 3));

    expect(fn () => new LineItem(Concept::CssObrero, $trace))
        ->toThrow(PayrollException::class, "La línea 'css_obrero' tiene el monto 1234.567, que no cabe en 2 decimales: revisa la escala de RULE-080.");
});

it('acepta una escala de RULE-080 menor que 2', function (): void {
    $trace = RuleTrace::calculated('RULE-001', 'f', [], Money::of('120.3696'), Parameters::rounding(scale: 0));

    expect((new LineItem(Concept::CssObrero, $trace))->amount->toString())->toBe('120.00');
});

it('se serializa para planilla_lineas', function (): void {
    $trace = RuleTrace::entered('Bono de desempeño', [TraceInput::quantity('novedades', '1')], Money::of('150.5'));

    expect((new LineItem(Concept::Bono, $trace))->toArray())->toBe([
        'concepto' => 'bono',
        'categoria' => 'ingreso',
        'monto' => '150.50',
        'rule_id' => null,
        'traza' => $trace->toArray(),
    ]);
});
