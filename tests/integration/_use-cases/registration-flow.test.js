import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: registration flow (all successful)", () => {
  test("Create user account", async () => {
    const createUserResponse = await fetch(
      "http://localhost:3000/api/v1/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "registrationflow",
          email: "regflow@test.com",
          password: "pass123456",
        }),
      },
    );

    expect(createUserResponse.status).toBe(201);

    const responseBody = await createUserResponse.json();

    expect(responseBody).toEqual({
      id: responseBody.id,
      username: "registrationflow",
      email: "regflow@test.com",
      password: responseBody.password,
      features: ["read:activation_token"],
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {});

  test("Activate account", async () => {});

  test("Login with activated account", async () => {});

  test("Get user information", async () => {});
});
