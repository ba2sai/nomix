<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * parametros_legales (docs/nomix/06 §3): tasas, montos y tablas del catálogo legal con
 * vigencia. Es una tabla global, sin empresa_id ni RLS: los parámetros son los mismos
 * para todas las empresas. Los valores los carga ParametrosLegalesSeeder.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parametros_legales', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('codigo');
            $table->text('rule_id');
            $table->decimal('valor', 14, 6)->nullable();
            $table->jsonb('valor_json')->nullable();
            // Sin inicio = vigente desde antes de lo documentado; sin fin = vigente hoy.
            $table->date('vigente_desde')->nullable();
            $table->date('vigente_hasta')->nullable();
            $table->text('estado_verificacion');
            $table->text('fuente');
            $table->timestampsTz();
        });

        DB::statement(<<<'SQL'
            ALTER TABLE parametros_legales
                ADD CONSTRAINT parametros_legales_rule_id_check
                    CHECK (rule_id ~ '^RULE-[0-9]{3}$'),
                ADD CONSTRAINT parametros_legales_estado_verificacion_check
                    CHECK (estado_verificacion IN ('CONFIRMADO_SECUNDARIO', 'PARCIAL', 'PENDIENTE', 'VALIDADO')),
                ADD CONSTRAINT parametros_legales_valor_o_tabla_check
                    CHECK ((valor IS NULL) <> (valor_json IS NULL)),
                ADD CONSTRAINT parametros_legales_vigencia_check
                    CHECK (vigente_desde IS NULL OR vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),
                -- Dos vigencias del mismo código no pueden cruzarse (btree_gist viene del init de PostgreSQL).
                ADD CONSTRAINT parametros_legales_vigencia_sin_cruce
                    EXCLUDE USING gist (codigo WITH =, daterange(vigente_desde, vigente_hasta, '[]') WITH &&)
        SQL);

        // Identidad de cada fila para el seeder; NULLS NOT DISTINCT trata "sin inicio" como un valor.
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX parametros_legales_codigo_vigente_desde_unique
                ON parametros_legales (codigo, vigente_desde) NULLS NOT DISTINCT
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('parametros_legales');
    }
};
