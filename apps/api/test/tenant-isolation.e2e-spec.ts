import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Tenant boundary API", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "password123" })
      .expect(201);

    return response.body.accessToken;
  }

  it("returns only the current organization for the authenticated membership", async () => {
    const token = await login("owner@north.example");

    const response = await request(app.getHttpServer())
      .get("/api/v1/organizations/current")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      organization: {
        id: "org_north",
        name: "North Properties",
        status: "active",
        createdAt: "2026-06-29T00:00:00.000Z",
      },
      membership: {
        id: "membership_north_owner",
        organizationId: "org_north",
        userId: "user_north_owner",
        role: "owner",
      },
    });
  });

  it("blocks access to a different organization", async () => {
    const token = await login("owner@north.example");

    const response = await request(app.getHttpServer())
      .get("/api/v1/organizations/org_south")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body).toEqual({
      error: {
        code: "TENANT_ACCESS_DENIED",
        message: "Organization is outside the authenticated tenant scope",
      },
    });
  });

  it("prevents viewers from manager or owner actions", async () => {
    const token = await login("viewer@north.example");

    const response = await request(app.getHttpServer())
      .post("/api/v1/memberships")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "new-user@north.example", role: "viewer" })
      .expect(403);

    expect(response.body).toEqual({
      error: {
        code: "ROLE_FORBIDDEN",
        message: "This action requires one of these roles: owner, manager",
      },
    });
  });
});
