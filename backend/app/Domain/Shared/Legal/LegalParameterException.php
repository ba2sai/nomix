<?php

declare(strict_types=1);

namespace App\Domain\Shared\Legal;

use App\Domain\Shared\DomainException;
use DateTimeInterface;

final class LegalParameterException extends DomainException
{
    public static function missing(string $code, DateTimeInterface $date): self
    {
        return new self(sprintf(
            "No hay un valor vigente del parámetro legal '%s' para el %s. Registra su vigencia en parametros_legales (ver docs/nomix/04).",
            $code,
            $date->format('Y-m-d'),
        ));
    }

    public static function notEffective(LegalParameter $parameter, DateTimeInterface $date): self
    {
        return new self(sprintf(
            "El parámetro legal '%s' no está vigente el %s (vigencia %s – %s).",
            $parameter->code,
            $date->format('Y-m-d'),
            $parameter->validFrom?->format('Y-m-d') ?? 'sin inicio',
            $parameter->validUntil?->format('Y-m-d') ?? 'abierta',
        ));
    }

    public static function duplicate(string $code): self
    {
        return new self("El parámetro legal '{$code}' aparece más de una vez para la misma fecha.");
    }

    public static function emptyCode(): self
    {
        return new self('El código del parámetro legal no puede estar vacío.');
    }

    public static function invalidRuleId(string $code, string $ruleId): self
    {
        return new self("El parámetro legal '{$code}' cita la regla '{$ruleId}', que no tiene el formato RULE-000.");
    }

    public static function valueOrTableRequired(string $code): self
    {
        return new self("El parámetro legal '{$code}' debe tener un valor o una tabla, pero no ambos.");
    }

    public static function invalidValue(string $code, string $value): self
    {
        return new self("El parámetro legal '{$code}' tiene el valor '{$value}', que no es un decimal como '0.132500'.");
    }

    public static function invalidPeriod(string $code): self
    {
        return new self("El parámetro legal '{$code}' termina antes de empezar.");
    }

    public static function isTable(string $code): self
    {
        return new self("El parámetro legal '{$code}' es una tabla; usa table() en lugar de value().");
    }

    public static function isValue(string $code): self
    {
        return new self("El parámetro legal '{$code}' es un valor simple; usa value() en lugar de table().");
    }
}
