
import { createClient } from '@supabase/supabase-js';

/**
 * ==============================================================================
 * 🚨 COMANDO PARA CORRIGIR O ERRO DE SALVAMENTO (PGRST204) 🚨
 * ==============================================================================
 * 
 * Acesse o Dashboard do Supabase -> SQL Editor -> New Query e execute:
 * 
 * ALTER TABLE public.crane_assets ADD COLUMN IF NOT EXISTS equipment_type text DEFAULT 'Ponte';
 * 
 * ==============================================================================
 */

/**
 * SCRIPT SQL COMPLETO PARA REFERÊNCIA:
 * 
 * CREATE TABLE IF NOT EXISTS public.user_profiles (
 *   id text PRIMARY KEY,
 *   name text NOT NULL,
 *   email text UNIQUE NOT NULL,
 *   role text NOT NULL CHECK (role IN ('ADMIN', 'TECNICO')),
 *   password text NOT NULL
 * );
 * 
 * CREATE TABLE IF NOT EXISTS public.crane_assets (
 *   id text PRIMARY KEY,
 *   client text NOT NULL,
 *   name text NOT NULL,
 *   serial_number text NOT NULL,
 *   manufacturer text,
 *   capacity text,
 *   span text,
 *   location text,
 *   commissioning_date text,
 *   status text DEFAULT 'OPERACIONAL',
 *   equipment_type text DEFAULT 'Ponte'
 * );
 * 
 * ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Leitura pública para login" ON public.user_profiles FOR SELECT USING (true);
 * CREATE POLICY "Inserção de usuários" ON public.user_profiles FOR INSERT WITH CHECK (true);
 * 
 * ALTER TABLE public.crane_assets ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Acesso total ativos" ON public.crane_assets FOR ALL USING (true);
 * 
 * CREATE TABLE IF NOT EXISTS public.maintenance_records (
 *   id text PRIMARY KEY,
 *   inspection_number integer,
 *   asset_id text REFERENCES public.crane_assets(id),
 *   type text NOT NULL,
 *   checklist_type text,
 *   frequency text,
 *   date text NOT NULL,
 *   technician text,
 *   technician_id text,
 *   downtime_hours numeric,
 *   criticality text,
 *   checklists jsonb,
 *   client_representative text,
 *   signature text
 * );
 * ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Acesso total registros" ON public.maintenance_records FOR ALL USING (true);
 */

const SUPABASE_URL = 'https://tnwbnjksbhskgyqdibsu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uGkKal41PXStrmQHl7bRCQ_iDQcTlYW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
