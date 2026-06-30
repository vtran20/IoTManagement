import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Alerts API", () => {
  let app: INestApplication;
  let ownerToken: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    ownerToken = await login("owner@north.example");
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

  it("evaluates, lists, acknowledges, and resolves alerts", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Alert API Tower", timezone: "America/Detroit" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "alert-api-water",
        source: "simulated",
        utilityType: "water",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        measuredAt: "2026-06-29T10:00:00.000Z",
        meterExternalId: "alert-api-water",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 30,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/analytics/aggregate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ periodType: "hour" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/alerts/rules")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        conditionType: "high_usage",
        name: "Water high usage",
        scopeType: "organization",
        threshold: 10,
        utilityType: "water",
        windowMinutes: 60,
      })
      .expect(201);

    const evaluation = await request(app.getHttpServer())
      .post("/api/v1/alerts/evaluate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ now: "2026-06-29T11:00:00.000Z" })
      .expect(201);
    expect(evaluation.body.createdCount).toBe(1);

    await request(app.getHttpServer())
      .post("/api/v1/alerts/evaluate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ now: "2026-06-29T11:05:00.000Z" })
      .expect(200)
      .expect(({ body }) => expect(body.createdCount).toBe(0));

    const listed = await request(app.getHttpServer())
      .get("/api/v1/alerts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    const alertId = listed.body.items[0].id;
    expect(listed.body.items[0]).toMatchObject({
      status: "open",
      title: "High usage",
    });

    await request(app.getHttpServer())
      .get("/api/v1/dashboard/alerts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.alerts).toEqual([
          expect.objectContaining({ id: alertId, status: "open" }),
        ]),
      );

    await request(app.getHttpServer())
      .post(`/api/v1/alerts/${alertId}/acknowledge`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("acknowledged");
        expect(body.acknowledgedAt).toBeDefined();
        expect(body.resolvedAt).toBeUndefined();
      });

    await request(app.getHttpServer())
      .post(`/api/v1/alerts/${alertId}/resolve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("resolved");
        expect(body.triggeredAt).toBeDefined();
        expect(body.resolvedAt).toBeDefined();
      });
  });
});
