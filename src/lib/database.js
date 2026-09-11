import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

// Configuration Supabase
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Configuration Neon Database
const neonDbUrl = import.meta.env?.VITE_NEON_DATABASE_URL || import.meta.env?.VITE_DATABASE_URL || '';
export const isNeonConfigured = Boolean(neonDbUrl);
export const neonSql = isNeonConfigured ? neon(neonDbUrl) : null;

const LOCAL_STORAGE_KEY = 'caisse_du_dimanche_transactions';

export function getActiveStorageProvider() {
  if (isNeonConfigured) return 'Neon Postgres';
  if (isSupabaseConfigured) return 'Supabase Cloud';
  return 'Local Storage';
}

/**
 * Récupère toutes les transactions enregistrées
 */
export async function fetchTransactions() {
  // 1. Neon Postgres
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

  // 2. Supabase
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('transactions_dimanche')
      .select('*')
      .order('date_dimanche', { ascending: false });

    if (error) {
      console.error('Erreur Supabase fetchTransactions:', error);
      throw new Error(`Erreur Supabase: ${error.message}`);
    }
    return data || [];
  }

  // 3. Fallback LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erreur lecture LocalStorage:', e);
    return [];
  }
}

/**
 * Sauvegarde ou met à jour la transaction d'un dimanche
 */
export async function saveTransaction(transactionData) {
  const payload = {
    date_dimanche: transactionData.date_dimanche,
    argent_collecte: Number(transactionData.argent_collecte) || 0,
    argent_remis: Number(transactionData.argent_remis) || 0,
    remis_a: (transactionData.remis_a || '').trim(),
    note: (transactionData.note || '').trim()
  };

  // 1. Neon Postgres
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
      console.error('Erreur Neon saveTransaction:', e);
      throw new Error(`Échec de sauvegarde Neon Postgres: ${e.message}`);
    }
  }

  // 2. Supabase
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('transactions_dimanche')
      .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'date_dimanche' })
      .select()
      .single();

    if (error) {
      console.error('Erreur Supabase saveTransaction:', error);
      throw new Error(`Échec de sauvegarde Supabase: ${error.message}`);
    }
    return data;
  }

  // 3. Fallback LocalStorage
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

/**
 * Supprime la transaction d'un dimanche
 */
export async function deleteTransaction(dateDimanche) {
  // 1. Neon Postgres
  if (isNeonConfigured && neonSql) {
    try {
      await neonSql`DELETE FROM transactions_dimanche WHERE date_dimanche = ${dateDimanche}`;
      return;
    } catch (e) {
      throw new Error(`Échec suppression Neon: ${e.message}`);
    }
  }

  // 2. Supabase
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('transactions_dimanche')
      .delete()
      .eq('date_dimanche', dateDimanche);

    if (error) throw new Error(`Échec suppression Supabase: ${error.message}`);
    return;
  }

  // 3. LocalStorage
  const list = await fetchTransactions();
  const filtered = list.filter(t => t.date_dimanche !== dateDimanche);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
}
