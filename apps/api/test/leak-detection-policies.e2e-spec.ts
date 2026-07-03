import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Leak detection policies API", () => {
  let app: INestApplication;
  let ownerToken: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    ownerToken = await login();
  });

  afterEach(async () => {
    await app.close();
  });

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" })
      .expect(201);
    return response.body.accessToken;
  }

  it("creates a meter-scoped continuous-flow policy", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Policy Tower", timezone: "America/Detroit" })
      .expect(201);
    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "policy-water",
        source: "simulated",
        utilityType: "water",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/leak-detection-policies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        maximumIntervalGapMinutes: 20,
        minimumConsecutiveIntervals: 3,
        minimumIntervalUsage: 0.5,
        name: "Continuous flow for unit meter",
        scopeId: meter.body.id,
        scopeType: "meter",
        severity: "critical",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          enabled: true,
          minimumConsecutiveIntervals: 3,
          minimumIntervalUsage: 0.5,
          organizationId: "org_north",
          scopeId: meter.body.id,
          scopeType: "meter",
          severity: "critical",
        });
      });
  });

  it("lists only policies owned by the authenticated organization", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/leak-detection-policies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        maximumIntervalGapMinutes: 20,
        minimumConsecutiveIntervals: 3,
        minimumIntervalUsage: 0.5,
        name: "Organization water flow",
        scopeType: "organization",
        severity: "warning",
      })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/v1/leak-detection-policies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: "Organization water flow",
              organizationId: "org_north",
            }),
          ]),
        );
        expect(
          body.items.every(
            (policy: { organizationId: string }) =>
              policy.organizationId === "org_north",
          ),
        ).toBe(true);
      });
  });

  it("opens one incident from accepted continuous-flow readings and returns its evidence", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Detection API Tower", timezone: "America/Detroit" })
      .expect(201);
    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "detection-api-water",
        source: "simulated",
        utilityType: "water",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/leak-detection-policies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        maximumIntervalGapMinutes: 20,
        minimumConsecutiveIntervals: 3,
        minimumIntervalUsage: 0.5,
        name: "Detect API continuous flow",
        scopeId: meter.body.id,
        scopeType: "meter",
        severity: "critical",
      })
      .expect(201);

    for (const measuredAt of [
      "2026-07-03T00:00:00.000Z",
      "2026-07-03T00:15:00.000Z",
      "2026-07-03T00:30:00.000Z",
    ]) {
      await request(app.getHttpServer())
        .post("/api/v1/readings/ingest")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          measuredAt,
          meterExternalId: meter.body.externalId,
          readingKind: "interval",
          unit: "gallon",
          utilityType: "water",
          value: 0.75,
        })
        .expect(201);
    }

    const incidents = await request(app.getHttpServer())
      .get("/api/v1/incidents")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    const incident = incidents.body.items.find(
      (item: { meterId?: string }) => item.meterId === meter.body.id,
    );
    expect(incident).toMatchObject({ source: "meter_anomaly" });

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incident.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.evidence).toEqual([
          expect.objectContaining({
            meterId: meter.body.id,
            readingIds: expect.any(Array),
            thresholdUsage: 1.5,
          }),
        ]);
        expect(body.estimatedExcessWater).toBeGreaterThan(0);
        expect(body.estimatedExcessCost).toBeGreaterThan(0);
      });
  });
});
