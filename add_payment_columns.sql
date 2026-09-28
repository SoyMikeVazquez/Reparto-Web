-- Migration: Add payment gateway API columns to Empresa table
-- Supports Mercado Pago and Clip, with test and production keys per company

ALTER TABLE "Empresa"
ADD COLUMN IF NOT EXISTS "mp_public_key_test" text,
ADD COLUMN IF NOT EXISTS "mp_access_token_test" text,
ADD COLUMN IF NOT EXISTS "mp_public_key_prod" text,
ADD COLUMN IF NOT EXISTS "mp_access_token_prod" text,
ADD COLUMN IF NOT EXISTS "clip_api_key_test" text,
ADD COLUMN IF NOT EXISTS "clip_api_key_prod" text,
ADD COLUMN IF NOT EXISTS "payment_mode" text DEFAULT 'test';

-- Add a comment for documentation
COMMENT ON COLUMN "Empresa"."mp_public_key_test" IS 'Mercado Pago Public Key - Test environment';
COMMENT ON COLUMN "Empresa"."mp_access_token_test" IS 'Mercado Pago Access Token - Test environment';
COMMENT ON COLUMN "Empresa"."mp_public_key_prod" IS 'Mercado Pago Public Key - Production environment';
COMMENT ON COLUMN "Empresa"."mp_access_token_prod" IS 'Mercado Pago Access Token - Production environment';
COMMENT ON COLUMN "Empresa"."clip_api_key_test" IS 'Clip API Key - Test environment';
COMMENT ON COLUMN "Empresa"."clip_api_key_prod" IS 'Clip API Key - Production environment';
COMMENT ON COLUMN "Empresa"."payment_mode" IS 'Active payment mode: test or production';
