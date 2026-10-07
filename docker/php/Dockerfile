FROM php:8.5-fpm-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev libicu-dev libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql bcmath intl gd zip pcntl \
    && pecl install redis-6.3.0 \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY docker/php/local.ini /usr/local/etc/php/conf.d/nomix.ini
COPY docker/php/entrypoint.sh /usr/local/bin/nomix-entrypoint
RUN chmod +x /usr/local/bin/nomix-entrypoint

WORKDIR /var/www/html
ENTRYPOINT ["nomix-entrypoint"]
CMD ["php-fpm"]
