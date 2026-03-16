import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Running pending migrations", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
      });

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "User does not have permission to perform this action.",
        action: "Check if user features include write:migration.",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("Running pending migrations", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "User does not have permission to perform this action.",
        action: "Check if user features include write:migration.",
        status_code: 403,
      });
    });
  });

  describe("Privileged user", () => {
    test("With `write:migration`", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      await orchestrator.addFeaturesToUser(createdUser, ["write:migration"]);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
    });
  });
});
