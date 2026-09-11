/**
 * Utilitaires de sécurité conformes aux normes OWASP Top 10
 */

/**
 * Hachage cryptographique SHA-256 (OWASP A02:2021 - Cryptographic Failures)
 * Garantit que les mots de passe ne sont jamais traités ou stockés en clair
 * @param {string} text 
 * @returns {Promise<string>}
 */
export async function hashPassword(text) {
  if (typeof text !== 'string' || !text) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Nettoie une chaîne de caractères pour empêcher les injections HTML / XSS Stored (OWASP A03:2021 - Injection)
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valide un nom d'utilisateur (caractères alphanumériques, tirets et underscores)
 * @param {string} username 
 * @returns {boolean}
 */
export function validateUsername(username) {
  if (typeof username !== 'string') return false;
  const re = /^[a-zA-Z0-9_-]{3,30}$/;
  return re.test(username.trim());
}

/**
 * Valide et convertit un montant financier avec contrôle des bornes (OWASP A08:2021 - Data Integrity)
 * @param {any} value 
 * @returns {number}
 */
export function validateAmount(value) {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num) || num < 0 || num > 999999999) {
    throw new Error('Montant invalide. Le montant doit être un nombre positif non nul.');
  }
  return Math.round(num * 100) / 100;
}

/**
 * Valide le format d'une date ISO YYYY-MM-DD
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function validateIsoDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Délai anti-bruteforce pour ralentir les attaques par automatisation (OWASP A04:2021 - Insecure Design)
 * @param {number} ms 
 * @returns {Promise<void>}
 */
export function securityDelay(ms = 450) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
