-- Tabela de Funcionários
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    funcao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS public.documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL,
    data_vencimento DATE,
    status_permanente TEXT, -- Para armazenar 'APT' ou similar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso simplificadas (Ajustar conforme a necessidade de permissões por usuário)
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.funcionarios
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir tudo para usuários autenticados" ON public.documentos
    FOR ALL USING (auth.role() = 'authenticated');
