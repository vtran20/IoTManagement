import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Dashboard API", () => {
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

  it("serves dashboard summary, trends, breakdown, rankings, and device health", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Phase 7 Tower", timezone: "America/Detroit" })
      .expect(201);
    const unit = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "701" })
      .expect(201);
    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "phase7-water",
        source: "simulated",
        unitId: unit.body.id,
        utilityType: "water",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        measuredAt: "2026-06-29T10:15:00.000Z",
        meterExternalId: "phase7-water",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 15,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/analytics/aggregate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ periodType: "hour" })
      .expect(201)
      .expect(({ body }) => expect(body.items).toHaveLength(1));

    await request(app.getHttpServer())
      .post("/api/v1/analytics/aggregate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ periodType: "day" })
      .expect(201)
      .expect(({ body }) => expect(body.items).toHaveLength(1));

    await request(app.getHttpServer())
      .get("/api/v1/dashboard/overview")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect("Server-Timing", /dashboard;dur=/)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            buildings: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  buildingId: building.body.id,
                  usageValue: 15,
                }),
              ]),
            }),
            deviceHealth: expect.objectContaining({
              meters: expect.arrayContaining([
                expect.objectContaining({ meterId: meter.body.id }),
              ]),
            }),
            range: expect.objectContaining({ periodType: "day" }),
            summary: expect.objectContaining({
              organizationId: "org_north",
            }),
            trends: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({ usageValue: 15 }),
              ]),
            }),
            units: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({ unitId: unit.body.id }),
              ]),
            }),
          }),
        );
      });

    await request(app.getHttpServer())
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.organizationId).toBe("org_north");
        expect(body.utilitySummaries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              utilityType: "water",
              usageValue: 15,
            }),
          ]),
        );
      });

    await request(app.getHttpServer())
      .get("/api/v1/dashboard/trends?periodType=hour")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.items).toEqual([
          expect.objectContaining({ usageValue: 15 }),
        ]),
      );

    await request(app.getHttpServer())
      .get("/api/v1/dashboard/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.items).toEqual([
          expect.objectContaining({
            buildingId: building.body.id,
            usageValue: 15,
          }),
        ]),
      );

    await request(app.getHttpServer())
      .get("/api/v1/dashboard/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.items).toEqual([
          expect.objectContaining({
            unitId: unit.body.id,
            usageValue: 15,
          }),
        ]),
      );

    await request(app.getHttpServer())
      .get("/api/v1/dashboard/device-health")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.meters).toEqual([
          expect.objectContaining({
            externalId: "phase7-water",
            meterId: meter.body.id,
          }),
        ]),
      );
  });

  it("serves the current organization's operations queue", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/dashboard/operations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect("Server-Timing", /dashboard;dur=/)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          criticalAlertCount: expect.any(Number),
          generatedAt: expect.any(String),
          incidentsWithoutRepairCount: expect.any(Number),
          items: expect.any(Array),
          offlineMeterCount: expect.any(Number),
          organizationId: "org_north",
          overdueWorkOrderCount: expect.any(Number),
        });
      });
  });
});
