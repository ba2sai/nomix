<?php

declare(strict_types=1);

namespace App\Domain\Shared\Legal;

use DateTimeInterface;

/**
 * Carga los parámetros vigentes en una fecha. La implementación vive en
 * Infrastructure (parametros_legales); el dominio solo conoce este contrato.
 */
interface LegalParametersRepository
{
    public function forDate(DateTimeInterface $date): LegalParameters;
}
