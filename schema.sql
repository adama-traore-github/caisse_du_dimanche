-- Schema SQL pour la base de données "Caisse du Dimanche" (Supabase / PostgreSQL)

CREATE TABLE IF NOT EXISTS public.transactions_dimanche (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date_dimanche DATE NOT NULL UNIQUE,
    argent_collecte NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (argent_collecte >= 0),
    argent_remis NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (argent_remis >= 0),
    remis_a TEXT NOT NULL DEFAULT '',
    note TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexation pour recherche rapide par date
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions_dimanche (date_dimanche DESC);

-- Activation du Row Level Security (RLS)
ALTER TABLE public.transactions_dimanche ENABLE ROW LEVEL SECURITY;

-- Politique : Lecture autorisée pour tout utilisateur ayant la clé anon
CREATE POLICY "Permettre la lecture publique"
    ON public.transactions_dimanche
    FOR SELECT
    USING (true);

-- Politique : Insertion/Modification autorisée pour les utilisateurs authentifiés ou avec rôle valide
CREATE POLICY "Permettre la modification aux utilisateurs autorisés"
    ON public.transactions_dimanche
    FOR ALL
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (argent_collecte >= 0 AND argent_remis >= 0);
