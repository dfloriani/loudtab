import crypto from "node:crypto";
import database from "infra/database";

// 60 * 60 * 24 * 30 = 2592000 seconds (30 days)
// JS Date object uses milliseconds, so we multiply by 1000
const EXPIRATION_IN_MILISECONDS = 60 * 60 * 24 * 30 * 1000;

async function create(userId) {
  const token = crypto.randomBytes(48).toString("hex"); // 1 byte = 2 hex characters, 48 bytes = 96 hex characters
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILISECONDS);
  const newSession = await runInsertQuery(token, userId, expiresAt);
  return newSession;

  async function runInsertQuery(token, userId, expiresAt) {
    const results = await database.query({
      text: `
          INSERT INTO 
            sessions (token, user_id, expires_at)
          VALUES 
            ($1, $2, $3)
          RETURNING 
            *
          ;`,
      values: [token, userId, expiresAt],
    });

    return results.rows[0];
  }
}

const session = {
  create,
  EXPIRATION_IN_MILISECONDS,
};

export default session;
