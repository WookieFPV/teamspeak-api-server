import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import type { AuthToken } from '~/auth/tokenTypes.ts';

const dbTokens = new Database('tokens.sqlite', { create: true });

// Initialize the database table if it doesn't exist
dbTokens.run(`
  CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    comment TEXT,
    issuer TEXT
  )
`);

function createTokenIfNoTokenExist(): undefined | AuthToken {
  if (tokenGetTokens().length !== 0) return;
  const token = tokenCreate({
    comment: 'initial token',
    issuer: 'init script',
  });
  console.log('No API token found, will create a token...');
  console.log(
    `Initial API Token: ${token.token} (write it down, this will only be shown once).`,
  );
  console.log(
    "You can create more tokens using the API with POST to /token or by editing the 'tokens.sqlite' db file",
  );
}

function generateToken(): string {
  return randomUUID();
}

const stmtInsert = dbTokens.prepare<
  void,
  [AuthToken['token'], AuthToken['issuer'], AuthToken['comment']]
>('INSERT INTO tokens (token, issuer, comment) VALUES (?, ?, ?)');

export function tokenCreate({
  comment,
  issuer,
}: Pick<AuthToken, 'issuer' | 'comment'>): AuthToken {
  const token = generateToken();
  try {
    stmtInsert.run(token, issuer, comment);
    return { token, comment, issuer };
  } catch (error) {
    console.error('Error storing token:', error);
    throw new Error('Failed to store token');
  }
}

const stmtGetTokens = dbTokens.prepare<Pick<AuthToken, 'token'>, []>(
  'SELECT (token) FROM tokens',
);

export function tokenGetTokens(): Array<string> {
  try {
    return stmtGetTokens.all().map((row) => row.token);
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return [];
  }
}

const stmtGetFullTokens = dbTokens.prepare<AuthToken, []>(
  'SELECT token, issuer, comment FROM tokens',
);

export function tokenGetFullTokens(): Array<AuthToken> {
  try {
    return stmtGetFullTokens.all();
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

export const tokenDb = {
  tokenCreate,
  tokenDelete,
  tokenGetFullTokens,
  createTokenIfNoTokenExist,
  tokenGetTokens,
};
