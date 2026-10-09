<?php

declare(strict_types=1);

namespace App\Domain\Shared\Money;

use App\Domain\Shared\DomainException;

final class MoneyException extends DomainException
{
    public static function invalidAmount(string $value): self
    {
        return new self("Monto o factor inválido: '{$value}'. Usa un decimal como '1234.56'.");
    }

    public static function divisionByZero(): self
    {
        return new self('No se puede dividir un monto entre cero.');
    }

    public static function notRounded(string $value): self
    {
        return new self("El monto {$value} tiene más de 2 decimales: redondéalo con una RoundingPolicy antes de serializarlo.");
    }

    public static function invalidPolicy(string $reason): self
    {
        return new self('Política de redondeo inválida: '.$reason.'.');
    }
}
