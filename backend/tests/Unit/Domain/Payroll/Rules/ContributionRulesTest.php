<?php

declare(strict_types=1);

use App\Domain\Payroll\Input\EmployerSnapshot;
use App\Domain\Payroll\PayrollException;
use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Payroll\Result\PayrollWarning;
use App\Domain\Payroll\Rules\CssEmployeeRule;
use App\Domain\Payroll\Rules\CssEmployerRule;
use App\Domain\Payroll\Rules\EducationInsuranceEmployeeRule;
use App\Domain\Payroll\Rules\EducationInsuranceEmployerRule;
use App\Domain\Payroll\Rules\OccupationalRiskRule;
use App\Domain\Payroll\Rules\RateContribution;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Domain\Shared\Money\Money;
use Tests\Support\Parameters;

mutates(
    RateContribution::class,
    CssEmployeeRule::class,
    CssEmployerRule::class,
    EducationInsuranceEmployeeRule::class,
    EducationInsuranceEmployerRule::class,
    OccupationalRiskRule::class,
);

/**
 * Tasas ficticias y distintas por código, para comprobar que cada regla lee la suya. Las
 * tasas reales del catálogo se prueban en tests/Legal/SocialSecurityContributionsTest.php.
 */
function contributionParameters(
    VerificationStatus $range = VerificationStatus::Parcial,
    VerificationStatus $rounding = VerificationStatus::Pendiente,
    string $mode = 'HALF_UP',
): LegalParameters {
    return LegalParameters::on(new DateTimeImmutable('2026-10-15'), [
        Parameters::make('CSS_OBRERO_SALARIO', '0.0100', ruleId: 'RULE-001'),
        Parameters::make('CSS_PATRONAL_SALARIO', '0.0200', ruleId: 'RULE-002'),
        Parameters::make('SE_OBRERO_SALARIO', '0.0300', ruleId: 'RULE-005'),
        Parameters::make('SE_PATRONAL_SALARIO', '0.0400', ruleId: 'RULE-006'),
        Parameters::make('RIESGO_PROFESIONAL_TASA_MINIMA', '0.0100', $range, ruleId: 'RULE-007'),
        Parameters::make('RIESGO_PROFESIONAL_TASA_MAXIMA', '0.0500', $range, ruleId: 'RULE-007'),
        Parameters::make('REDONDEO_POLITICA', null, $rounding, ['escala' => 2, 'modo' => $mode, 'escala_intermedia' => 6], 'RULE-080'),
    ]);
}

describe('cuotas con tasa de parametros_legales (RULE-001, 002, 005 y 006)', function (): void {
    it('cada regla lee su parámetro, cita su regla y deja la traza completa', function (object $rule, Concept $concept, string $ruleId, string $code, string $rate, string $expected): void {
        $line = $rule->calculate(Money::of('1000.00'), contributionParameters());
        $trace = $line->trace->toArray();

        expect($line->concept)->toBe($concept)
            ->and($line->amount->toString())->toBe($expected)
            ->and($trace['regla'])->toBe($ruleId)
            ->and($trace['formula'])->toBe("base_gravable × {$code}")
            ->and($trace['entradas'])->toHaveCount(2)
            ->and($trace['entradas'][0])->toBe(['nombre' => 'base_gravable', 'valor' => null, 'sensible' => true, 'parametro' => null])
            ->and($trace['entradas'][1]['nombre'])->toBe($code)
            ->and($trace['entradas'][1]['valor'])->toBe($rate)
            ->and($trace['redondeo'])->toBe(['regla' => 'RULE-080', 'escala' => 2, 'modo' => 'HALF_UP']);
    })->with([
        'RULE-001' => [new CssEmployeeRule, Concept::CssObrero, 'RULE-001', 'CSS_OBRERO_SALARIO', '0.0100', '10.00'],
        'RULE-002' => [new CssEmployerRule, Concept::CssPatronal, 'RULE-002', 'CSS_PATRONAL_SALARIO', '0.0200', '20.00'],
        'RULE-005' => [new EducationInsuranceEmployeeRule, Concept::SeObrero, 'RULE-005', 'SE_OBRERO_SALARIO', '0.0300', '30.00'],
        'RULE-006' => [new EducationInsuranceEmployerRule, Concept::SePatronal, 'RULE-006', 'SE_PATRONAL_SALARIO', '0.0400', '40.00'],
    ]);

    it('redondea con la política de RULE-080 que recibe', function (string $mode, string $expected): void {
        $line = (new CssEmployeeRule)->calculate(Money::of('1234.56'), contributionParameters(mode: $mode));

        expect($line->trace->unroundedResult->isEqualTo(Money::of('12.3456')))->toBeTrue()
            ->and($line->amount->toString())->toBe($expected);
    })->with([
        'HALF_UP' => ['HALF_UP', '12.35'],
        'DOWN' => ['DOWN', '12.34'],
    ]);

    it('una base en cero da una cuota en cero', function (): void {
        expect((new CssEmployerRule)->calculate(Money::zero(), contributionParameters())->amount->toString())->toBe('0.00');
    });
});

describe('base gravable', function (): void {
    it('protege la base en la línea y su traza cuando coincide con el salario base', function (callable $calculate, string $expected): void {
        $base = Money::of('4321.67');
        $line = $calculate($base, contributionParameters());

        ob_start();
        var_dump($line);
        $dump = ob_get_clean();

        expect($line->amount->toString())->toBe($expected)
            ->and($line->trace->inputs()[0]->value)->toBe('4321.67')
            ->and($line->toArray()['traza']['entradas'][0])->toBe(['nombre' => 'base_gravable', 'valor' => null, 'sensible' => true, 'parametro' => null])
            ->and(json_encode($line->toArray(), JSON_THROW_ON_ERROR))->not->toContain('4321.67')
            ->and(json_encode($line, JSON_THROW_ON_ERROR))->not->toContain('4321.67')
            ->and(json_encode($line->trace, JSON_THROW_ON_ERROR))->not->toContain('4321.67')
            ->and(print_r($line, true))->not->toContain('4321.67')
            ->and($dump)->not->toContain('4321.67');
    })->with([
        'RULE-001' => [fn (Money $base, LegalParameters $parameters): LineItem => (new CssEmployeeRule)->calculate($base, $parameters), '43.22'],
        'RULE-002' => [fn (Money $base, LegalParameters $parameters): LineItem => (new CssEmployerRule)->calculate($base, $parameters), '86.43'],
        'RULE-005' => [fn (Money $base, LegalParameters $parameters): LineItem => (new EducationInsuranceEmployeeRule)->calculate($base, $parameters), '129.65'],
        'RULE-006' => [fn (Money $base, LegalParameters $parameters): LineItem => (new EducationInsuranceEmployerRule)->calculate($base, $parameters), '172.87'],
        'RULE-007' => [fn (Money $base, LegalParameters $parameters): LineItem => (new OccupationalRiskRule)->calculate($base, new EmployerSnapshot('0.021000'), $parameters), '90.76'],
    ]);

    it('rechaza una base negativa o con más de 2 decimales, sin mostrar su monto', function (string $base): void {
        try {
            (new CssEmployeeRule)->calculate(Money::of($base), contributionParameters());
        } catch (PayrollException $exception) {
            expect($exception->getMessage())->toBe('La base gravable de RULE-001 debe ser cero o positiva y tener 2 decimales como máximo.')
                ->and($exception->getMessage())->not->toContain($base);

            return;
        }

        throw new RuntimeException("La base {$base} debía rechazarse.");
    })->with(['-0.01', '100.005']);

    it('también la valida en Riesgos Profesionales', function (): void {
        expect(fn () => (new OccupationalRiskRule)->calculate(Money::of('-1.00'), new EmployerSnapshot('0.0200'), contributionParameters()))
            ->toThrow(PayrollException::class, 'La base gravable de RULE-007');
    });
});

describe('Riesgos Profesionales (RULE-007)', function (): void {
    it('mantiene aisladas las tasas de dos empresas en cálculos intercalados', function (): void {
        $rule = new OccupationalRiskRule;
        $base = Money::of('500.00');
        $parameters = contributionParameters();
        $companyA = new EmployerSnapshot('0.021000');
        $companyB = new EmployerSnapshot('0.042000');
        $firstA = $rule->calculate($base, $companyA, $parameters);
        $lineB = $rule->calculate($base, $companyB, $parameters);
        $secondA = $rule->calculate($base, $companyA, $parameters);

        expect($firstA->amount->toString())->toBe('10.50')
            ->and($lineB->amount->toString())->toBe('21.00')
            ->and($secondA->toArray())->toBe($firstA->toArray())
            ->and($firstA->trace->inputs()[1]->value)->toBe('0.021000')
            ->and($lineB->trace->inputs()[1]->value)->toBe('0.042000');
    });

    it('aplica la tasa de la empresa y deja el rango de referencia en la traza', function (): void {
        $line = (new OccupationalRiskRule)->calculate(Money::of('1000.00'), new EmployerSnapshot('0.021000'), contributionParameters());
        $trace = $line->trace->toArray();

        expect($line->concept)->toBe(Concept::RiesgoProfesional)
            ->and($line->amount->toString())->toBe('21.00')
            ->and($trace['regla'])->toBe('RULE-007')
            ->and($trace['formula'])->toBe('base_gravable × tasa_riesgo_profesional')
            ->and(array_column($trace['entradas'], 'nombre'))->toBe(['base_gravable', 'tasa_riesgo_profesional', 'RIESGO_PROFESIONAL_TASA_MINIMA', 'RIESGO_PROFESIONAL_TASA_MAXIMA'])
            ->and(array_column($trace['entradas'], 'valor'))->toBe([null, '0.021000', '0.0100', '0.0500']);
    });

    it('hereda el estado del rango de referencia: no habilita producción mientras sea PARCIAL', function (): void {
        $employer = new EmployerSnapshot('0.0200');
        $partial = (new OccupationalRiskRule)->calculate(Money::of('100.00'), $employer, contributionParameters(VerificationStatus::Parcial, VerificationStatus::Validado));
        $validated = (new OccupationalRiskRule)->calculate(Money::of('100.00'), $employer, contributionParameters(VerificationStatus::Validado, VerificationStatus::Validado));

        expect($partial->trace->allowsProduction())->toBeFalse()
            ->and($validated->trace->allowsProduction())->toBeTrue();
    });

    it('avisa si la tasa queda fuera del rango de referencia, con los extremos incluidos', function (string $rate, bool $warns): void {
        $warnings = (new OccupationalRiskRule)->warnings(new EmployerSnapshot($rate), contributionParameters());

        expect($warnings)->toHaveCount($warns ? 1 : 0);
    })->with([
        'por debajo del mínimo' => ['0.009999', true],
        'en el mínimo' => ['0.0100', false],
        'dentro del rango' => ['0.0300', false],
        'en el máximo' => ['0.0500', false],
        'por encima del máximo' => ['0.050001', true],
    ]);

    it('el aviso cita la regla, la tasa y el rango, y no bloquea el cálculo', function (): void {
        $employer = new EmployerSnapshot('0.0700');
        $warnings = (new OccupationalRiskRule)->warnings($employer, contributionParameters());

        expect($warnings)->toEqual([new PayrollWarning(
            'RIESGO_PROFESIONAL_FUERA_DE_RANGO',
            'La tasa de Riesgos Profesionales de la empresa (0.0700) está fuera del rango de referencia del catálogo (0.0100 a 0.0500). Verifica la tasa que asignó la CSS.',
            'RULE-007',
        )])
            ->and((new OccupationalRiskRule)->calculate(Money::of('100.00'), $employer, contributionParameters())->amount->toString())->toBe('7.00');
    });
});
