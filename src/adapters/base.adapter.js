/**
 * Interface abstraite IStorageAdapter (Principe d'Inversion des Dépendances - DIP)
 */
export class BaseStorageAdapter {
  async fetchAll() {
    throw new Error('La méthode fetchAll() doit être implémentée.');
  }

  async save(data) {
    throw new Error('La méthode save() doit être implémentée.');
  }

  async delete(id) {
    throw new Error('La méthode delete() doit être implémentée.');
  }
}
