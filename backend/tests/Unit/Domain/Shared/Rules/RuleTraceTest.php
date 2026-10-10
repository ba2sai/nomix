<?php

declare(strict_types=1);

use App\Domain\Shared\Legal\VerificationStatus;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Rules\RuleTrace;
use App\Domain\Shared\Rules\RuleTraceException;
use App\Domain\Shared\Rules\TraceInput;
use Tests\Support\Parameters;

mutates(RuleTrace::class);

describe('cálculos legales', function (): void {
    it('guarda regla, fórmula, entradas y redondea el resultado según RULE-080', function (): void {
        $rate = Parameters::make('CSS_OBRERO_SALARIO', '0.097500', ruleId: 'RULE-001');
        $inputs = [TraceInput::money('bruto', Money::of('1234.56')), TraceInput::parameter($rate)];
        $rounding = Parameters::rounding();

        $trace = RuleTrace::calculated('RULE-001', 'bruto × tasa', $inputs, Money::of('120.3696'), $rounding);

        expect($trace->ruleId)->toBe('RULE-001')
            ->and($trace->formula)->toBe('bruto × tasa')
            ->and($trace->inputs())->toBe($inputs)
            ->and($trace->unroundedResult->toDecimalString())->toBe('120.3696')
            ->and($trace->result->toString())->toBe('120.37')
            ->and($trace->rounding)->toBe($rounding);
    });

    it('exige el formato RULE-000', function (string $ruleId): void {
        expect(fn () => RuleTrace::calculated($ruleId, 'f', [], Money::of('1'), Parameters::rounding()))
            ->toThrow(RuleTraceException::class, "La traza cita la regla '{$ruleId}', que no tiene el formato RULE-000.");
    })->with(['RULE-1', 'RULE-0001', 'rule-001', '', ' RULE-001']);

    it('exige una fórmula legible', function (string $formula): void {
        expect(fn () => RuleTrace::calculated('RULE-001', $formula, [], Money::of('1'), Parameters::rounding()))
            ->toThrow(RuleTraceException::class, 'La traza necesita una fórmula legible, p. ej. "bruto × tasa".');
    })->with(['', '   ']);
});

describe('montos ingresados', function (): void {
    it('no cita regla ni redondea', function (): void {
        $inputs = [TraceInput::quantity('novedades', '1')];
        $trace = RuleTrace::entered('Bono registrado como novedad', $inputs, Money::of('150.50'));

        expect($trace->ruleId)->toBeNull()
            ->and($trace->formula)->toBe('Bono registrado como novedad')
            ->and($trace->inputs())->toBe($inputs)
            ->and($trace->unroundedResult->toString())->toBe('150.50')
            ->and($trace->result->toString())->toBe('150.50')
            ->and($trace->rounding)->toBeNull();
    });

    it('rechaza montos con más de 2 decimales', function (): void {
        expect(fn () => RuleTrace::entered('Bono', [], Money::of('150.505')))
            ->toThrow(RuleTraceException::class, 'El monto ingresado 150.505 tiene más de 2 decimales.');
    });

    it('exige una descripción', function (): void {
        expect(fn () => RuleTrace::entered(' ', [], Money::of('1')))->toThrow(RuleTraceException::class, 'fórmula legible');
    });
});

describe('estado de verificación', function (): void {
    it('lista los parámetros usados una vez cada uno, con el de redondeo al final', function (): void {
        $rate = Parameters::make('CSS_OBRERO_SALARIO');
        $rounding = Parameters::rounding();
        $trace = RuleTrace::calculated('RULE-001', 'f', [
            TraceInput::parameter($rate),
            TraceInput::money('bruto', Money::of('10')),
            TraceInput::parameter($rate),
        ], Money::of('1'), $rounding);

        expect($trace->parameters())->toBe([$rate, $rounding->parameter]);
    });

    it('marca los parámetros PENDIENTE, ordenados por código', function (): void {
        $trace = RuleTrace::calculated('RULE-011', 'f', [
            TraceInput::parameter(Parameters::make('ZZZ_PRUEBA', status: VerificationStatus::Pendiente)),
            TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO', status: VerificationStatus::ConfirmadoSecundario)),
            TraceInput::parameter(Parameters::make('AAA_PARCIAL', status: VerificationStatus::Parcial)),
        ], Money::of('1'), Parameters::rounding(status: VerificationStatus::Pendiente));

        expect($trace->pendingParameterCodes())->toBe(['REDONDEO_POLITICA', 'ZZZ_PRUEBA'])
            ->and($trace->allowsProduction())->toBeFalse();
    });

    it('solo permite producción si todos los parámetros están VALIDADO', function (): void {
        $validated = RuleTrace::calculated('RULE-001', 'f', [
            TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO', status: VerificationStatus::Validado)),
        ], Money::of('1'), Parameters::rounding(status: VerificationStatus::Validado));

        $roundingPending = RuleTrace::calculated('RULE-001', 'f', [
            TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO', status: VerificationStatus::Validado)),
        ], Money::of('1'), Parameters::rounding(status: VerificationStatus::Parcial));

        expect($validated->allowsProduction())->toBeTrue()
            ->and($validated->pendingParameterCodes())->toBe([])
            ->and($roundingPending->allowsProduction())->toBeFalse()
            ->and($roundingPending->pendingParameterCodes())->toBe([]);
    });

    it('acepta el mismo parámetro repetido aunque llegue en otra instancia', function (): void {
        $trace = RuleTrace::calculated('RULE-001', 'f', [
            TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO')),
            TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO')),
        ], Money::of('1'), Parameters::rounding());

        expect(array_map(static fn ($parameter): string => $parameter->code, $trace->parameters()))
            ->toBe(['CSS_OBRERO_SALARIO', 'REDONDEO_POLITICA']);
    });

    it('rechaza dos versiones del mismo parámetro, en cualquier orden, para que ninguna se oculte', function (VerificationStatus $first, VerificationStatus $second): void {
        $inputs = [
            TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO', status: $first)),
            TraceInput::parameter(Parameters::make('CSS_OBRERO_SALARIO', status: $second)),
        ];

        expect(fn () => RuleTrace::calculated('RULE-001', 'f', $inputs, Money::of('1'), Parameters::rounding(status: VerificationStatus::Validado)))
            ->toThrow(RuleTraceException::class, "La traza recibe dos versiones distintas del parámetro 'CSS_OBRERO_SALARIO' (valor, vigencia o estado)")
            ->and(fn () => RuleTrace::entered('Bono', $inputs, Money::of('1')))
            ->toThrow(RuleTraceException::class, "'CSS_OBRERO_SALARIO'");
    })->with([
        'PENDIENTE y luego VALIDADO' => [VerificationStatus::Pendiente, VerificationStatus::Validado],
        'VALIDADO y luego PENDIENTE' => [VerificationStatus::Validado, VerificationStatus::Pendiente],
    ]);

    it('rechaza una entrada de redondeo distinta de la política que se aplicó', function (): void {
        $pendingRounding = Parameters::rounding(status: VerificationStatus::Pendiente)->parameter;

        expect(fn () => RuleTrace::calculated('RULE-001', 'f', [TraceInput::parameter($pendingRounding)], Money::of('1'), Parameters::rounding(status: VerificationStatus::Validado)))
            ->toThrow(RuleTraceException::class, "'REDONDEO_POLITICA'");
    });

    it('un monto ingresado sin parámetros no bloquea producción', function (): void {
        $trace = RuleTrace::entered('Bono', [], Money::of('1'));

        expect($trace->parameters())->toBe([])
            ->and($trace->allowsProduction())->toBeTrue();
    });
});

describe('serialización', function (): void {
    it('produce la traza para planilla_lineas, sin valores sensibles', function (): void {
        $trace = RuleTrace::calculated('RULE-001', 'bruto × tasa', [
            TraceInput::money('salario_base', Money::of('2469.12'), sensitive: true),
            TraceInput::money('bruto', Money::of('1234.56')),
        ], Money::of('120.3696'), Parameters::rounding());

        expect($trace->toArray())->toBe([
            'regla' => 'RULE-001',
            'formula' => 'bruto × tasa',
            'entradas' => [
                ['nombre' => 'salario_base', 'valor' => null, 'sensible' => true, 'parametro' => null],
                ['nombre' => 'bruto', 'valor' => '1234.56', 'sensible' => false, 'parametro' => null],
            ],
            'resultado_sin_redondear' => '120.3696',
            'resultado' => '120.37',
            'redondeo' => ['regla' => 'RULE-080', 'escala' => 2, 'modo' => 'HALF_UP'],
            'parametros_pendientes' => ['REDONDEO_POLITICA'],
        ]);
    });

    it('json_encode y print_r usan la misma forma, sin la entrada sensible', function (): void {
        $trace = RuleTrace::calculated('RULE-001', 'bruto × tasa', [
            TraceInput::money('salario_base', Money::of('4321.67'), sensitive: true),
        ], Money::of('120.3696'), Parameters::rounding());

        expect(json_encode($trace, JSON_THROW_ON_ERROR))->toBe(json_encode($trace->toArray(), JSON_THROW_ON_ERROR))
            ->and(print_r($trace, true))->toContain('salario_base')->toContain('bruto × tasa')->not->toContain('4321.67');
    });

    it('un monto ingresado no lleva redondeo', function (): void {
        expect(RuleTrace::entered('Bono', [], Money::of('5'))->toArray())->toBe([
            'regla' => null,
            'formula' => 'Bono',
            'entradas' => [],
            'resultado_sin_redondear' => '5',
            'resultado' => '5',
            'redondeo' => null,
            'parametros_pendientes' => [],
        ]);
    });
});
