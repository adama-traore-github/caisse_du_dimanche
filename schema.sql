-- Schema SQL pour la base de données "Caisse du Dimanche" (Neon Postgres / Supabase)

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

-- Table des utilisateurs trésoriers autorisés
CREATE TABLE IF NOT EXISTS public.utilisateurs_autorises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT NOT NULL,
    nom_utilisateur TEXT NOT NULL UNIQUE,
    mot_de_passe TEXT NOT NULL,
    est_valide BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexation pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions_dimanche (date_dimanche DESC);
