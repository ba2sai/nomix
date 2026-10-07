<?php

declare(strict_types=1);

namespace App\Domain\Shared;

use RuntimeException;

/**
 * Base de toda excepción lanzada por el dominio, para que las capas externas
 * distingan un error de negocio de un fallo técnico.
 */
abstract class DomainException extends RuntimeException {}
