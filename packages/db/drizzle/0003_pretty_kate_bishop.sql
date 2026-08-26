CREATE TABLE IF NOT EXISTS "planilla_cabecera" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"periodo_desde" date NOT NULL,
	"periodo_hasta" date NOT NULL,
	"fecha_pago" date,
	"estado" text DEFAULT 'borrador' NOT NULL,
	"totales" jsonb,
	"calculada_en" timestamp with time zone,
	"aprobada_en" timestamp with time zone,
	"aprobada_por" uuid,
	"cerrada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planilla_detalle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"planilla_id" uuid NOT NULL,
	"colaborador_id" uuid NOT NULL,
	"concepto_codigo" text NOT NULL,
	"tipo" text NOT NULL,
	"cantidad" numeric(18, 6),
	"base" numeric(18, 6),
	"monto" numeric(18, 6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planilla_traza" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"detalle_id" uuid NOT NULL,
	"regla_codigo" text NOT NULL,
	"base_aplicada" numeric(18, 6),
	"tasa_aplicada" text,
	"resultado" numeric(18, 6),
	"articulo_legal" text,
	"calculado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planilla_cabecera" ADD CONSTRAINT "planilla_cabecera_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planilla_detalle" ADD CONSTRAINT "planilla_detalle_planilla_id_planilla_cabecera_id_fk" FOREIGN KEY ("planilla_id") REFERENCES "public"."planilla_cabecera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planilla_detalle" ADD CONSTRAINT "planilla_detalle_colaborador_id_colaborador_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaborador"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planilla_traza" ADD CONSTRAINT "planilla_traza_detalle_id_planilla_detalle_id_fk" FOREIGN KEY ("detalle_id") REFERENCES "public"."planilla_detalle"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
