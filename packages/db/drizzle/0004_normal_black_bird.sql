CREATE TABLE IF NOT EXISTS "movimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"planilla_id" uuid NOT NULL,
	"colaborador_id" uuid NOT NULL,
	"concepto_codigo" text NOT NULL,
	"cantidad" numeric(18, 6),
	"monto" numeric(18, 6),
	"nota" text,
	"origen" text DEFAULT 'manual' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid
);
--> statement-breakpoint
ALTER TABLE "concepto" ADD COLUMN "unidad" text DEFAULT 'monto' NOT NULL;--> statement-breakpoint
ALTER TABLE "concepto" ADD COLUMN "base_legal" text NOT NULL;--> statement-breakpoint
ALTER TABLE "concepto" ADD COLUMN "confianza" text NOT NULL;--> statement-breakpoint
ALTER TABLE "empresa" ADD COLUMN "metodo_prorrateo" text DEFAULT 'mitad_mensual' NOT NULL;--> statement-breakpoint
ALTER TABLE "empresa" ADD COLUMN "horas_mensuales" text DEFAULT '208' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_planilla_id_planilla_cabecera_id_fk" FOREIGN KEY ("planilla_id") REFERENCES "public"."planilla_cabecera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_colaborador_id_colaborador_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaborador"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "concepto" ADD CONSTRAINT "ux_concepto_vigencia" UNIQUE NULLS NOT DISTINCT("jurisdiccion_id","empresa_id","codigo","vigente_desde");