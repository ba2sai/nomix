<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Input;

/**
 * Datos de la empresa que el motor necesita (docs/nomix/06: `empresas`).
 */
final readonly class EmployerSnapshot
{
    public string $occupationalRiskRate;

    /**
     * @param  string  $occupationalRiskRate  tasa de Riesgos Profesionales que la CSS asignó a la
     *                                        empresa (RULE-007), p. ej. '0.021000' = 2.10%
     */
    public function __construct(string $occupationalRiskRate)
    {
        $this->occupationalRiskRate = Decimals::rate('tasa_riesgo_profesional', $occupationalRiskRate);
    }
}
