<?php

declare(strict_types=1);

namespace App\Domain\Shared\Legal;

use App\Domain\Shared\Period\CalendarDate;
use DateTimeImmutable;
use DateTimeInterface;

/**
 * Parámetros legales vigentes en una fecha. Es la entrada del motor de nómina
 * (docs/nomix/05 §2.2): el mismo PayrollInput con los mismos LegalParameters
 * produce siempre el mismo resultado. Se obtiene con LegalParametersRepository::forDate().
 */
final readonly class LegalParameters
{
    /**
     * @param  array<string, LegalParameter>  $parameters  indexados por código
     */
    private function __construct(
        public DateTimeImmutable $date,
        private array $parameters,
    ) {}

    /**
     * @param  iterable<LegalParameter>  $parameters
     */
    public static function on(DateTimeInterface $date, iterable $parameters): self
    {
        $day = CalendarDate::from($date);
        $indexed = [];

        foreach ($parameters as $parameter) {
            if (! $parameter->appliesOn($day)) {
                throw LegalParameterException::notEffective($parameter, $day);
            }

            if (isset($indexed[$parameter->code])) {
                throw LegalParameterException::duplicate($parameter->code);
            }

            $indexed[$parameter->code] = $parameter;
        }

        return new self($day, $indexed);
    }

    public function has(LegalParameterCode|string $code): bool
    {
        return isset($this->parameters[self::key($code)]);
    }

    public function get(LegalParameterCode|string $code): LegalParameter
    {
        return $this->parameters[self::key($code)] ?? throw LegalParameterException::missing(self::key($code), $this->date);
    }

    /** Atajo para parámetros de valor simple. */
    public function value(LegalParameterCode|string $code): string
    {
        return $this->get($code)->value();
    }

    /**
     * Atajo para parámetros de tabla.
     *
     * @return array<string, mixed>
     */
    public function table(LegalParameterCode|string $code): array
    {
        return $this->get($code)->table();
    }

    /**
     * Todos los parámetros, ordenados por código, para snapshots y trazas.
     *
     * @return list<LegalParameter>
     */
    public function all(): array
    {
        $parameters = $this->parameters;
        ksort($parameters);

        return array_values($parameters);
    }

    private static function key(LegalParameterCode|string $code): string
    {
        return $code instanceof LegalParameterCode ? $code->value : $code;
    }
}
