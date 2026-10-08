<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Solo catálogos globales. Los datos ficticios de empresas y colaboradores llegan en H2.
        $this->call(ParametrosLegalesSeeder::class);
    }
}
