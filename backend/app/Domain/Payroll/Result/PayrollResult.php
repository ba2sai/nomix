<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Result;

use App\Domain\Shared\Money\Money;

/**
 * Resultado de calcular a un colaborador en un período: sus líneas con traza, los avisos
 * y los totales de planilla_colaboradores (docs/nomix/06).
 *
 * Los totales son sumas de líneas ya redondeadas: el neto nunca se redondea por su
 * cuenta (propuesta de RULE-080). Un neto negativo no se corrige aquí; lo resuelve la
 * prioridad de descuentos (RULE-070).
 */
final readonly class PayrollResult
{
    public Money $gross;

    public Money $lawDeductions;

    public Money $thirdPartyDeductions;

    public Money $totalDeductions;

    public Money $net;

    public Money $employerCost;

    /**
     * @param  list<LineItem>  $lines
     * @param  list<PayrollWarning>  $warnings
     */
    public function __construct(private array $lines, private array $warnings = [])
    {
        $this->gross = self::sum($lines, Category::Ingreso);
        $this->lawDeductions = self::sum($lines, Category::DeduccionLey);
        $this->thirdPartyDeductions = self::sum($lines, Category::Descuento);
        $this->totalDeductions = $this->lawDeductions->plus($this->thirdPartyDeductions);
        $this->net = $this->gross->minus($this->totalDeductions);
        $this->employerCost = self::sum($lines, Category::CargaPatronal);
    }

    /**
     * @return list<LineItem>
     */
    public function lines(): array
    {
        return $this->lines;
    }

    /**
     * @return list<LineItem>
     */
    public function linesOf(Concept $concept): array
    {
        return array_values(array_filter($this->lines, static fn (LineItem $line): bool => $line->concept === $concept));
    }

    /**
     * @return list<PayrollWarning>
     */
    public function warnings(): array
    {
        return $this->warnings;
    }

    /** Solo si todas las líneas usan parámetros VALIDADO. */
    public function allowsProduction(): bool
    {
        foreach ($this->lines as $line) {
            if (! $line->trace->allowsProduction()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Parámetros PENDIENTE usados en alguna línea, sin repetir y ordenados.
     *
     * @return list<string>
     */
    public function pendingParameterCodes(): array
    {
        $codes = [];

        foreach ($this->lines as $line) {
            foreach ($line->trace->pendingParameterCodes() as $code) {
                $codes[] = $code;
            }
        }

        $codes = array_unique($codes);
        sort($codes);

        return $codes;
    }

    /**
     * @return array{bruto: string, total_deducciones: string, neto: string, total_patronal: string, lineas: list<array<string, mixed>>, avisos: list<array{codigo: string, mensaje: string, regla: string|null}>}
     */
    public function toArray(): array
    {
        return [
            'bruto' => $this->gross->toString(),
            'total_deducciones' => $this->totalDeductions->toString(),
            'neto' => $this->net->toString(),
            'total_patronal' => $this->employerCost->toString(),
            'lineas' => array_map(static fn (LineItem $line): array => $line->toArray(), $this->lines),
            'avisos' => array_map(static fn (PayrollWarning $warning): array => $warning->toArray(), $this->warnings),
        ];
    }

    /**
     * @param  list<LineItem>  $lines
     */
    private static function sum(array $lines, Category $category): Money
    {
        $total = Money::zero();

        foreach ($lines as $line) {
            if ($line->category === $category) {
                $total = $total->plus($line->amount);
            }
        }

        return $total;
    }
}
