import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Alert rules API", () => {
  let app: INestApplication;
  let ownerToken: string;
  let southToken: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    ownerToken = await login("owner@north.example");
    southToken = await login("owner@south.example");
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

  it("creates, lists, and updates alert rules inside the current organization", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/alerts/rules")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        conditionType: "high_usage",
        name: "High electric usage",
        scopeType: "organization",
        threshold: 50,
        utilityType: "electric",
        windowMinutes: 60,
      })
      .expect(201);

    expect(created.body).toMatchObject({
      enabled: true,
      name: "High electric usage",
      organizationId: "org_north",
    });

    await request(app.getHttpServer())
      .get("/api/v1/alerts/rules")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.items).toEqual([
          expect.objectContaining({ id: created.body.id }),
        ]),
      );

    await request(app.getHttpServer())
      .patch(`/api/v1/alerts/rules/${created.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ enabled: false, threshold: 75 })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ enabled: false, threshold: 75 }),
      );

    await request(app.getHttpServer())
      .get("/api/v1/alerts/rules")
      .set("Authorization", `Bearer ${southToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
  });
});
