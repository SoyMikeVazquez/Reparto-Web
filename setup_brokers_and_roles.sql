-- =======================================================
-- MIGRACIÓN PARA NUEVA ESTRUCTURA DE BROKERS Y REPARTIDORES
-- Ejecutar en el SQL Editor de Supabase
-- =======================================================

-- 1. Tabla de Brokers
CREATE TABLE IF NOT EXISTS public.brokers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    empresas_asociadas jsonb DEFAULT '[]'::jsonb, -- Arreglo JSON con los IDs de las empresas
    repartidores_asociados jsonb DEFAULT '[]'::jsonb, -- Arreglo JSON con los IDs de los repartidores
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Repartidores
CREATE TABLE IF NOT EXISTS public.repartidores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    broker_id uuid REFERENCES public.brokers(id) ON DELETE SET NULL, -- ID del Broker asignado
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    vehicle_photos jsonb DEFAULT '[]'::jsonb, -- Arreglo de URLs de fotos del vehículo
    driver_photos jsonb DEFAULT '[]'::jsonb, -- Arreglo de URLs de fotos del repartidor
    reviews jsonb DEFAULT '[]'::jsonb, -- Arreglo de reseñas/calificaciones
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS para las nuevas tablas
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso total público (Puedes restringir esto luego si lo necesitas)
DO $$
BEGIN
    -- brokers
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brokers' AND policyname = 'Permitir acceso total a brokers') THEN
        CREATE POLICY "Permitir acceso total a brokers" ON public.brokers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- repartidores
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repartidores' AND policyname = 'Permitir acceso total a repartidores') THEN
        CREATE POLICY "Permitir acceso total a repartidores" ON public.repartidores FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
