COMPOSE := docker compose

.PHONY: env up setup lint test down status

env:
	docker run --rm --mount "type=bind,source=$(CURDIR),target=/workspace" -w /workspace node:24-bookworm-slim node docker/init-env.mjs

up: env
	$(COMPOSE) build app
	$(COMPOSE) up -d --wait postgres redis mailpit

setup:
	$(COMPOSE) run --rm --no-deps app composer install --no-interaction --prefer-dist
	$(COMPOSE) run --rm --no-deps migrate
	$(COMPOSE) run --rm --no-deps frontend npm ci
	$(COMPOSE) up -d --wait app nginx frontend horizon

lint:
	$(COMPOSE) config --quiet
	$(COMPOSE) run --rm --no-deps app composer validate --strict
	$(COMPOSE) run --rm --no-deps app composer lint
	$(COMPOSE) run --rm --no-deps frontend npm run lint
	$(COMPOSE) run --rm --no-deps frontend npm run typecheck

test:
	$(COMPOSE) run --rm --no-deps app composer test
	$(COMPOSE) run --rm --no-deps app composer mutate
	$(COMPOSE) run --rm --no-deps checks
	$(COMPOSE) exec -T horizon php artisan horizon:status
	$(COMPOSE) run --rm --no-deps frontend npm test
	$(COMPOSE) run --rm --no-deps frontend npm run test:integration
	$(COMPOSE) run --rm --no-deps frontend npm run build

down:
	$(COMPOSE) down --remove-orphans

status:
	$(COMPOSE) ps
