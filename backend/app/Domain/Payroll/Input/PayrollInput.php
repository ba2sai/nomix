<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Input;

use App\Domain\Payroll\PayrollException;
use App\Domain\Shared\Period\CalendarDate;
use App\Domain\Shared\Period\PayPeriod;
use DateTimeImmutable;
use DateTimeInterface;

/**
 * Entrada del motor de nómina para un colaborador y un período (docs/nomix/05 §2.2):
 * junto con los LegalParameters vigentes, determina por completo el PayrollResult.
 *
 * Lleva el período trabajado y la fecha de pago por separado: cuál de los dos decide la
 * tasa vigente (el "mes de cuota" de RULE-002) está pendiente de confirmar con el contador.
 * Las novedades no se restringen al período porque una hora extra puede pagarse tarde.
 */
final readonly class PayrollInput
{
    public DateTimeImmutable $paymentDate;

    /**
     * @param  list<Novelty>  $novelties
     */
    public function __construct(
        public PayPeriod $period,
        DateTimeInterface $paymentDate,
        public EmployeeSnapshot $employee,
        public EmployerSnapshot $employer,
        private array $novelties = [],
    ) {
        if ($employee->payFrequency !== $period->frequency) {
            throw PayrollException::frequencyMismatch($employee->payFrequency->value, $period->frequency->value);
        }

        $this->paymentDate = CalendarDate::from($paymentDate);
    }

    /**
     * @return list<Novelty>
     */
    public function novelties(): array
    {
        return $this->novelties;
    }

    /**
     * @return list<Novelty>
     */
    public function noveltiesOf(NoveltyType $type): array
    {
        return array_values(array_filter($this->novelties, static fn (Novelty $novelty): bool => $novelty->type === $type));
    }
}
