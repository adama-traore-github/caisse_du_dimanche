import { BaseStorageAdapter } from './base.adapter.js';

export class LocalStorageAdapter extends BaseStorageAdapter {
  constructor(storageKey = 'caisse_du_dimanche_demo_transactions') {
    super();
    this.storageKey = storageKey;
  }

  async fetchAll() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('Erreur lecture LocalStorage:', e);
      return [];
    }
  }

  async save(payload) {
    const list = await this.fetchAll();
    const existingIndex = list.findIndex(t => t.date_dimanche === payload.date_dimanche);
    
    let savedItem;
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      savedItem = { ...list[existingIndex], ...payload, updated_at: nowIso };
      list[existingIndex] = savedItem;
    } else {
      savedItem = { id: crypto.randomUUID(), created_at: nowIso, updated_at: nowIso, ...payload };
      list.push(savedItem);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(list));
    return savedItem;
  }

  async delete(dateDimanche) {
    const list = await this.fetchAll();
    const filtered = list.filter(t => t.date_dimanche !== dateDimanche);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }
}
