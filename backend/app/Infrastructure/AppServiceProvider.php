<?php

declare(strict_types=1);

namespace App\Infrastructure;

use App\Domain\Shared\Legal\LegalParametersRepository;
use App\Infrastructure\Legal\DatabaseLegalParametersRepository;
use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(LegalParametersRepository::class, DatabaseLegalParametersRepository::class);
    }

    public function boot(): void
    {
        // El panel requiere autenticación y Policies en NMX-020/021.
        Horizon::auth(static fn () => false);
    }
}
