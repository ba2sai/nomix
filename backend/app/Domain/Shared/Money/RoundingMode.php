<?php

declare(strict_types=1);

namespace App\Domain\Shared\Money;

use Brick\Math\RoundingMode as BrickRoundingMode;

/**
 * Modos de redondeo admitidos por RULE-080. Los valores coinciden con los que se
 * guardarán en parametros_legales (NMX-006).
 */
enum RoundingMode: string
{
    case HalfUp = 'HALF_UP';
    case HalfEven = 'HALF_EVEN';
    case HalfDown = 'HALF_DOWN';
    case Up = 'UP';
    case Down = 'DOWN';

    public function toBrick(): BrickRoundingMode
    {
        return match ($this) {
            self::HalfUp => BrickRoundingMode::HalfUp,
            self::HalfEven => BrickRoundingMode::HalfEven,
            self::HalfDown => BrickRoundingMode::HalfDown,
            self::Up => BrickRoundingMode::Up,
            self::Down => BrickRoundingMode::Down,
        };
    }
}
