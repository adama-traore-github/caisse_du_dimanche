import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  hashPassword,
  validateUsername,
  validateAmount,
  validateIsoDate
} from '../../src/utils/security.js';

describe('Unit Tests: Security Utils (OWASP Top 10)', () => {
  
  describe('sanitizeText (XSS Protection)', () => {
    it('devrait échapper les balises HTML et scripts malveillants', () => {
      const malicious = '<script>alert("xss")</script>';
      const sanitized = sanitizeText(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('devrait échapper les guillemets et apostrophes', () => {
      const input = 'O\'Connor "Test" & Co';
      expect(sanitizeText(input)).toBe('O&#x27;Connor &quot;Test&quot; &amp; Co');
    });

    it('devrait retourner une chaîne vide si la valeur n\'est pas un texte', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(123)).toBe('');
    });
  });

  describe('hashPassword (SHA-256 Cryptographic Hashing)', () => {
    it('devrait générer un hash SHA-256 déterministe en minuscules (64 caractères)', async () => {
      const hash1 = await hashPassword('admin123');
      const hash2 = await hashPassword('admin123');
      
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).toBe('240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
    });

    it('devrait produire deux hashs différents pour deux mots de passe distincts', async () => {
      const hashA = await hashPassword('Password1');
      const hashB = await hashPassword('Password2');
      expect(hashA).not.toBe(hashB);
    });
  });

  describe('validateUsername', () => {
    it('devrait valider les noms d\'utilisateurs alphanumériques valides', () => {
      expect(validateUsername('admin')).toBe(true);
      expect(validateUsername('hamidou_2026')).toBe(true);
      expect(validateUsername('jean-paul')).toBe(true);
    });

    it('devrait rejeter les noms d\'utilisateurs avec caractères spéciaux ou trop courts', () => {
      expect(validateUsername('a')).toBe(false); // Trop court (<3)
      expect(validateUsername('user@domain')).toBe(false); // @ interdit
      expect(validateUsername('user name')).toBe(false); // Espace interdit
    });
  });

  describe('validateAmount', () => {
    it('devrait valider et arrondir les montants financiers positifs à 2 décimales', () => {
      expect(validateAmount(150000)).toBe(150000);
      expect(validateAmount('50.758')).toBe(50.76);
      expect(validateAmount(0)).toBe(0);
    });

    it('devrait lever une erreur pour les montants négatifs ou non-numériques', () => {
      expect(() => validateAmount(-50)).toThrow();
      expect(() => validateAmount('abc')).toThrow();
      expect(() => validateAmount(NaN)).toThrow();
    });
  });

  describe('validateIsoDate', () => {
    it('devrait valider les dates au format YYYY-MM-DD', () => {
      expect(validateIsoDate('2026-09-06')).toBe(true);
      expect(validateIsoDate('2026-12-31')).toBe(true);
    });

    it('devrait rejeter les formats invalides', () => {
      expect(validateIsoDate('06-09-2026')).toBe(false);
      expect(validateIsoDate('invalid-date')).toBe(false);
      expect(validateIsoDate(null)).toBe(false);
    });
  });

});
