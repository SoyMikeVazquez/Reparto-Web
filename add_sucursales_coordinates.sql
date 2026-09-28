-- =======================================================
-- MIGRACIÓN: Agregar columnas Latitud y Longitud a la tabla Sucursales
-- Ejecutar en el SQL Editor de Supabase
-- =======================================================

ALTER TABLE public."Sucursales" 
ADD COLUMN IF NOT EXISTS "Latitud" double precision NULL, 
ADD COLUMN IF NOT EXISTS "Longitud" double precision NULL;
