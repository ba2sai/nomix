<?php

declare(strict_types=1);

it('responde el estado de la API', function (): void {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertExactJson(['status' => 'ok', 'service' => 'nomix-api']);
});
