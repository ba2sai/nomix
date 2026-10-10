<?php

declare(strict_types=1);

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Rules\RuleTraceException;
use App\Domain\Shared\Rules\TraceInput;
use Tests\Support\Parameters;

mutates(TraceInput::class, RuleTraceException::class);

describe('montos', function (): void {
    it('guarda el valor exacto, con todos sus decimales', function (): void {
        $input = TraceInput::money('bruto', Money::of('120.3696'));

        expect($input->name)->toBe('bruto')
            ->and($input->value)->toBe('120.3696')
            ->and($input->sensitive)->toBeFalse()
            ->and($input->parameter)->toBeNull();
    });

    it('marca un monto como sensible', function (): void {
        expect(TraceInput::money('salario_base', Money::of('1500.00'), sensitive: true)->sensitive)->toBeTrue();
    });

    it('exige un nombre', function (): void {
        expect(fn () => TraceInput::money('', Money::of('1')))
            ->toThrow(RuleTraceException::class, 'Cada entrada de una traza necesita un nombre.');
    });
});

describe('cantidades', function (): void {
    it('acepta decimales simples', function (string $value): void {
        $input = TraceInput::quantity('horas', $value);

        expect($input->value)->toBe($value)
            ->and($input->sensitive)->toBeFalse()
            ->and($input->parameter)->toBeNull();
    })->with(['8.50', '2', '-1.5']);

    it('rechaza valores que no son decimales simples', function (string $value): void {
        expect(fn () => TraceInput::quantity('horas', $value))
            ->toThrow(RuleTraceException::class, "La entrada 'horas' tiene el valor '{$value}', que no es un decimal como '8.50'.");
    })->with(['8,5', '', 'ocho', '.5', '1e2', ' 8']);

    it('exige un nombre', function (): void {
        expect(fn () => TraceInput::quantity('', '1'))->toThrow(RuleTraceException::class, 'necesita un nombre');
    });
});

describe('parámetros legales', function (): void {
    it('toma el código como nombre y el valor del parámetro', function (): void {
        $parameter = Parameters::make('CSS_OBRERO_SALARIO', '0.097500', ruleId: 'RULE-001');
        $input = TraceInput::parameter($parameter);

        expect($input->name)->toBe('CSS_OBRERO_SALARIO')
            ->and($input->value)->toBe('0.097500')
            ->and($input->parameter)->toBe($parameter)
            ->and($input->sensitive)->toBeFalse();
    });

    it('deja sin valor una tabla', function (): void {
        $input = TraceInput::parameter(Parameters::make('ISR_TARIFA_ANUAL', null, table: ['tramos' => []]));

        expect($input->value)->toBeNull();
    });
});

describe('serialización', function (): void {
    it('describe el parámetro con su regla, estado y vigencia', function (): void {
        $parameter = LegalParameter::of(
            'CSS_PATRONAL_SALARIO', 'RULE-002', '0.132500', null,
            new DateTimeImmutable('2025-04-01'), new DateTimeImmutable('2027-02-28'),
            VerificationStatus::ConfirmadoSecundario, 'Ley 462 de 2025',
        );

        expect(TraceInput::parameter($parameter)->toArray())->toBe([
            'nombre' => 'CSS_PATRONAL_SALARIO',
            'valor' => '0.132500',
            'sensible' => false,
            'parametro' => [
                'codigo' => 'CSS_PATRONAL_SALARIO',
                'regla' => 'RULE-002',
                'estado' => 'CONFIRMADO_SECUNDARIO',
                'vigente_desde' => '2025-04-01',
                'vigente_hasta' => '2027-02-28',
            ],
        ]);
    });

    it('serializa vigencias abiertas como nulas', function (): void {
        $array = TraceInput::parameter(Parameters::make('X', status: VerificationStatus::Pendiente))->toArray();

        expect($array['parametro'])->toBe([
            'codigo' => 'X',
            'regla' => 'RULE-999',
            'estado' => 'PENDIENTE',
            'vigente_desde' => null,
            'vigente_hasta' => null,
        ]);
    });

    it('nunca entrega en claro el valor de una entrada sensible (AGENTS.md, regla 7)', function (): void {
        expect(TraceInput::money('salario_base', Money::of('1500.00'), sensitive: true)->toArray())->toBe([
            'nombre' => 'salario_base',
            'valor' => null,
            'sensible' => true,
            'parametro' => null,
        ])->and(TraceInput::money('bruto', Money::of('750.00'))->toArray())->toBe([
            'nombre' => 'bruto',
            'valor' => '750.00',
            'sensible' => false,
            'parametro' => null,
        ]);
    });

    it('tampoco lo entrega con json_encode, print_r ni var_dump', function (): void {
        $input = TraceInput::money('salario_base', Money::of('4321.67'), sensitive: true);

        ob_start();
        var_dump($input);
        $dump = (string) ob_get_clean();

        expect(json_encode($input, JSON_THROW_ON_ERROR))->toBe(json_encode($input->toArray(), JSON_THROW_ON_ERROR))
            ->and(print_r($input, true))->toContain('salario_base')->not->toContain('4321.67')
            ->and($dump)->toContain('salario_base')->not->toContain('4321.67');
    });
});
