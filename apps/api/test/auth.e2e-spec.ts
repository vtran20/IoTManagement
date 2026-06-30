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
});
