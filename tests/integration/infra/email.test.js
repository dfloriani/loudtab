import email from "infra/email";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("infra/email.js", () => {
  test("send()", async () => {
    await orchestrator.deleteAllEmails();

    await email.send({
      from: "Loudtab <dftest@gmail.com>",
      to: "uctest@gmail.com",
      subject: "Test email",
      text: "This is a test email.",
      // html: "<b>This is a test email.</b>",
    });

    await email.send({
      from: "Loudtab <dftest@gmail.com>",
      to: "uctest@gmail.com",
      subject: "Test last email",
      text: "This is the last email sent.",
      // html: "<b>This is a test email.</b>",
    });

    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.sender).toBe("<dftest@gmail.com>");
    expect(lastEmail.recipients[0]).toBe("<uctest@gmail.com>");
    expect(lastEmail.subject).toBe("Test last email");
    expect(lastEmail.text).toBe("This is the last email sent.\n");
  });
});
