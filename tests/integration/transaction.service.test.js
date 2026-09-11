import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionService } from '../../src/services/transaction.service.js';
import { storageService } from '../../src/services/storage.service.js';

describe('Integration Tests: TransactionService & Idempotency', () => {
  let transactionServiceInstance;

  beforeEach(() => {
    localStorage.clear();
    storageService.setDemoMode(true);
    transactionServiceInstance = new TransactionService();
  });

  it('devrait enregistrer une transaction financière valide', async () => {
    const data = {
      date_dimanche: '2026-09-06',
      argent_collecte: 150000,
      argent_remis: 100000,
      remis_a: 'M. Jean (Trésorier)',
      note: 'Test intégration'
    };

    const saved = await transactionServiceInstance.saveTransaction(data);
    expect(saved).toBeDefined();
    expect(saved.argent_collecte).toBe(150000);
    expect(saved.argent_remis).toBe(100000);
    expect(saved.remis_a).toBe('M. Jean (Trésorier)');

    const all = await storageService.fetchTransactions();
    expect(all.length).toBe(1);
    expect(all[0].date_dimanche).toBe('2026-09-06');
  });

  it('devrait bloquer les soumissions simultanées identiques via le verrou d\'idempotence', async () => {
    const data = {
      date_dimanche: '2026-09-13',
      argent_collecte: 200000,
      argent_remis: 200000,
      remis_a: 'Sœur Marie'
    };

    // Simuler 2 appels simultanées sur la même date
    const promise1 = transactionServiceInstance.saveTransaction(data);
    const promise2 = transactionServiceInstance.saveTransaction(data);

    await Promise.all([promise1, promise2]);

    const all = await storageService.fetchTransactions();
    expect(all.length).toBe(1); // 1 seule écriture effectuée
  });

  it('devrait suggérer automatiquement le dernier trésorier enregistré', async () => {
    await transactionServiceInstance.saveTransaction({
      date_dimanche: '2026-09-06',
      argent_collecte: 100000,
      argent_remis: 100000,
      remis_a: 'Paul Koffi'
    });

    const transactionsMap = new Map();
    const list = await storageService.fetchTransactions();
    list.forEach(t => transactionsMap.set(t.date_dimanche, t));

    const suggested = transactionServiceInstance.getSuggestedTreasurer(transactionsMap);
    expect(suggested).toBe('Paul Koffi');
  });

});
