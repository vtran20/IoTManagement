import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Invitations, memberships, and roles API", () => {
  let app: INestApplication;
  let pool: Pool;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterEach(async () => {
    await pool.end();
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "password123" })
      .expect(201);
    return response.body.accessToken;
  }

  it("enforces invite role matrix for owners, managers, and viewers", async () => {
    const ownerToken = await login("owner@north.example");
    const managerToken = await login("manager@north.example");
    const viewerToken = await login("viewer@north.example");

    await request(app.getHttpServer())
      .post("/api/v1/invitations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "new-manager@north.example", role: "manager" })
      .expect(201)
      .expect(({ body }) =>
        expect(body.invitation).toMatchObject({
          email: "new-manager@north.example",
          role: "manager",
          organizationId: "org_north",
          status: "pending",
        }),
      );

    await request(app.getHttpServer())
      .post("/api/v1/invitations")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ email: "new-owner@north.example", role: "owner" })
      .expect(403)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({
          code: "INVITATION_ROLE_FORBIDDEN",
        }),
      );

    await request(app.getHttpServer())
      .post("/api/v1/invitations")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ email: "new-viewer@north.example", role: "viewer" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/invitations")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ email: "viewer-invite@north.example", role: "viewer" })
      .expect(403);
  });

  it("sends invitation email, accepts token once, and creates active membership", async () => {
    const ownerToken = await login("owner@north.example");

    await request(app.getHttpServer())
      .post("/api/v1/invitations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "accept-me@north.example", role: "viewer" })
      .expect(201);

    const outbox = await request(app.getHttpServer())
      .get("/api/v1/dev/email-outbox")
      .expect(200);
    const inviteEmail = outbox.body.items.find(
      (item: { to: string; subject: string }) =>
        item.to === "accept-me@north.example" &&
        item.subject === "You're invited to IoT Utilities",
    );
    expect(inviteEmail).toBeDefined();
    const token = /token=([^ \n]+)/.exec(inviteEmail.textBody)?.[1];
    expect(token).toEqual(expect.any(String));

    const preview = await request(app.getHttpServer())
      .get(`/api/v1/invitations/${token}`)
      .expect(200);
    expect(preview.body.invitation).toMatchObject({
      email: "accept-me@north.example",
      organizationName: "North Properties",
      role: "viewer",
      status: "pending",
    });

    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .send({
        name: "Accepted Viewer",
        password: "accepted-password",
        token,
      })
      .expect(201)
      .expect(({ body }) =>
        expect(body.membership).toMatchObject({
          organizationId: "org_north",
          role: "viewer",
          status: "active",
        }),
      );

    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .send({
        name: "Accepted Viewer",
        password: "accepted-password",
        token,
      })
      .expect(200)
      .expect(({ body }) =>
        expect(body.membership).toMatchObject({
          organizationId: "org_north",
          role: "viewer",
          status: "active",
        }),
      );

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "accept-me@north.example", password: "accepted-password" })
      .expect(201);
  });

  it("lists and manages memberships with tenant and last-owner protection", async () => {
    const northOwnerToken = await login("owner@north.example");
    const southOwnerToken = await login("owner@south.example");

    const list = await request(app.getHttpServer())
      .get("/api/v1/memberships")
      .set("Authorization", `Bearer ${northOwnerToken}`)
      .expect(200);
    expect(
      list.body.items.every(
        (item: { organizationId: string }) =>
          item.organizationId === "org_north",
      ),
    ).toBe(true);

    const viewer = list.body.items.find(
      (item: { role: string }) => item.role === "viewer",
    );
    expect(viewer).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/memberships/${viewer.id}`)
      .set("Authorization", `Bearer ${northOwnerToken}`)
      .send({ role: "manager" })
      .expect(200)
      .expect(({ body }) =>
        expect(body.membership).toMatchObject({
          role: "manager",
          status: "active",
        }),
      );

    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${viewer.id}/disable`)
      .set("Authorization", `Bearer ${northOwnerToken}`)
      .expect(201)
      .expect(({ body }) =>
        expect(body.membership).toMatchObject({ status: "disabled" }),
      );

    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${viewer.id}/reactivate`)
      .set("Authorization", `Bearer ${northOwnerToken}`)
      .expect(201)
      .expect(({ body }) =>
        expect(body.membership).toMatchObject({ status: "active" }),
      );

    await request(app.getHttpServer())
      .patch(`/api/v1/memberships/${viewer.id}`)
      .set("Authorization", `Bearer ${southOwnerToken}`)
      .send({ role: "viewer" })
      .expect(404);

    await request(app.getHttpServer())
      .patch("/api/v1/memberships/membership_north_owner")
      .set("Authorization", `Bearer ${northOwnerToken}`)
      .send({ role: "manager" })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({
          code: "LAST_OWNER_REQUIRED",
        }),
      );

    await request(app.getHttpServer())
      .post("/api/v1/memberships/membership_north_owner/disable")
      .set("Authorization", `Bearer ${northOwnerToken}`)
      .expect(400)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({
          code: "LAST_OWNER_REQUIRED",
        }),
      );
  });

  it("rejects expired invitation tokens", async () => {
    const ownerToken = await login("owner@north.example");

    await request(app.getHttpServer())
      .post("/api/v1/invitations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "expired-invite@north.example", role: "viewer" })
      .expect(201);

    const outbox = await request(app.getHttpServer())
      .get("/api/v1/dev/email-outbox")
      .expect(200);
    const inviteEmail = outbox.body.items.find(
      (item: { to: string }) => item.to === "expired-invite@north.example",
    );
    const token = /token=([^ \n]+)/.exec(inviteEmail.textBody)?.[1];
    expect(token).toEqual(expect.any(String));

    await pool.query(
      `UPDATE ${process.env.DATABASE_SCHEMA}.invitations SET expires_at = now() - interval '1 minute'`,
    );

    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .send({ name: "Expired", password: "accepted-password", token })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({
          code: "INVITATION_INVALID",
        }),
      );
  });
});
