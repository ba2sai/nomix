<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Result;

use App\Domain\Payroll\PayrollException;
use App\Domain\Shared\Money\Money;
use App\Domain\Shared\Rules\RuleTrace;

/**
 * Una línea de planilla (planilla_lineas). El monto es el resultado de su traza, así que
 * línea y traza no pueden discrepar. Siempre es positivo o cero: la categoría dice si suma
 * o resta.
 */
final readonly class LineItem
{
    public Category $category;

    public Money $amount;

    public function __construct(public Concept $concept, public RuleTrace $trace)
    {
        $amount = $trace->result;

        if ($amount->isNegative()) {
            throw PayrollException::negativeLine($concept->value, $amount->toDecimalString());
        }

        if (! $amount->fitsScale(2)) {
            throw PayrollException::lineNotRounded($concept->value, $amount->toDecimalString());
        }

        $this->category = $concept->category();
        $this->amount = $amount;
    }

    /**
     * @return array{concepto: string, categoria: string, monto: string, rule_id: string|null, traza: array<string, mixed>}
     */
    public function toArray(): array
    {
        return [
            'concepto' => $this->concept->value,
            'categoria' => $this->category->value,
            'monto' => $this->amount->toString(),
            'rule_id' => $this->trace->ruleId,
            'traza' => $this->trace->toArray(),
        ];
    }
}
