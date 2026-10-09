param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('env', 'up', 'setup', 'lint', 'test', 'down', 'status')]
    [string] $Task
)

$ErrorActionPreference = 'Stop'

function Invoke-Docker {
    & docker @args
    if ($LASTEXITCODE -ne 0) {
        throw "Docker termino con codigo $LASTEXITCODE."
    }
}

function Initialize-Environment {
    Invoke-Docker run --rm --mount "type=bind,source=$PSScriptRoot,target=/workspace" -w /workspace node:24-bookworm-slim node docker/init-env.mjs
}

Push-Location $PSScriptRoot
try {
    switch ($Task) {
        'env' { Initialize-Environment }
        'up' {
            Initialize-Environment
            Invoke-Docker compose build app
            Invoke-Docker compose up -d --wait postgres redis mailpit
        }
        'setup' {
            Invoke-Docker compose run --rm --no-deps app composer install --no-interaction --prefer-dist
            Invoke-Docker compose run --rm --no-deps migrate
            Invoke-Docker compose run --rm --no-deps frontend npm ci
            Invoke-Docker compose up -d --wait app nginx frontend horizon
        }
        'lint' {
            Invoke-Docker compose config --quiet
            Invoke-Docker compose run --rm --no-deps app composer validate --strict
            Invoke-Docker compose run --rm --no-deps app composer lint
            Invoke-Docker compose run --rm --no-deps frontend npm run lint
            Invoke-Docker compose run --rm --no-deps frontend npm run typecheck
        }
        'test' {
            Invoke-Docker compose run --rm --no-deps app composer test
            Invoke-Docker compose run --rm --no-deps app composer mutate
            Invoke-Docker compose run --rm --no-deps checks
            Invoke-Docker compose exec -T horizon php artisan horizon:status
            Invoke-Docker compose run --rm --no-deps frontend npm test
            Invoke-Docker compose run --rm --no-deps frontend npm run test:integration
            Invoke-Docker compose run --rm --no-deps frontend npm run build
        }
        'down' { Invoke-Docker compose down --remove-orphans }
        'status' { Invoke-Docker compose ps }
    }
} finally {
    Pop-Location
}
