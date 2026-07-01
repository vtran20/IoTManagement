import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Auth password management API", () => {
  let app: INestApplication;
  let pool: Pool;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  });

  afterEach(async () => {
    await pool.end();
    await app.close();
  });

  it("changes the current user's password and rejects the old password", async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" })
      .expect(201);
    const csrf = await agent.get("/api/v1/auth/csrf").expect(200);

    await agent
      .post("/api/v1/auth/change-password")
      .set("x-csrf-token", csrf.body.csrfToken)
      .send({
        currentPassword: "password123",
        newPassword: "phase3-new-password",
      })
      .expect(201)
      .expect(({ body }) => expect(body).toEqual({ success: true }));

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "phase3-new-password" })
      .expect(201);
  });

  it("rejects short or reused passwords when changing password", async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post("/api/v1/auth/login")
      .send({ email: "manager@north.example", password: "password123" })
      .expect(201);
    const csrf = await agent.get("/api/v1/auth/csrf").expect(200);

    await agent
      .post("/api/v1/auth/change-password")
      .set("x-csrf-token", csrf.body.csrfToken)
      .send({
        currentPassword: "password123",
        newPassword: "too-short",
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({
          code: "PASSWORD_POLICY_FAILED",
          message: "Password must be at least 12 characters",
        }),
      );

    await agent
      .post("/api/v1/auth/change-password")
      .set("x-csrf-token", csrf.body.csrfToken)
      .send({
        currentPassword: "password123",
        newPassword: "password123",
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({
          code: "PASSWORD_REUSE_FORBIDDEN",
          message: "New password must be different from the current password",
        }),
      );
  });

  it("sends a generic forgot-password response and only queues email for known users", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "owner@north.example" })
      .expect(201)
      .expect(({ body }) => expect(body).toEqual({ success: true }));

    await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "missing@example.test" })
      .expect(201)
      .expect(({ body }) => expect(body).toEqual({ success: true }));

    const outbox = await request(app.getHttpServer())
      .get("/api/v1/dev/email-outbox")
      .expect(200);

    const resetEmails = outbox.body.items.filter(
      (item: { subject: string }) => item.subject === "Reset your password",
    );
    expect(resetEmails).toHaveLength(1);
    expect(resetEmails[0]).toMatchObject({
      status: "queued",
      to: "owner@north.example",
    });
    expect(resetEmails[0].textBody).toContain("/reset-password?token=");
  });

  it("resets password once with a valid reset token", async () => {
    const token = await requestResetToken("viewer@north.example");

    await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "viewer-reset-password" })
      .expect(201)
      .expect(({ body }) => expect(body).toEqual({ success: true }));

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "viewer@north.example",
        password: "viewer-reset-password",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "viewer-reset-again" })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({
          code: "RESET_TOKEN_INVALID",
          message: "Reset token is invalid or expired",
        }),
      );
  });

  it("rejects expired reset tokens", async () => {
    const token = await requestResetToken("owner@south.example");

    await pool.query(
      `UPDATE ${process.env.DATABASE_SCHEMA}.password_reset_tokens SET expires_at = now() - interval '1 minute'`,
    );

    await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "expired-reset-password" })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({
          code: "RESET_TOKEN_INVALID",
          message: "Reset token is invalid or expired",
        }),
      );
  });

  async function requestResetToken(email: string): Promise<string> {
    await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email })
      .expect(201);

    const outbox = await request(app.getHttpServer())
      .get("/api/v1/dev/email-outbox")
      .expect(200);
    const emailItem = outbox.body.items.find(
      (item: { to: string }) => item.to === email,
    );
    expect(emailItem).toBeDefined();

    const match = /token=([^ \n]+)/.exec(emailItem.textBody);
    expect(match?.[1]).toEqual(expect.any(String));
    return match![1];
  }
});
