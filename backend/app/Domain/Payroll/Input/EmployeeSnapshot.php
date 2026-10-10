<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Input;

use App\Domain\Payroll\PayrollException;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Period\CalendarDate;
use App\Domain\Shared\Period\PayFrequency;
use DateTimeImmutable;
use DateTimeInterface;
use JsonSerializable;

/**
 * Datos del colaborador que el motor necesita, tal como regían en el período
 * (docs/nomix/06: `colaboradores` e `historial_salarial`). No lleva identificadores
 * personales: el motor no los usa.
 *
 * El salario base es sensible (AGENTS.md, regla 7): vive en memoria durante el cálculo,
 * las reglas lo registran como entrada sensible de la traza y no sale en claro ni en los
 * mensajes de error ni al serializar el snapshot (json_encode, logs de Monolog, print_r,
 * var_dump). El perfil de ISR (RULE-011) y los descuentos a terceros (RULE-070) se
 * agregan en NMX-013 y NMX-015.
 */
final readonly class EmployeeSnapshot implements JsonSerializable
{
    public string $weeklyHours;

    public DateTimeImmutable $hireDate;

    public ?DateTimeImmutable $terminationDate;

    /**
     * @param  Money  $baseSalary  salario base mensual
     * @param  string  $weeklyHours  horas semanales pactadas, como string decimal
     * @param  Money|null  $representationExpenses  gastos de representación mensuales (RULE-012)
     */
    public function __construct(
        public Money $baseSalary,
        public PayFrequency $payFrequency,
        string $weeklyHours,
        public WorkShift $workShift,
        DateTimeInterface $hireDate,
        ?DateTimeInterface $terminationDate = null,
        public ?Money $representationExpenses = null,
    ) {
        if (! $baseSalary->isPositive()) {
            throw PayrollException::nonPositiveSalary();
        }

        if (! $baseSalary->fitsScale(2)) {
            throw PayrollException::salaryNotRounded();
        }

        if ($representationExpenses !== null && ($representationExpenses->isNegative() || ! $representationExpenses->fitsScale(2))) {
            throw PayrollException::outOfRange('gastos_representacion', $representationExpenses->toDecimalString(), '[0, ∞) con 2 decimales');
        }

        // 168 = horas de una semana; el límite legal de la jornada lo aplican las reglas.
        $this->weeklyHours = Decimals::positive('horas_semanales', $weeklyHours, '168');
        $this->hireDate = CalendarDate::from($hireDate);
        $this->terminationDate = $terminationDate === null ? null : CalendarDate::from($terminationDate);

        if ($this->terminationDate !== null && $this->terminationDate < $this->hireDate) {
            throw PayrollException::terminationBeforeHire();
        }
    }

    /**
     * Forma para registros y depuración. El salario base sale sin valor, como una entrada
     * sensible de la traza; los gastos de representación no son un campo cifrado (06).
     *
     * @return array{salario_base: null, salario_base_sensible: true, periodicidad: string, horas_semanales: string, jornada: string, fecha_ingreso: string, fecha_terminacion: string|null, gastos_representacion: string|null}
     */
    public function jsonSerialize(): array
    {
        return [
            'salario_base' => null,
            'salario_base_sensible' => true,
            'periodicidad' => $this->payFrequency->value,
            'horas_semanales' => $this->weeklyHours,
            'jornada' => $this->workShift->value,
            'fecha_ingreso' => $this->hireDate->format('Y-m-d'),
            'fecha_terminacion' => $this->terminationDate?->format('Y-m-d'),
            'gastos_representacion' => $this->representationExpenses?->toString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function __debugInfo(): array
    {
        return $this->jsonSerialize();
    }
}
