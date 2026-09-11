import { neon } from '@neondatabase/serverless';
import { BaseStorageAdapter } from './base.adapter.js';

export class NeonStorageAdapter extends BaseStorageAdapter {
  constructor(dbUrl) {
    super();
    if (!dbUrl) {
      throw new Error('NeonStorageAdapter exige une URL de connexion valide.');
    }
    this.sql = neon(dbUrl);
  }

  async fetchAll() {
    try {
      const rows = await this.sql`
        SELECT id, date_dimanche, argent_collecte, argent_remis, remis_a, note, created_at, updated_at
        FROM transactions_dimanche
        ORDER BY date_dimanche DESC
      `;
      return rows.map(r => ({
        ...r,
        argent_collecte: Number(r.argent_collecte) || 0,
        argent_remis: Number(r.argent_remis) || 0
      }));
    } catch (e) {
      console.error('Erreur Neon Storage fetchAll:', e);
      throw new Error(`Erreur Base de données Neon: ${e.message}`);
    }
  }

  async save(payload) {
    try {
      const rows = await this.sql`
        INSERT INTO transactions_dimanche (date_dimanche, argent_collecte, argent_remis, remis_a, note, updated_at)
        VALUES (${payload.date_dimanche}, ${payload.argent_collecte}, ${payload.argent_remis}, ${payload.remis_a}, ${payload.note}, NOW())
        ON CONFLICT (date_dimanche) DO UPDATE SET
          argent_collecte = EXCLUDED.argent_collecte,
          argent_remis = EXCLUDED.argent_remis,
          remis_a = EXCLUDED.remis_a,
          note = EXCLUDED.note,
          updated_at = NOW()
        RETURNING *
      `;
      return rows[0];
    } catch (e) {
      console.error('Erreur Neon Storage save:', e);
      throw new Error(`Échec de sauvegarde sur Neon Postgres: ${e.message}`);
    }
  }

  async delete(dateDimanche) {
    try {
      await this.sql`DELETE FROM transactions_dimanche WHERE date_dimanche = ${dateDimanche}`;
    } catch (e) {
      throw new Error(`Échec de suppression Neon: ${e.message}`);
    }
  }

  async authenticateUser(username, password) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const rows = await this.sql`
      SELECT id, nom, nom_utilisateur, est_valide
      FROM utilisateurs_autorises
      WHERE LOWER(nom_utilisateur) = ${cleanUser} AND mot_de_passe = ${cleanPass}
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new Error('Nom d\'utilisateur ou mot de passe incorrect.');
    }

    const user = rows[0];
    if (!user.est_valide) {
      throw new Error('Votre compte est en attente de validation par l\'administrateur.');
    }

    return user;
  }

  async registerUser(nom, username, password) {
    const cleanNom = nom.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      await this.sql`
        INSERT INTO utilisateurs_autorises (nom, nom_utilisateur, mot_de_passe, est_valide)
        VALUES (${cleanNom}, ${cleanUser}, ${cleanPass}, false)
      `;
      return 'Demande d\'accès enregistrée. Votre compte sera activé par l\'administrateur.';
    } catch (e) {
      if (e.message.includes('unique') || e.message.includes('already exists')) {
        throw new Error('Ce nom d\'utilisateur est déjà pris.');
      }
      throw new Error(`Échec de la demande : ${e.message}`);
    }
  }
}
