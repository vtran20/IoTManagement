import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

const databaseUrl = process.env.DATABASE_URL!;
const schema = process.env.DATABASE_SCHEMA!;

describe("Operational workflows API", () => {
  let app: INestApplication;
  let ownerToken: string;
  let viewerToken: string;
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    ownerToken = await login("owner@north.example");
    viewerToken = await login("viewer@north.example");
  });

  afterAll(async () => {
    await pool.end();
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

  it("stores organization rates and uses them for monthly report costs", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/settings/rates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          electricPerKwh: 0.15,
          organizationId: "org_north",
          waterPerGallon: 0.005,
        });
      });

    await request(app.getHttpServer())
      .patch("/api/v1/settings/rates")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ electricPerKwh: 0.2, waterPerGallon: 0.01 })
      .expect(403);

    await request(app.getHttpServer())
      .patch("/api/v1/settings/rates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ electricPerKwh: 0.2, waterPerGallon: 0.01 })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          electricPerKwh: 0.2,
          organizationId: "org_north",
          waterPerGallon: 0.01,
        });
      });

    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Rates Tower", timezone: "America/Detroit" })
      .expect(201);
    const unit = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "Rates 101" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "rates-water-101",
        source: "simulated",
        unitId: unit.body.id,
        utilityType: "water",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "rates-electric-101",
        source: "simulated",
        unitId: unit.body.id,
        utilityType: "electric",
      })
      .expect(201);

    for (const reading of [
      {
        measuredAt: "2026-06-08T10:00:00.000Z",
        meterExternalId: "rates-water-101",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 100,
      },
      {
        measuredAt: "2026-06-08T10:00:00.000Z",
        meterExternalId: "rates-electric-101",
        readingKind: "interval",
        unit: "kwh",
        utilityType: "electric",
        value: 10,
      },
    ]) {
      await request(app.getHttpServer())
        .post("/api/v1/readings/ingest")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(reading)
        .expect(201);
    }

    await request(app.getHttpServer())
      .post("/api/v1/analytics/aggregate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ periodType: "month" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/analytics/aggregate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ periodType: "hour" })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/v1/reports/monthly-usage?month=2026-06")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        const row = body.rows.find(
          (item: { unitId?: string }) => item.unitId === unit.body.id,
        );
        expect(row).toMatchObject({
          electricKwh: 10,
          estimatedCost: 3,
          unitName: "Rates 101",
          waterGallons: 100,
        });
      });
  });

  it("exports monthly reports as CSV and persists alert lifecycle audit rows", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "CSV Alert Tower", timezone: "America/Detroit" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "csv-alert-water",
        source: "simulated",
        utilityType: "water",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        measuredAt: "2026-06-09T10:00:00.000Z",
        meterExternalId: "csv-alert-water",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 40,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/analytics/aggregate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ periodType: "month" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/analytics/aggregate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ periodType: "hour" })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/v1/reports/monthly-usage/export?month=2026-06")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect("content-type", /text\/csv/)
      .expect("content-disposition", /monthly-usage-2026-06.csv/)
      .expect(({ text }) => {
        expect(text).toContain(
          "Building,Unit,Water (gal),Electric (kWh),Estimated cost",
        );
        expect(text).toContain("CSV Alert Tower,Building shared,40,0,");
      });

    await request(app.getHttpServer())
      .post("/api/v1/alerts/rules")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        conditionType: "high_usage",
        name: "CSV alert high usage",
        scopeType: "organization",
        threshold: 10,
        utilityType: "water",
        windowMinutes: 60,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/alerts/evaluate")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ now: "2026-06-09T11:00:00.000Z" })
      .expect(201);

    const listed = await request(app.getHttpServer())
      .get("/api/v1/alerts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    const alertId = listed.body.items[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/alerts/${alertId}/acknowledge`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/alerts/${alertId}/resolve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    const audit = await pool.query(
      `SELECT action, actor_user_id, organization_id, target_id, target_type
       FROM ${schema}.audit_logs
       WHERE target_id = $1
       ORDER BY created_at`,
      [alertId],
    );
    expect(audit.rows).toEqual([
      {
        action: "alert.acknowledged",
        actor_user_id: "user_north_owner",
        organization_id: "org_north",
        target_id: alertId,
        target_type: "alert_event",
      },
      {
        action: "alert.resolved",
        actor_user_id: "user_north_owner",
        organization_id: "org_north",
        target_id: alertId,
        target_type: "alert_event",
      },
    ]);
  });
});
