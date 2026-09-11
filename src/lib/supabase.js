import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const LOCAL_STORAGE_KEY = 'caisse_du_dimanche_transactions';

/**
 * Charge toutes les transactions enregistrées
 * @returns {Promise<Array<Object>>}
 */
export async function fetchTransactions() {
    if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
            .from('transactions_dimanche')
            .select('*')
            .order('date_dimanche', { ascending: false });

        if (error) {
            console.error('Erreur Supabase fetchTransactions:', error);
            throw new Error(`Erreur de chargement depuis la base de données: ${error.message}`);
        }
        return data || [];
    }

    // Fallback LocalStorage si Supabase n'est pas configuré
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
 * @param {Object} transactionData 
 * @returns {Promise<Object>}
 */
export async function saveTransaction(transactionData) {
    const payload = {
        date_dimanche: transactionData.date_dimanche,
        argent_collecte: Number(transactionData.argent_collecte) || 0,
        argent_remis: Number(transactionData.argent_remis) || 0,
        remis_a: (transactionData.remis_a || '').trim(),
        note: (transactionData.note || '').trim(),
        updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
            .from('transactions_dimanche')
            .upsert(payload, { onConflict: 'date_dimanche' })
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase saveTransaction:', error);
            throw new Error(`Échec de l'enregistrement : ${error.message}`);
        }
        return data;
    }

    // Fallback LocalStorage
    const list = await fetchTransactions();
    const existingIndex = list.findIndex(t => t.date_dimanche === payload.date_dimanche);
    
    let savedItem;
    if (existingIndex >= 0) {
        savedItem = { ...list[existingIndex], ...payload };
        list[existingIndex] = savedItem;
    } else {
        savedItem = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...payload };
        list.push(savedItem);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    return savedItem;
}

/**
 * Supprime l'enregistrement d'un dimanche
 * @param {string} dateDimanche 
 */
export async function deleteTransaction(dateDimanche) {
    if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
            .from('transactions_dimanche')
            .delete()
            .eq('date_dimanche', dateDimanche);

        if (error) {
            throw new Error(`Échec de la suppression : ${error.message}`);
        }
        return;
    }

    const list = await fetchTransactions();
    const filtered = list.filter(t => t.date_dimanche !== dateDimanche);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
}
