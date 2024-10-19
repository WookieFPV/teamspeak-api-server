import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';

const dbTokens = new Database('tokens.sqlite', { create: true });

// Initialize the database table if it doesn't exist
dbTokens.run(
  'CREATE TABLE IF NOT EXISTS tokens     (         id         INTEGER         PRIMARY         KEY         AUTOINCREMENT,         token         TEXT         NOT         NULL         UNIQUE,         created_at         DATETIME       DEFAULT         CURRENT_TIMESTAMP     ) ',
);

function generateToken(): string {
  return randomUUID();
}

export function tokenCreate(): string {
  const token = generateToken();
  try {
    const stmt = dbTokens.prepare('INSERT INTO tokens (token) VALUES (?)');
    stmt.run(token);
    return token;
  } catch (error) {
    console.error('Error storing token:', error);
    throw new Error('Failed to store token');
  }
}

const stmtGetAll = dbTokens.prepare('SELECT token FROM tokens');

export function tokenGetAll(): string[] {
  try {
    const rows = stmtGetAll.all() as { token: string }[];
    return rows.map((row) => row.token);
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return [];
  }
}

export function tokenDelete(token: string): boolean {
  try {
    const stmt = dbTokens.prepare('DELETE FROM tokens WHERE token = ?');
    const result = stmt.run(token);
    return result.changes > 0;
  } catch (error) {
    console.log(`deleteToken(${token}) failed: `, error);
    return false;
  }
}

export const tokenDb = { tokenCreate, tokenDelete, tokenGetAll };
