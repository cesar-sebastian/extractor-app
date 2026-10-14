CREATE TYPE "public"."estado_extraccion" AS ENUM('completada', 'fallida');--> statement-breakpoint
CREATE TABLE "extracciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"texto_entrada" text,
	"salida" jsonb,
	"estado" "estado_extraccion" NOT NULL,
	"error_schema" text,
	"prompt_version" text NOT NULL,
	"model_id" text NOT NULL,
	"tokens_entrada" integer NOT NULL,
	"tokens_salida" integer NOT NULL,
	"duracion_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "extracciones" ADD CONSTRAINT "extracciones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracciones" ADD CONSTRAINT "extracciones_parent_id_extracciones_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."extracciones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extracciones_user_id_created_at_idx" ON "extracciones" USING btree ("user_id","created_at");