import database from "infra/database";
import email from "infra/email";
import { ForbiddenError, NotFoundError } from "infra/errors";
import webserver from "infra/webserver";
import user from "./user";
import authorization from "./authorization";

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

async function markTokenAsUsed(activationTokenId) {
  const usedActivationToken = await runUpdateQuery(activationTokenId);
  return usedActivationToken;

  async function runUpdateQuery(activationTokenId) {
    const results = await database.query({
      text: `
      UPDATE
        user_activation_tokens
      SET
        used_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING
        *
      ;`,
      values: [activationTokenId],
    });

    return results.rows[0];
  }
}

async function activateUserByUserId(userId) {
  const userToActivate = await user.findOneById(userId);

  if (!authorization.can(userToActivate, "read:activation_token")) {
    throw new ForbiddenError({
      message: "You can no longer use this activation token.",
      action: "Contact support.",
    });
  }

  const activatedUser = await user.setFeatures(userId, [
    "create:session",
    "read:session",
  ]);

  return activatedUser;
}

const activation = {
  sendEmailToUser,
  create,
  findOneValidById,
  markTokenAsUsed,
  activateUserByUserId,
  EXPIRATION_IN_MILLISECONDS,
};

export default activation;
