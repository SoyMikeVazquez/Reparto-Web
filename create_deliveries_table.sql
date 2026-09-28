-- =======================================================
-- MIGRACIÓN COMPLETA PARA LA TABLA deliveries
-- Ejecutar en el SQL Editor de Supabase
-- =======================================================

-- 1. Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.deliveries (
    id text NOT NULL PRIMARY KEY,
    customer text NOT NULL,
    address text NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'assigned', 'transit', 'delivered', 'canceled')),
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    driver_id text NULL,
    items text NOT NULL,
    created_time timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    delivered_time timestamp with time zone NULL,
    "idEmpresa" text NULL,
    order_id text NULL
);

-- 2. Asegurar que las columnas específicas existan (por si la tabla ya existía anteriormente)
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS driver_id text NULL;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS "idEmpresa" text NULL;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS order_id text NULL;

-- 3. Habilitar RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 4. Crear política de acceso total si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'deliveries' AND policyname = 'Permitir acceso total público'
    ) THEN
        CREATE POLICY "Permitir acceso total público" 
        ON public.deliveries 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END
$$;
