import database from "infra/database";
import email from "infra/email";
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

async function findOneByUserId(userId) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        user_activation_tokens
      WHERE
        user_id = $1
      ORDER BY
        created_at DESC
      LIMIT 1
      ;`,
    values: [userId],
  });

  return results.rows[0];
}

const activation = {
  sendEmailToUser,
  create,
  findOneByUserId,
};

export default activation;
