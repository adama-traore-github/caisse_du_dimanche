import { storageService } from './storage.service.js';
import { authService } from './auth.service.js';
import { sanitizeText, validateAmount, validateIsoDate } from '../utils/security.js';

export class TransactionService {
  constructor() {
    // Verrou d'idempotence pour empêcher la soumission multiple simultanée (Race Conditions)
    this.inFlightRequests = new Set();
  }

  /**
   * Valide et enregistre de manière IDEMPOTENTE une transaction financière
   * (Garantit que 2 clics ou ré-essais réseau identiques ne créent aucun doublon)
   */
  async saveTransaction(data) {
    if (!validateIsoDate(data.date_dimanche)) {
      throw new Error('Format de date invalide.');
    }

    const idempotencyKey = `save_${data.date_dimanche}`;

    // 1. Contrôle d'Idempotence Client : rejeter si une requête est déjà en cours
    if (this.inFlightRequests.has(idempotencyKey)) {
      console.warn(`[Idempotency] Requête ignorée : Sauvegarde déjà en cours pour ${data.date_dimanche}`);
      return;
    }

    try {
      this.inFlightRequests.add(idempotencyKey);

      const collecte = validateAmount(data.argent_collecte);
      const remis = validateAmount(data.argent_remis);
      const remisA = sanitizeText(data.remis_a);
      const note = sanitizeText(data.note || '');

      if (!remisA) {
        throw new Error('Le nom du destinataire (Trésorier / Gardien) est obligatoire.');
      }

      const payload = {
        date_dimanche: data.date_dimanche,
        argent_collecte: collecte,
        argent_remis: remis,
        remis_a: remisA,
        note: note
      };

      // Mémoriser le dernier trésorier utilisé
      localStorage.setItem('caisse_last_treasurer', remisA);

      // Enregistrement idempotente via l'adaptateur de stockage (ON CONFLICT DO UPDATE)
      return await storageService.saveTransaction(payload);
    } finally {
      // Libérer le verrou d'idempotence
      this.inFlightRequests.delete(idempotencyKey);
    }
  }

  /**
   * Détermine le nom du trésorier à pré-remplir automatiquement en O(1)
   */
  getSuggestedTreasurer(transactionsMap) {
    const list = Array.from(transactionsMap.values())
      .filter(t => t.remis_a && t.remis_a.trim() !== '')
      .sort((a, b) => b.date_dimanche.localeCompare(a.date_dimanche));

    if (list.length > 0) {
      return list[0].remis_a;
    }

    const savedLast = localStorage.getItem('caisse_last_treasurer');
    if (savedLast) return savedLast;

    const session = authService.getCurrentSession();
    if (session && session.nom) return session.nom;

    return '';
  }
}

export const transactionService = new TransactionService();
