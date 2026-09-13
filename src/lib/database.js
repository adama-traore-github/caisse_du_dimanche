import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../utils/security.js';

// Configuration Supabase
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Configuration Neon Database
const neonDbUrl = import.meta.env?.VITE_NEON_DATABASE_URL || import.meta.env?.VITE_DATABASE_URL || '';
export const isNeonConfigured = Boolean(neonDbUrl);
export const neonSql = isNeonConfigured ? neon(neonDbUrl) : null;

const LOCAL_STORAGE_KEY = 'caisse_du_dimanche_demo_transactions';
const AUTH_SESSION_KEY = 'caisse_du_dimanche_user_session';
const MODE_DEMO_KEY = 'caisse_du_dimanche_mode_demo';

// Initialiser le mode démo par défaut pour les visiteurs anonymes
if (localStorage.getItem(MODE_DEMO_KEY) === null) {
  localStorage.setItem(MODE_DEMO_KEY, 'true');
}

export function isDemoMode() {
  return localStorage.getItem(MODE_DEMO_KEY) === 'true';
}

export function setDemoMode(enable) {
  localStorage.setItem(MODE_DEMO_KEY, enable ? 'true' : 'false');
}

export function getCurrentUserSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUserSession(user) {
  if (user) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

export function getActiveStorageProvider() {
  if (isDemoMode()) return 'Mode Démo (Local Storage)';
  if (isNeonConfigured) return 'Neon Postgres (Production)';
  if (isSupabaseConfigured) return 'Supabase Cloud (Production)';
  return 'Local Storage';
}

/**
 * Connexion Trésorier via Nom d'utilisateur et Mot de passe
 */
export async function loginUser(username, password) {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    throw new Error('Veuillez entrer un nom d\'utilisateur et un mot de passe.');
  }

  if (isNeonConfigured && neonSql) {
    try {
      const hashedPassword = await hashPassword(cleanPassword);
      const rows = await neonSql`
        SELECT id, nom, nom_utilisateur, est_valide
        FROM utilisateurs_autorises
        WHERE LOWER(nom_utilisateur) = ${cleanUsername} 
          AND (mot_de_passe = ${cleanPassword} OR mot_de_passe = ${hashedPassword})
        LIMIT 1
      `;

      if (rows.length === 0) {
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect.');
      }

      const user = rows[0];
      if (!user.est_valide) {
        throw new Error('Votre compte est en attente de validation par l\'administrateur sur Neon.');
      }

      setDemoMode(false);
      setCurrentUserSession(user);
      return user;
    } catch (e) {
      throw new Error(e.message || 'Erreur lors de la connexion.');
    }
  }

  // Fallback hors-ligne local si pas de Neon
  if (cleanUsername === 'admin' && cleanPassword === 'admin123') {
    const defaultAdmin = { id: 'local-admin', nom: 'Trésorier Local', nom_utilisateur: 'admin', est_valide: true };
    setDemoMode(false);
    setCurrentUserSession(defaultAdmin);
    return defaultAdmin;
  }

  throw new Error('Nom d\'utilisateur ou mot de passe incorrect.');
}

/**
 * Demande de création de compte
 */
export async function registerUserRequest(nom, username, password) {
  const cleanNom = nom.trim();
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanNom || !cleanUsername || !cleanPassword) {
    throw new Error('Veuillez remplir tous les champs.');
  }

  if (isNeonConfigured && neonSql) {
    try {
      await neonSql`
        INSERT INTO utilisateurs_autorises (nom, nom_utilisateur, mot_de_passe, est_valide)
        VALUES (${cleanNom}, ${cleanUsername}, ${cleanPassword}, false)
      `;
      return 'Demande d\'accès enregistrée avec succès. Votre compte sera activé par l\'administrateur dans Neon.';
    } catch (e) {
      if (e.message.includes('unique') || e.message.includes('already exists')) {
        throw new Error('Ce nom d\'utilisateur est déjà pris.');
      }
      throw new Error(`Échec de la demande : ${e.message}`);
    }
  }

  return 'Mode local : Demande enregistrée localement.';
}

/**
 * Récupère toutes les transactions enregistrées
 */
export async function fetchTransactions() {
  if (isDemoMode()) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  if (isNeonConfigured && neonSql) {
    try {
      const rows = await neonSql`
        SELECT id, date_dimanche, argent_collecte, argent_remis, remis_a, note, created_at, updated_at
        FROM transactions_dimanche
        ORDER BY date_dimanche DESC
      `;
      return rows.map(r => ({
        ...r,
        argent_collecte: Number(r.argent_collecte) || 0,
        argent_remis: Number(r.argent_remis) || 0
      }));
    } catch (e) {
      console.error('Erreur Neon fetchTransactions:', e);
      throw new Error(`Erreur Neon Database: ${e.message}`);
    }
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('transactions_dimanche')
      .select('*')
      .order('date_dimanche', { ascending: false });

    if (error) throw new Error(`Erreur Supabase: ${error.message}`);
    return data || [];
  }

  return [];
}

/**
 * Enregistre ou met à jour une transaction
 */
export async function saveTransaction(transactionData) {
  const payload = {
    date_dimanche: transactionData.date_dimanche,
    argent_collecte: Number(transactionData.argent_collecte) || 0,
    argent_remis: Number(transactionData.argent_remis) || 0,
    remis_a: (transactionData.remis_a || '').trim(),
    note: (transactionData.note || '').trim()
  };

  if (isDemoMode()) {
    const list = await fetchTransactions();
    const existingIndex = list.findIndex(t => t.date_dimanche === payload.date_dimanche);
    
    let savedItem;
    if (existingIndex >= 0) {
      savedItem = { ...list[existingIndex], ...payload, updated_at: new Date().toISOString() };
      list[existingIndex] = savedItem;
    } else {
      savedItem = { id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...payload };
      list.push(savedItem);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    return savedItem;
  }

  if (isNeonConfigured && neonSql) {
    try {
      const rows = await neonSql`
        INSERT INTO transactions_dimanche (date_dimanche, argent_collecte, argent_remis, remis_a, note, updated_at)
        VALUES (${payload.date_dimanche}, ${payload.argent_collecte}, ${payload.argent_remis}, ${payload.remis_a}, ${payload.note}, NOW())
        ON CONFLICT (date_dimanche) DO UPDATE SET
          argent_collecte = EXCLUDED.argent_collecte,
          argent_remis = EXCLUDED.argent_remis,
          remis_a = EXCLUDED.remis_a,
          note = EXCLUDED.note,
          updated_at = NOW()
        RETURNING *
      `;
      return rows[0];
    } catch (e) {
      throw new Error(`Échec de sauvegarde Neon Postgres: ${e.message}`);
    }
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('transactions_dimanche')
      .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'date_dimanche' })
      .select()
      .single();

    if (error) throw new Error(`Échec de sauvegarde Supabase: ${error.message}`);
    return data;
  }

  throw new Error('Aucun mode de stockage valide configuré.');
}

/**
 * Supprime la transaction d'un dimanche
 */
export async function deleteTransaction(dateDimanche) {
  if (isDemoMode()) {
    const list = await fetchTransactions();
    const filtered = list.filter(t => t.date_dimanche !== dateDimanche);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    return;
  }

  if (isNeonConfigured && neonSql) {
    await neonSql`DELETE FROM transactions_dimanche WHERE date_dimanche = ${dateDimanche}`;
    return;
  }

  if (isSupabaseConfigured && supabase) {
    await supabase.from('transactions_dimanche').delete().eq('date_dimanche', dateDimanche);
    return;
  }
}

/**
 * Remet toutes les données de caisse à zéro (Vide la base démo et Postgres)
 */
export async function clearAllTransactionsData() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem('caisse_last_treasurer');

  if (isNeonConfigured && neonSql) {
    try {
      await neonSql`TRUNCATE TABLE transactions_dimanche`;
    } catch (e) {
      console.error('Erreur réinitialisation Neon:', e);
    }
  }
}
