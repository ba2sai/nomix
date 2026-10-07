#!/bin/sh
set -eu
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
if [ "$(id -u)" = 0 ]; then
    chown -R www-data:www-data storage bootstrap/cache
fi
exec docker-php-entrypoint "$@"
