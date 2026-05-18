import { query } from '../config/db.js';
import { Row } from '../db/types.js';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: Date;
}

export async function createUser(
  username: string,
  email: string,
  passwordHash: string,
  displayName?: string
): Promise<User> {
  const result = await query(
    `INSERT INTO users (username, email, password_hash, display_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [username, email, passwordHash, displayName || username]
  );
  return result.rows[0] as User;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ? (result.rows[0] as User) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ? (result.rows[0] as User) : null;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] ? (result.rows[0] as User) : null;
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'displayName' | 'avatarUrl'>>
): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (updates.displayName !== undefined) {
    fields.push(`display_name = $${paramCount++}`);
    values.push(updates.displayName);
  }
  if (updates.avatarUrl !== undefined) {
    fields.push(`avatar_url = $${paramCount++}`);
    values.push(updates.avatarUrl);
  }

  if (fields.length === 0) return findUserById(id);

  values.push(id);
  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0] ? (result.rows[0] as User) : null;
}