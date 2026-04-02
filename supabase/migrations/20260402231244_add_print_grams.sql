ALTER TABLE "public"."full_landed_costs"
ADD COLUMN IF NOT EXISTS "print_grams" numeric DEFAULT 0;
