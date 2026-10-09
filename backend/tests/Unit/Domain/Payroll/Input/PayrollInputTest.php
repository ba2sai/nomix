<?php

declare(strict_types=1);

use App\Domain\Payroll\Input\EmployeeSnapshot;
use App\Domain\Payroll\Input\EmployerSnapshot;
use App\Domain\Payroll\Input\Novelty;
use App\Domain\Payroll\Input\NoveltyType;
use App\Domain\Payroll\Input\PayrollInput;
use App\Domain\Payroll\Input\WorkShift;
use App\Domain\Payroll\PayrollException;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Period\PayFrequency;
use App\Domain\Shared\Period\PayPeriod;

mutates(PayrollInput::class, EmployeeSnapshot::class, EmployerSnapshot::class);

function fortnightlyEmployee(): EmployeeSnapshot
{
    return new EmployeeSnapshot(Money::of('1500.00'), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-15'));
}

describe('colaborador', function (): void {
    it('guarda sus datos y normaliza las fechas a medianoche UTC', function (): void {
        $employee = new EmployeeSnapshot(
            Money::of('1500.00'),
            PayFrequency::Bisemanal,
            '44.5',
            WorkShift::Mixta,
            new DateTimeImmutable('2024-01-15 22:00:00', new DateTimeZone('America/Panama')),
            new DateTimeImmutable('2026-12-31 08:00:00', new DateTimeZone('America/Panama')),
            Money::of('300.00'),
        );

        expect($employee->baseSalary->toString())->toBe('1500.00')
            ->and($employee->payFrequency)->toBe(PayFrequency::Bisemanal)
            ->and($employee->weeklyHours)->toBe('44.5')
            ->and($employee->workShift)->toBe(WorkShift::Mixta)
            ->and($employee->hireDate->format('Y-m-d H:i:s e'))->toBe('2024-01-15 00:00:00 UTC')
            ->and($employee->terminationDate?->format('Y-m-d H:i:s e'))->toBe('2026-12-31 00:00:00 UTC')
            ->and($employee->representationExpenses?->toString())->toBe('300.00');
    });

    it('admite no tener terminación ni gastos de representación', function (): void {
        $employee = fortnightlyEmployee();

        expect($employee->terminationDate)->toBeNull()
            ->and($employee->representationExpenses)->toBeNull();
    });

    it('exige un salario positivo', function (string $salary): void {
        expect(fn () => new EmployeeSnapshot(Money::of($salary), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-15')))
            ->toThrow(PayrollException::class, 'El salario base debe ser mayor que cero.');
    })->with(['0', '-100.00']);

    it('exige un salario con 2 decimales como máximo', function (): void {
        expect(fn () => new EmployeeSnapshot(Money::of('1500.005'), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-15')))
            ->toThrow(PayrollException::class, "El campo 'salario_base' tiene el monto 1500.005, que no cabe en 2 decimales.");
    });

    it('acepta salario y gastos de representación con 2 decimales', function (): void {
        $employee = new EmployeeSnapshot(Money::of('1234.56'), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-15'), null, Money::of('300.25'));

        expect($employee->baseSalary->toString())->toBe('1234.56')
            ->and($employee->representationExpenses?->toString())->toBe('300.25');
    });

    it('acepta gastos de representación en cero', function (): void {
        $employee = new EmployeeSnapshot(Money::of('1500'), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-15'), null, Money::zero());

        expect($employee->representationExpenses?->isZero())->toBeTrue();
    });

    it('rechaza gastos de representación negativos o con más de 2 decimales', function (string $amount): void {
        expect(fn () => new EmployeeSnapshot(Money::of('1500'), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-15'), null, Money::of($amount)))
            ->toThrow(PayrollException::class, "El campo 'gastos_representacion' vale {$amount}, fuera del rango [0, ∞) con 2 decimales.");
    })->with(['-1.00', '100.001']);

    it('valida las horas semanales entre 0 y 168', function (string $hours): void {
        expect(fn () => new EmployeeSnapshot(Money::of('1500'), PayFrequency::Quincenal, $hours, WorkShift::Diurna, new DateTimeImmutable('2024-01-15')))
            ->toThrow(PayrollException::class, "El campo 'horas_semanales'");
    })->with(['0', '169', 'cuarenta']);

    it('rechaza una terminación anterior al ingreso, pero no el mismo día', function (): void {
        $sameDay = new EmployeeSnapshot(Money::of('1500'), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-15'), new DateTimeImmutable('2024-01-15 18:00'));

        expect($sameDay->terminationDate?->format('Y-m-d'))->toBe('2024-01-15')
            ->and(fn () => new EmployeeSnapshot(Money::of('1500'), PayFrequency::Quincenal, '48', WorkShift::Diurna, new DateTimeImmutable('2024-01-15'), new DateTimeImmutable('2024-01-14')))
            ->toThrow(PayrollException::class, 'La fecha de terminación es anterior a la de ingreso.');
    });
});

describe('empresa', function (): void {
    it('guarda la tasa de Riesgos Profesionales', function (): void {
        expect((new EmployerSnapshot('0.021000'))->occupationalRiskRate)->toBe('0.021000');
    });

    it('rechaza tasas fuera de [0, 1)', function (): void {
        expect(fn () => new EmployerSnapshot('2.10'))
            ->toThrow(PayrollException::class, "El campo 'tasa_riesgo_profesional' vale 2.10, fuera del rango [0, 1).");
    });
});

describe('entrada del cálculo', function (): void {
    it('reúne período, fecha de pago, colaborador, empresa y novedades', function (): void {
        $period = PayPeriod::fortnight(2026, 10, 1);
        $employee = fortnightlyEmployee();
        $employer = new EmployerSnapshot('0.021000');
        $overtime = Novelty::time(NoveltyType::HoraExtra, new DateTimeImmutable('2026-10-05'), '2', 'diurna');
        $bonus = Novelty::money(NoveltyType::Bono, new DateTimeImmutable('2026-10-10'), Money::of('100'));
        $absence = Novelty::time(NoveltyType::Ausencia, new DateTimeImmutable('2026-10-12'), '1');
        $overtimeNight = Novelty::time(NoveltyType::HoraExtra, new DateTimeImmutable('2026-10-14'), '1', 'nocturna');

        $input = new PayrollInput($period, new DateTimeImmutable('2026-10-15 17:00', new DateTimeZone('America/Panama')), $employee, $employer, [$overtime, $bonus, $absence, $overtimeNight]);

        expect($input->period)->toBe($period)
            ->and($input->paymentDate->format('Y-m-d H:i:s e'))->toBe('2026-10-15 00:00:00 UTC')
            ->and($input->employee)->toBe($employee)
            ->and($input->employer)->toBe($employer)
            ->and($input->novelties())->toBe([$overtime, $bonus, $absence, $overtimeNight])
            ->and($input->noveltiesOf(NoveltyType::HoraExtra))->toBe([$overtime, $overtimeNight])
            ->and($input->noveltiesOf(NoveltyType::Incapacidad))->toBe([]);
    });

    it('admite no tener novedades', function (): void {
        $input = new PayrollInput(PayPeriod::fortnight(2026, 10, 2), new DateTimeImmutable('2026-10-31'), fortnightlyEmployee(), new EmployerSnapshot('0'));

        expect($input->novelties())->toBe([]);
    });

    it('exige que el período coincida con la periodicidad del colaborador', function (): void {
        expect(fn () => new PayrollInput(PayPeriod::month(2026, 10), new DateTimeImmutable('2026-10-31'), fortnightlyEmployee(), new EmployerSnapshot('0')))
            ->toThrow(PayrollException::class, "El colaborador cobra con periodicidad 'quincenal', pero el período es 'mensual'.");
    });
});
