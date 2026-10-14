ALTER TYPE "estado_extraccion" RENAME TO "extraction_status";--> statement-breakpoint
ALTER TYPE "extraction_status" RENAME VALUE 'completada' TO 'completed';--> statement-breakpoint
ALTER TYPE "extraction_status" RENAME VALUE 'fallida' TO 'failed';--> statement-breakpoint
ALTER TABLE "extracciones" RENAME TO "extractions";--> statement-breakpoint
ALTER TABLE "extractions" RENAME COLUMN "texto_entrada" TO "input_text";--> statement-breakpoint
ALTER TABLE "extractions" RENAME COLUMN "salida" TO "output";--> statement-breakpoint
ALTER TABLE "extractions" RENAME COLUMN "estado" TO "status";--> statement-breakpoint
ALTER TABLE "extractions" RENAME COLUMN "tokens_entrada" TO "input_tokens";--> statement-breakpoint
ALTER TABLE "extractions" RENAME COLUMN "tokens_salida" TO "output_tokens";--> statement-breakpoint
ALTER TABLE "extractions" RENAME COLUMN "duracion_ms" TO "duration_ms";--> statement-breakpoint
ALTER TABLE "extractions" RENAME CONSTRAINT "extracciones_user_id_users_id_fk" TO "extractions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "extractions" RENAME CONSTRAINT "extracciones_parent_id_extracciones_id_fk" TO "extractions_parent_id_extractions_id_fk";--> statement-breakpoint
ALTER INDEX "extracciones_user_id_created_at_idx" RENAME TO "extractions_user_id_created_at_idx";--> statement-breakpoint
UPDATE "extractions"
SET "output" = (
  jsonb_build_object(
    'summary', "output" -> 'resumen',
    'category', CASE "output" ->> 'categoria'
      WHEN 'facturacion' THEN 'billing'
      WHEN 'envio' THEN 'shipping'
      WHEN 'producto' THEN 'product'
      WHEN 'cuenta' THEN 'account'
      WHEN 'otro' THEN 'other'
      ELSE "output" ->> 'categoria'
    END,
    'urgency', CASE "output" ->> 'urgencia'
      WHEN 'baja' THEN 'low'
      WHEN 'media' THEN 'medium'
      WHEN 'alta' THEN 'high'
      ELSE "output" ->> 'urgencia'
    END,
    'request', "output" -> 'pedido',
    'orderNumber', "output" -> 'numeroDeOrden',
    'confidence', CASE "output" ->> 'confianza'
      WHEN 'baja' THEN 'low'
      WHEN 'media' THEN 'medium'
      WHEN 'alta' THEN 'high'
      ELSE "output" ->> 'confianza'
    END,
    'uncertainties', "output" -> 'incertidumbres'
  )
)
WHERE "output" IS NOT NULL AND "output" ? 'resumen';
