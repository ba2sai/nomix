<?php

declare(strict_types=1);

namespace App\Domain\Shared\Legal;

/**
 * Estado de verificación de una regla del catálogo (docs/nomix/04 §0.1).
 * Los valores coinciden con `parametros_legales.estado_verificacion`.
 */
enum VerificationStatus: string
{
    case ConfirmadoSecundario = 'CONFIRMADO_SECUNDARIO';
    case Parcial = 'PARCIAL';
    case Pendiente = 'PENDIENTE';
    case Validado = 'VALIDADO';

    /** Solo una regla VALIDADA por un profesional idóneo puede usarse en producción. */
    public function allowsProduction(): bool
    {
        return $this === self::Validado;
    }
}
