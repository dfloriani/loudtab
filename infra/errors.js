export class InternalServerError extends Error {
  constructor({ cause }) {
    super("Internal Server Error", {
      cause,
    });
    this.name = "InternalServerError";
    this.action = "Contact support";
    this.statusCode = 500;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}
