import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import session from "models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("With incorrect `email` but correct `password`", async () => {
      await orchestrator.createUser({
        password: "correct_password",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "wrong.email@test.com",
          password: "correct_password",
        }),
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Invalid credentials",
        action: "Check your email and password and try again.",
        status_code: 401,
      });
    });

    test("With correct `email` but incorrect `password`", async () => {
      await orchestrator.createUser({
        email: "correctemail@test.com",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "correctemail@test.com",
          password: "wrong_password",
        }),
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Invalid credentials",
        action: "Check your email and password and try again.",
        status_code: 401,
      });
    });

    test("With incorrect `email` and incorrect `password`", async () => {
      await orchestrator.createUser({
        password: "correct_password",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "wrongemail@test.com",
          password: "wrong_password",
        }),
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Invalid credentials",
        action: "Check your email and password and try again.",
        status_code: 401,
      });
    });

    test("With correct `email` and correct `password`", async () => {
      const createdUser = await orchestrator.createUser({
        email: "allcorrectemail@test.com",
        password: "correct_password",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "allcorrectemail@test.com",
          password: "correct_password",
        }),
      });
      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        token: responseBody.token,
        user_id: createdUser.id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      // Convert string dates to Date objects for further validation
      const expiresAt = new Date(responseBody.expires_at);
      const createdAt = new Date(responseBody.created_at);

      // Set miliseconds to zero for comparison
      expiresAt.setMilliseconds(0);
      createdAt.setMilliseconds(0);

      // Check that the expiration date is 30 days after the creation date
      expect(expiresAt - createdAt).toBe(session.EXPIRATION_IN_MILISECONDS);

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: responseBody.token,
        maxAge: session.EXPIRATION_IN_MILISECONDS / 1000, // Convert milliseconds to seconds
        path: "/",
        httpOnly: true,
      });
    });
  });
});
