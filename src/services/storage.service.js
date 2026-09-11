import { LocalStorageAdapter } from '../adapters/local.adapter.js';
import { NeonStorageAdapter } from '../adapters/neon.adapter.js';

const MODE_DEMO_KEY = 'caisse_du_dimanche_mode_demo';
const neonDbUrl = import.meta.env?.VITE_NEON_DATABASE_URL || import.meta.env?.VITE_DATABASE_URL || '';

export class StorageService {
  constructor() {
    this.localAdapter = new LocalStorageAdapter();
    this.neonAdapter = neonDbUrl ? new NeonStorageAdapter(neonDbUrl) : null;
    
    // Par défaut, activer le mode démo si pas encore défini
    if (localStorage.getItem(MODE_DEMO_KEY) === null) {
      localStorage.setItem(MODE_DEMO_KEY, 'true');
    }
  }

  isDemoMode() {
    return localStorage.getItem(MODE_DEMO_KEY) === 'true';
  }

  setDemoMode(enable) {
    localStorage.setItem(MODE_DEMO_KEY, enable ? 'true' : 'false');
  }

  /**
   * Retourne l'adaptateur actif (Principe de Substitution de Liskov - LSP)
   */
  getActiveAdapter() {
    if (this.isDemoMode() || !this.neonAdapter) {
      return this.localAdapter;
    }
    return this.neonAdapter;
  }

  getProviderName() {
    if (this.isDemoMode()) return 'Mode Démo (Local Storage)';
    if (this.neonAdapter) return 'Neon Postgres (Production)';
    return 'Local Storage';
  }

  async fetchTransactions() {
    return await this.getActiveAdapter().fetchAll();
  }

  async saveTransaction(payload) {
    return await this.getActiveAdapter().save(payload);
  }

  async deleteTransaction(id) {
    return await this.getActiveAdapter().delete(id);
  }
}

export const storageService = new StorageService();
