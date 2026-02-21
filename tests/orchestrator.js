import retry from "async-retry";
import database from "infra/database";
import migrator from "models/migrator";
import user from "models/user";
import { faker } from "@faker-js/faker";
import session from "models/session";
import activation from "models/activation";

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) {
        throw Error();
      }
    }
  }

  async function waitForEmailServer() {
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);

      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function createUser(userObj) {
  return await user.create({
    username:
      userObj?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObj?.email || faker.internet.email(),
    password: userObj?.password || "validpassword",
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

async function getLastEmail() {
  const response = await fetch(`${emailHttpUrl}/messages`);
  const emails = await response.json();
  const lastEmail = emails[emails.length - 1];

  if (!lastEmail) {
    return null;
  }

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmail.id}.plain`,
  );
  const emailText = await emailTextResponse.text();
  lastEmail.text = emailText;
  return lastEmail;
}

function extractUUID(text) {
  const match = text.match(/[0-9a-fA-F-]{36}/);
  return match ? match[0] : null;
}

async function activateUser(inactiveUser) {
  return await activation.activateUserByUserId(inactiveUser.id);
}

async function addFeaturesToUser(userObject, features) {
  const updatedUser = await user.addFeatures(userObject.id, features);
  return updatedUser;
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  deleteAllEmails,
  getLastEmail,
  extractUUID,
  activateUser,
  addFeaturesToUser,
};

export default orchestrator;
