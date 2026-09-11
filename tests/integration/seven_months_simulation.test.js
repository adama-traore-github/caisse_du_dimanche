import { describe, it, expect, beforeEach } from 'vitest';
import { generateSundaysList } from '../../src/utils/dates.js';
import { TransactionService } from '../../src/services/transaction.service.js';
import { storageService } from '../../src/services/storage.service.js';

describe('Simulation Intégration : Saisie de la Caisse sur 7 Mois par l\'Admin', () => {
  let transactionService;

  beforeEach(() => {
    localStorage.clear();
    storageService.setDemoMode(true);
    transactionService = new TransactionService();
  });

  it('devrait générer la liste des dimanches couvrant au moins 7 mois distincts', () => {
    const sundays = generateSundaysList(2026, 7);
    expect(sundays.length).toBeGreaterThanOrEqual(30);

    const monthKeys = new Set(sundays.map(s => s.monthKey));
    expect(monthKeys.size).toBeGreaterThanOrEqual(7);
    expect(monthKeys.has('2026-09')).toBe(true);
    expect(monthKeys.has('2026-10')).toBe(true);
    expect(monthKeys.has('2026-11')).toBe(true);
    expect(monthKeys.has('2026-12')).toBe(true);
    expect(monthKeys.has('2027-01')).toBe(true);
    expect(monthKeys.has('2027-02')).toBe(true);
    expect(monthKeys.has('2027-03')).toBe(true);
  });

  it('devrait réussir à enregistrer les collectes chaque mois sur 7 mois sans erreur ni doublon', async () => {
    const sundays = generateSundaysList(2026, 7);
    
    // Sélectionner 1 dimanche par mois sur 7 mois
    const monthKeysSeen = new Set();
    const selectedSundays = [];

    for (const s of sundays) {
      if (!monthKeysSeen.has(s.monthKey) && monthKeysSeen.size < 7) {
        monthKeysSeen.add(s.monthKey);
        selectedSundays.push(s);
      }
    }

    expect(selectedSundays.length).toBe(7);

    // Simuler la saisie d'une collecte de 200 000 FCFA et remise de 180 000 FCFA pour chaque mois
    const collecteParDimanche = 200000;
    const remisParDimanche = 180000;
    const tresorier = 'Hamidou Traoré (Admin Trésorier)';

    for (const item of selectedSundays) {
      const saved = await transactionService.saveTransaction({
        date_dimanche: item.isoDate,
        argent_collecte: collecteParDimanche,
        argent_remis: remisParDimanche,
        remis_a: tresorier,
        note: `Saisie démo mois ${item.monthKey}`
      });

      expect(saved).toBeDefined();
      expect(saved.date_dimanche).toBe(item.isoDate);
      expect(saved.argent_collecte).toBe(collecteParDimanche);
      expect(saved.argent_remis).toBe(remisParDimanche);
      expect(saved.remis_a).toBe(tresorier);
    }

    // Récupérer toutes les transactions enregistrées
    const allTransactions = await storageService.fetchTransactions();
    expect(allTransactions.length).toBe(7);

    // Calcul du cumul sur 7 mois
    let totalCollecte7Mois = 0;
    let totalRemis7Mois = 0;

    for (const t of allTransactions) {
      totalCollecte7Mois += Number(t.argent_collecte);
      totalRemis7Mois += Number(t.argent_remis);
    }

    const resteEnCaisse7Mois = totalCollecte7Mois - totalRemis7Mois;

    expect(totalCollecte7Mois).toBe(200000 * 7); // 1 400 000 FCFA
    expect(totalRemis7Mois).toBe(180000 * 7);    // 1 260 000 FCFA
    expect(resteEnCaisse7Mois).toBe(140000);     // 140 000 FCFA
  });

  it('devrait mettre à jour une saisie existante sur un mois sans créer de doublon (Idempotence)', async () => {
    const sundayDate = '2026-11-01';

    // Première saisie
    await transactionService.saveTransaction({
      date_dimanche: sundayDate,
      argent_collecte: 150000,
      argent_remis: 100000,
      remis_a: 'Hamidou Traoré',
      note: 'Init'
    });

    // Modification ultérieure du même dimanche
    await transactionService.saveTransaction({
      date_dimanche: sundayDate,
      argent_collecte: 250000,
      argent_remis: 250000,
      remis_a: 'Hamidou Traoré',
      note: 'Correction après comptage'
    });

    const all = await storageService.fetchTransactions();
    expect(all.length).toBe(1);
    expect(all[0].argent_collecte).toBe(250000);
    expect(all[0].argent_remis).toBe(250000);
    expect(all[0].note).toBe('Correction après comptage');
  });
});
