<?php

declare(strict_types=1);

namespace App\Domain\Shared\Rules;

use App\Domain\Shared\DomainException;

final class RuleTraceException extends DomainException
{
    public static function emptyName(): self
    {
        return new self('Cada entrada de una traza necesita un nombre.');
    }

    public static function invalidQuantity(string $name, string $value): self
    {
        return new self("La entrada '{$name}' tiene el valor '{$value}', que no es un decimal como '8.50'.");
    }

    public static function invalidRuleId(string $ruleId): self
    {
        return new self("La traza cita la regla '{$ruleId}', que no tiene el formato RULE-000.");
    }

    public static function emptyFormula(): self
    {
        return new self('La traza necesita una fórmula legible, p. ej. "bruto × tasa".');
    }

    public static function enteredAmountNotRounded(string $amount): self
    {
        return new self("El monto ingresado {$amount} tiene más de 2 decimales.");
    }

    public static function conflictingParameter(string $code): self
    {
        return new self("La traza recibe dos versiones distintas del parámetro '{$code}' (valor, vigencia o estado): todos los parámetros de un cálculo deben salir de la misma consulta por fecha.");
    }

    public static function invalidRoundingTable(string $reason): self
    {
        return new self('La política de redondeo de parametros_legales (REDONDEO_POLITICA, RULE-080) no es válida: '.$reason.'.');
    }
}
