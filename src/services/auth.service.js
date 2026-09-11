import { storageService } from './storage.service.js';
import { validateUsername, sanitizeText, securityDelay, hashPassword } from '../utils/security.js';

const AUTH_SESSION_KEY = 'caisse_du_dimanche_user_session';

export class AuthService {
  getCurrentSession() {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setSession(user) {
    if (user) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  }

  async login(username, password) {
    // 1. Protection Anti-Bruteforce (OWASP A04)
    await securityDelay(400);

    // 2. Validation des entrées (OWASP A03)
    if (!validateUsername(username)) {
      throw new Error('Nom d\'utilisateur invalide (3 à 30 caractères alphanumériques).');
    }
    if (!password || password.trim().length < 4) {
      throw new Error('Mot de passe trop court.');
    }

    const cleanUser = sanitizeText(username);
    const hashedPassword = await hashPassword(password);

    // Mode Neon Database
    if (storageService.neonAdapter) {
      const user = await storageService.neonAdapter.authenticateUser(cleanUser, hashedPassword);
      storageService.setDemoMode(false);
      this.setSession(user);
      return user;
    }

    // Mode local de secours (admin / admin123)
    const adminHash = await hashPassword('admin123');
    if (cleanUser === 'admin' && hashedPassword === adminHash) {
      const admin = { id: 'local-admin', nom: 'Trésorier Principal', nom_utilisateur: 'admin' };
      storageService.setDemoMode(false);
      this.setSession(admin);
      return admin;
    }

    throw new Error('Identifiant ou mot de passe incorrect.');
  }

  async register(nom, username, password) {
    await securityDelay(400);

    const cleanNom = sanitizeText(nom);
    const cleanUser = sanitizeText(username);
    const hashedPassword = await hashPassword(password);

    if (!cleanNom || cleanNom.length < 2) {
      throw new Error('Veuillez fournir un nom complet valide.');
    }
    if (!validateUsername(cleanUser)) {
      throw new Error('Nom d\'utilisateur invalide.');
    }
    if (!password || password.trim().length < 4) {
      throw new Error('Le mot de passe doit comporter au moins 4 caractères.');
    }

    if (storageService.neonAdapter) {
      return await storageService.neonAdapter.registerUser(cleanNom, cleanUser, hashedPassword);
    }

    return 'Mode local : Demande prise en compte.';
  }

  logout() {
    this.setSession(null);
    storageService.setDemoMode(true);
  }
}

export const authService = new AuthService();
