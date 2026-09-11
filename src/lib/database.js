import { storageService } from '../services/storage.service.js';
import { authService } from '../services/auth.service.js';
import { transactionService } from '../services/transaction.service.js';

export const isNeonConfigured = Boolean(storageService.neonAdapter);
export const isSupabaseConfigured = false;

export function isDemoMode() {
  return storageService.isDemoMode();
}

export function setDemoMode(enable) {
  storageService.setDemoMode(enable);
}

export function getActiveStorageProvider() {
  return storageService.getProviderName();
}

export function getCurrentUserSession() {
  return authService.getCurrentSession();
}

export function setCurrentUserSession(user) {
  authService.setSession(user);
}

export async function loginUser(username, password) {
  return await authService.login(username, password);
}

export async function registerUserRequest(nom, username, password) {
  return await authService.register(nom, username, password);
}

export async function fetchTransactions() {
  return await storageService.fetchTransactions();
}

export async function saveTransaction(payload) {
  return await transactionService.saveTransaction(payload);
}

export async function deleteTransaction(id) {
  return await storageService.deleteTransaction(id);
}
