# ⛪ Caisse du Dimanche

Application web responsive et sécurisée conçue pour le suivi, la collecte et la remise des dons du dimanche, avec gestion des bilans mensuels et exportations.

---

## 🌟 Fonctionnalités Principales

- **📅 Dimanches & Saisie (Onglet par défaut)** :
  - Génération automatique des dimanches depuis le premier dimanche de septembre.
  - Saisie de l'argent collecté et de l'argent remis au trésorier/gardien de l'argent.
  - Calcul d'écart et de solde en temps réel pour chaque dimanche.

- **📊 Synthèse Générale** :
  - Vue d'ensemble avec 3 cartes principales : **Total Collecté**, **Total Remis**, et **Reste en Caisse**.
  - Aperçu rapide de la dernière saisie effectuée.

- **📋 Bilan Mensuel** :
  - Filtrage des données par mois (Septembre, Octobre, etc.).
  - Tableau récapitulatif détaillé avec ligne de totalisation du mois.
  - Exportation des bilans au format **CSV** (UTF-8).
  - Impression et génération de rapport au format **PDF** via une feuille de style d'impression optimisée.

- **🔐 Sécurité & Accès** :
  - Confirmation par **Code PIN Trésorerie** (par défaut : `1234`) pour toute saisie ou modification.
  - Conçu pour 2 à 3 responsables de caisse.

- **⚡ Mode Hybride Neon / Supabase / LocalStorage** :
  - **Support Neon Postgres** : Intégration du driver officiel `@neondatabase/serverless`.
  - **Support Supabase** : Client Supabase PostgreSQL avec règles **Row Level Security (RLS)**.
  - **Fallback Local** : Fonctionne immédiatement en mode local via `localStorage` si aucune base de données distante n'est configurée.

---

## 🛠️ Stack Technique

- **Frontend** : Vite + Vanilla JavaScript (ES6 Modules)
- **Styling** : CSS Vanilla moderne (Variables CSS, Thème sombre, Glassmorphic, Mobile-First)
- **Base de données / Backend** : Neon Serverless Postgres (`@neondatabase/serverless`) / Supabase (`@supabase/supabase-js`)
- **CI/CD & Hébergement** : GitHub Actions + GitHub Pages

---

## 🚀 Installation et Exécution en Local

```bash
# 1. Cloner le projet
git clone https://github.com/votre-compte/caisse_du_dimanche.git
cd caisse_du_dimanche

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev

# 4. Générer le build de production
npm run build
```

---

## 🔒 Configuration de la Base de Données

### Option 1 : Base de Données Neon Postgres (Recommandé)

1. Dans le tableau de bord Neon, ouvrez votre projet **`caisse_du_dimanche`**.
2. Allez dans **SQL Editor** et exécutez le script SQL présent dans [`schema.sql`](./schema.sql).
3. Ajoutez votre chaîne de connexion dans le fichier `.env` :

```env
VITE_NEON_DATABASE_URL=postgres://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Option 2 : Base de Données Supabase

Dans votre fichier `.env` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

---

## 🚀 Déploiement Automatique sur GitHub Pages

Le projet intègre un workflow GitHub Actions dans [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

1. Poussez le code sur la branche `main` :
   ```bash
   git add .
   git commit -m "feat: intégration du support Neon Postgres et mise à jour"
   git push origin main
   ```
2. Dans votre dépôt GitHub, allez dans **Settings > Pages > Source** et choisissez **GitHub Actions**.
3. Ajoutez `VITE_NEON_DATABASE_URL` (ou vos clés Supabase) dans les **Secrets GitHub** (`Settings > Secrets and variables > Actions`).
