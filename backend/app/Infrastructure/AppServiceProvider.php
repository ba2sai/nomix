<?php

declare(strict_types=1);

namespace App\Infrastructure;

use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // El panel requiere autenticación y Policies en NMX-020/021.
        Horizon::auth(static fn () => false);
    }
}
