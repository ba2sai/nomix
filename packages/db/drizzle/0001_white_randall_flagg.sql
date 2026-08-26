CREATE TABLE IF NOT EXISTS "colaborador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cod_empleado" text NOT NULL,
	"nombres" text NOT NULL,
	"apellidos" text NOT NULL,
	"tipo_documento" text NOT NULL,
	"id_cifrado" text NOT NULL,
	"id_bidx" text NOT NULL,
	"sexo" text,
	"fecha_nacimiento" date,
	"tipo_contrato" text NOT NULL,
	"tipo_planilla" text NOT NULL,
	"fecha_ingreso" date NOT NULL,
	"fecha_termino" date,
	"es_tecnico" boolean DEFAULT false NOT NULL,
	"salario_mensual" numeric(18, 6) NOT NULL,
	"status" text DEFAULT 'activo' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "colaborador" ADD CONSTRAINT "colaborador_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_colaborador_empresa_cod" ON "colaborador" USING btree ("empresa_id","cod_empleado");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_colaborador_empresa_idbidx" ON "colaborador" USING btree ("empresa_id","id_bidx");