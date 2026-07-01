import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Auth API", () => {
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

  it("logs in with valid credentials", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" })
      .expect(201);

    expect(response.body).toMatchObject({
      user: {
        email: "owner@north.example",
        name: "North Owner",
      },
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.headers["set-cookie"]?.join("; ")).toContain(
      "iot_management_session=",
    );
    expect(response.headers["set-cookie"]?.join("; ")).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.join("; ")).toContain(
      "SameSite=Lax",
    );
  });

  it("rejects invalid credentials with a consistent error shape", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "wrong-password" })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect",
        method: "POST",
        path: "/api/v1/auth/login",
        requestId: expect.any(String),
        statusCode: 401,
        timestamp: expect.any(String),
      },
    });
  });

  it("returns the current authenticated user", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "manager@north.example", password: "password123" });

    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      user: {
        email: "manager@north.example",
        name: "North Manager",
      },
      membership: {
        role: "manager",
      },
      organization: {
        name: "North Properties",
      },
    });
  });

  it("returns the current user from an HTTP-only session cookie", async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" })
      .expect(201);

    const response = await agent.get("/api/v1/auth/me").expect(200);

    expect(response.body).toMatchObject({
      user: {
        email: "owner@north.example",
        name: "North Owner",
      },
      membership: {
        role: "owner",
      },
      organization: {
        id: "org_north",
        name: "North Properties",
      },
    });
  });

  it("revokes the session and clears the cookie on logout", async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" })
      .expect(201);

    const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
    const logout = await agent
      .post("/api/v1/auth/logout")
      .set("x-csrf-token", csrf.body.csrfToken)
      .expect(201);

    expect(logout.body).toEqual({ success: true });
    expect(logout.headers["set-cookie"]?.join("; ")).toContain(
      "iot_management_session=;",
    );

    await agent.get("/api/v1/auth/me").expect(401);
  });

  it("requires CSRF for cookie-authenticated mutations", async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" })
      .expect(201);

    await agent
      .post("/api/v1/buildings")
      .send({
        address: "1 Test Way",
        name: "CSRF Missing Building",
        timezone: "America/Detroit",
      })
      .expect(403);

    const csrf = await agent.get("/api/v1/auth/csrf").expect(200);

    const created = await agent
      .post("/api/v1/buildings")
      .set("x-csrf-token", csrf.body.csrfToken)
      .send({
        address: "2 Test Way",
        name: "CSRF Protected Building",
        timezone: "America/Detroit",
      })
      .expect(201);

    expect(created.body).toMatchObject({
      name: "CSRF Protected Building",
      organizationId: "org_north",
    });
  });

  it("requires a session cookie when issuing a CSRF token", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" });

    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/csrf")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(403);

    expect(response.body.error).toMatchObject({
      code: "SESSION_REQUIRED",
      message: "Session authentication is required",
    });
  });
});
