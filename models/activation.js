import database from "infra/database";
import email from "infra/email";
import { NotFoundError } from "infra/errors";
import webserver from "infra/webserver";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const results = await database.query({
      text: `
       INSERT INTO 
        user_activation_tokens (user_id, expires_at)
       VALUES
        ($1, $2)
       RETURNING
        *
       ;`,
      values: [userId, expiresAt],
    });
    return results.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "Loudtab <contact@loudtab.com.br>",
    to: user.email,
    subject: "Activate your Loudtab account",
    text: `Hello ${user.username},

Thank you for registering at Loudtab! Please activate your account by clicking the link below:

${webserver.origin}/signup/activate?token=${activationToken.id}

If you did not create an account, please ignore this email.

Best regards,
The Loudtab Team`,
  });
}

async function findOneValidById(activationTokenId) {
  const activationTokenObject = await runSelectQuery(activationTokenId);

  return activationTokenObject;

  async function runSelectQuery(activationTokenId) {
    const results = await database.query({
      text: `
      SELECT
        *
      FROM
        user_activation_tokens
      WHERE
        id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
      ;`,
      values: [activationTokenId],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "Activation token not found or expired",
        action: "Register again to receive a new activation email",
      });
    }

    return results.rows[0];
  }
}

const activation = {
  sendEmailToUser,
  create,
  findOneValidById,
};

export default activation;
