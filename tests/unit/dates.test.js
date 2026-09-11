import { describe, it, expect } from 'vitest';
import {
  getFirstSundayOfSeptember,
  generateSundaysList,
  formatMoney,
  formatMonthName,
  formatISODate
} from '../../src/utils/dates.js';

describe('Unit Tests: Date & Currency Utils', () => {
  
  describe('getFirstSundayOfSeptember', () => {
    it('devrait calculer correctement le 1er dimanche de septembre 2026 (6 septembre 2026)', () => {
      const sunday2026 = getFirstSundayOfSeptember(2026);
      expect(sunday2026.getDay()).toBe(0); // 0 = Dimanche
      expect(sunday2026.getFullYear()).toBe(2026);
      expect(sunday2026.getMonth()).toBe(8); // 8 = Septembre
      expect(sunday2026.getDate()).toBe(6);
    });
  });

  describe('generateSundaysList', () => {
    it('devrait générer uniquement des dimanches valides au format ISO', () => {
      const list = generateSundaysList(2026);
      expect(list.length).toBeGreaterThan(0);
      
      list.forEach(item => {
        expect(item.dateObj.getDay()).toBe(0);
        expect(item.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('formatMoney', () => {
    it('devrait formater les montants en FCFA avec séparateur de milliers', () => {
      expect(formatMoney(150000)).toContain('150');
      expect(formatMoney(150000)).toContain('FCFA');
      expect(formatMoney(0)).toContain('0 FCFA');
    });
  });

  describe('formatMonthName', () => {
    it('devrait formater un mois YYYY-MM en français avec majuscule', () => {
      const monthStr = formatMonthName('2026-09');
      expect(monthStr).toContain('Septembre');
      expect(monthStr).toContain('2026');
    });
  });

});
