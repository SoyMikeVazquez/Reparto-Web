-- =======================================================
-- MIGRACIÓN: Agregar columnas lat/lng a la tabla ordenes
-- Ejecutar en el SQL Editor de Supabase
-- =======================================================

ALTER TABLE public.ordenes 
ADD COLUMN IF NOT EXISTS lat double precision NULL, 
ADD COLUMN IF NOT EXISTS lng double precision NULL;
