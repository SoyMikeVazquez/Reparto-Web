-- =======================================================
-- MIGRACIÓN: Agregar columna Tarifas (jsonb) a la tabla Sucursales
-- Ejecutar en el SQL Editor de Supabase
-- =======================================================

-- Agregar columna 'Tarifas' de tipo jsonb con valor por defecto arreglo vacío
ALTER TABLE public."Sucursales" 
ADD COLUMN IF NOT EXISTS "Tarifas" jsonb DEFAULT '[]'::jsonb;

-- Ejemplo de estructura JSON para almacenar las tarifas:
-- [
--   { "min_km": 0.0, "max_km": 3.0, "precio": 40.0 },
--   { "min_km": 3.1, "max_km": 4.0, "precio": 50.0 },
--   { "min_km": 4.1, "max_km": 5.0, "precio": 60.0 },
--   ...
--   { "min_km": 19.1, "max_km": 20.0, "precio": 210.0 },
--   { "km_extra": true, "precio_por_km": 10.0 }
-- ]
