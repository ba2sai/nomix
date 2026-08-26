CREATE TABLE IF NOT EXISTS "concepto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiccion_id" text DEFAULT 'PA' NOT NULL,
	"empresa_id" uuid,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"incide_css" boolean NOT NULL,
	"tasa_css_especial" numeric(8, 6),
	"incide_seguro_educativo" boolean NOT NULL,
	"incide_isr" boolean NOT NULL,
	"regimen_isr" text NOT NULL,
	"incide_base_xiii" boolean NOT NULL,
	"incide_promedio_vacaciones" boolean NOT NULL,
	"incide_base_liquidacion" boolean NOT NULL,
	"es_inembargable" boolean NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre_comercial" text NOT NULL,
	"razon_social" text NOT NULL,
	"ruc" text,
	"dv" text,
	"numero_patronal" text,
	"actividad_ciiu" text,
	"region_salario_minimo" text,
	"tamano_empresa" text,
	"cantidad_trabajadores" text,
	"tasa_riesgo_profesional" numeric(6, 4),
	"paga_aguinaldo_acostumbrado" boolean DEFAULT false NOT NULL,
	"jurisdiccion_id" text DEFAULT 'PA' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evento_saliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"payload" jsonb NOT NULL,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"publicado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regla" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiccion_id" text DEFAULT 'PA' NOT NULL,
	"empresa_id" uuid,
	"codigo" text NOT NULL,
	"valor" jsonb NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date,
	"conocido_desde" timestamp with time zone DEFAULT now() NOT NULL,
	"base_legal" text NOT NULL,
	"confianza" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuario_empresa" (
	"usuario_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"rol" text NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date,
	CONSTRAINT "usuario_empresa_usuario_id_empresa_id_vigente_desde_pk" PRIMARY KEY("usuario_id","empresa_id","vigente_desde")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "concepto" ADD CONSTRAINT "concepto_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regla" ADD CONSTRAINT "regla_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario_empresa" ADD CONSTRAINT "usuario_empresa_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario_empresa" ADD CONSTRAINT "usuario_empresa_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
