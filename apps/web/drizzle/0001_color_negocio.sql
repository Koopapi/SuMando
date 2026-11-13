-- Spec 002, RF-8 y RF-10: color de cada negocio. Los negocios que ya existían reciben, por orden de alta, el primer
-- color libre de la paleta (con la paleta vacía, el n-ésimo negocio recibe el color n) y el primero si ya no hay libres.
ALTER TABLE "businesses" ADD COLUMN "color" varchar(16);--> statement-breakpoint
UPDATE "businesses" AS b SET "color" = (ARRAY['violeta', 'rojo', 'naranja', 'ambar', 'verde', 'turquesa', 'azul', 'rosa'])[CASE WHEN o.n <= 8 THEN o.n ELSE 1 END]
FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS n FROM "businesses") AS o
WHERE b."id" = o."id";--> statement-breakpoint
ALTER TABLE "businesses" ALTER COLUMN "color" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_color_check" CHECK ("businesses"."color" in ('violeta', 'rojo', 'naranja', 'ambar', 'verde', 'turquesa', 'azul', 'rosa'));
