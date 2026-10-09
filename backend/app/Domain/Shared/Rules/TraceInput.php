<?php

declare(strict_types=1);

namespace App\Domain\Shared\Rules;

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Money\Money;

/**
 * Una entrada de una traza de cálculo: un monto, una cantidad (horas, días) o un
 * parámetro legal con su regla y su estado de verificación.
 *
 * Una entrada sensible (p. ej. el salario base) se usa en memoria pero nunca sale en
 * claro de la traza serializada (AGENTS.md, regla 7).
 */
final readonly class TraceInput
{
    private const string DECIMAL_PATTERN = '/^-?\d+(\.\d+)?$/';

    private function __construct(
        public string $name,
        public ?string $value,
        public bool $sensitive,
        public ?LegalParameter $parameter,
    ) {}

    public static function money(string $name, Money $amount, bool $sensitive = false): self
    {
        return new self(self::checkName($name), $amount->toDecimalString(), $sensitive, null);
    }

    /** Horas, días u otra cantidad no monetaria, como string decimal. */
    public static function quantity(string $name, string $value): self
    {
        $name = self::checkName($name);

        if (preg_match(self::DECIMAL_PATTERN, $value) !== 1) {
            throw RuleTraceException::invalidQuantity($name, $value);
        }

        return new self($name, $value, false, null);
    }

    /**
     * Un parámetro de parametros_legales. Su nombre es el código; una tabla (tramos)
     * no tiene un valor único, así que su valor queda vacío.
     */
    public static function parameter(LegalParameter $parameter): self
    {
        return new self($parameter->code, $parameter->isTable() ? null : $parameter->value(), false, $parameter);
    }

    /**
     * @return array{nombre: string, valor: string|null, sensible: bool, parametro: array{codigo: string, regla: string, estado: string, vigente_desde: string|null, vigente_hasta: string|null}|null}
     */
    public function toArray(): array
    {
        return [
            'nombre' => $this->name,
            'valor' => $this->sensitive ? null : $this->value,
            'sensible' => $this->sensitive,
            'parametro' => $this->parameter === null ? null : [
                'codigo' => $this->parameter->code,
                'regla' => $this->parameter->ruleId,
                'estado' => $this->parameter->status->value,
                'vigente_desde' => $this->parameter->validFrom?->format('Y-m-d'),
                'vigente_hasta' => $this->parameter->validUntil?->format('Y-m-d'),
            ],
        ];
    }

    private static function checkName(string $name): string
    {
        if ($name === '') {
            throw RuleTraceException::emptyName();
        }

        return $name;
    }
}
