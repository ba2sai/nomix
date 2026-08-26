ALTER TABLE "colaborador" ADD COLUMN "estado_civil" text;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "correo" text;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "cargo" text;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "p_probatorio" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "forma_pago" text;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "id_banco" text;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "tipo_cuenta" text;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "cuenta_cifrada" text;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "declara_renta" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "colaborador" ADD COLUMN "gasto_rep" numeric(18, 6);