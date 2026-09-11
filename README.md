# ⛪ Caisse du Dimanche

Application web responsive, hautement sécurisée et optimisée pour le suivi, la collecte et la remise des dons du dimanche, avec gestion des bilans mensuels et exportations.

---

## 🌟 Fonctionnalités Principales

- **📅 Dimanches & Saisie (Onglet par défaut)** :
  - Génération automatique des dimanches depuis le premier dimanche de septembre.
  - Saisie de l'argent collecté, de l'argent remis et du nom du trésorier/gardien de l'argent.
  - **Pré-remplissage intelligent** du nom du dernier trésorier utilisé pour accélérer la saisie.

- **📊 Synthèse Générale** :
  - Vue d'ensemble mobile-first avec 3 cartes principales : **Total Collecté**, **Total Remis**, et **Reste en Caisse**.
  - Aperçu rapide du dernier dimanche enregistré.

- **📋 Bilan Mensuel** :
  - Filtrage des données par mois (Septembre, Octobre, etc.).
  - Tableau récapitulatif avec totalisation du mois.
  - Exportation des bilans au format **CSV** (UTF-8).
  - Impression et rapport **PDF** via une feuille de style d'impression optimisée.

- **👁️ Mode Démo Visiteur & 🔐 Espace Trésorerie** :
  - **Mode Démo (Visiteurs / Testeurs)** : Actif par défaut, permet de tout tester en local (`localStorage`) sans jamais altérer la base de données réelle.
  - **Espace Trésorerie** : Connexion sécurisée sur **Neon Postgres** avec validation des comptes par l'administrateur.

---

## 🛡️ Architecture & Sécurité (OWASP Top 10 & SOLID)

- **Principes SOLID & Performance** :
  - Architecture modulaire basée sur le **Pattern Adapter/Service** (DIP, SRP, OCP, LSP).
  - Taille du bundle réduite de **57%** (de 389 kB à 165 kB).
- **Hachage Cryptographique (OWASP A02)** :
  - Mots de passe hachés via **SHA-256 (WebCrypto API)** avant envoi et stockage.
- **Protection Anti-Injection & XSS (OWASP A03)** :
  - Requêtes SQL paramétrées avec le SDK `@neondatabase/serverless` (0 risque SQLi).
  - Nettoyage et échappement sémantique HTML (`sanitizeText`) sur toutes les entrées.
- **Idempotence & Zéro Requête N+1** :
  - Verrou client `inFlightRequests` empêchant le double-clic simultané.
  - Clause PostgreSQL `ON CONFLICT (date_dimanche) DO UPDATE SET...`.
  - Requête unique en lot (`Single Batch Query`) et accès en mémoire O(1).

---

## 🛠️ Stack Technique

- **Frontend** : Vite + Vanilla JavaScript (ES6 Modules)
- **Styling** : CSS Vanilla moderne (Variables CSS, Thème sombre, Glassmorphic, Mobile-First)
- **Base de données / Backend** : Neon Serverless Postgres (`@neondatabase/serverless`)
- **CI/CD & Hébergement** : GitHub Actions + GitHub Pages

---

## 🚀 Installation et Exécution en Local

```bash
# 1. Cloner le projet
git clone https://github.com/adama-traore-github/caisse_du_dimanche.git
cd caisse_du_dimanche

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev

# 4. Générer le build de production
npm run build
```

---

## 🔒 Configuration de la Base de Données Neon Postgres

1. Dans votre projet **Neon**, allez dans **SQL Editor** et exécutez le script [`schema.sql`](./schema.sql) :

```sql
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

CREATE TABLE IF NOT EXISTS public.utilisateurs_autorises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT NOT NULL,
    nom_utilisateur TEXT NOT NULL UNIQUE,
    mot_de_passe TEXT NOT NULL,
    est_valide BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

2. Créez un fichier `.env` localement :

```env
VITE_NEON_DATABASE_URL=postgres://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## 🚀 Déploiement Automatique sur GitHub Pages

Le workflow GitHub Actions dans [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) compile et publie automatiquement l'application.

1. Poussez votre code :
   ```bash
   git add .
   git commit -m "feat: release version pour production"
   git push origin main
   ```
2. Ajoutez votre URL Neon dans les Secrets de votre dépôt GitHub (**Settings > Secrets and variables > Actions > New repository secret**) sous le nom `VITE_NEON_DATABASE_URL`.
