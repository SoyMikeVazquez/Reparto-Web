-- =======================================================
-- MIGRACIÓN: Agregar campo Google Maps Link a Sucursales 
-- y campos de Dirección y Descripción a Empresa
-- Ejecutar en el SQL Editor de Supabase
-- =======================================================

-- 1. Agregar columna LinkGoogleMaps a la tabla Sucursales
ALTER TABLE public."Sucursales" 
ADD COLUMN IF NOT EXISTS "LinkGoogleMaps" text NULL;

-- 2. Agregar columnas DescripcionEmpresa y DireccionEmpresa a la tabla Empresa
ALTER TABLE public."Empresa" 
ADD COLUMN IF NOT EXISTS "DescripcionEmpresa" text NULL,
ADD COLUMN IF NOT EXISTS "DireccionEmpresa" text NULL;
