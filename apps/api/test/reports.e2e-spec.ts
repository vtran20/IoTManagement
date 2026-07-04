import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Reports API", () => {
  let app: INestApplication;
  let ownerToken: string;
  let southOwnerToken: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    ownerToken = await login("owner@north.example");
    southOwnerToken = await login("owner@south.example");
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

  it("generates a tenant-scoped monthly usage report grouped by building and unit", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Report Tower", timezone: "America/Detroit" })
      .expect(201);
    const unit101 = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "101" })
      .expect(201);
    const unit102 = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "102" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "report-water-101",
        source: "simulated",
        unitId: unit101.body.id,
        utilityType: "water",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "report-electric-101",
        source: "simulated",
        unitId: unit101.body.id,
        utilityType: "electric",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "report-water-102",
        source: "simulated",
        unitId: unit102.body.id,
        utilityType: "water",
      })
      .expect(201);

    for (const reading of [
      {
        measuredAt: "2026-06-05T10:00:00.000Z",
        meterExternalId: "report-water-101",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 100,
      },
      {
        measuredAt: "2026-06-06T10:00:00.000Z",
        meterExternalId: "report-water-101",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 25,
      },
      {
        measuredAt: "2026-06-05T10:00:00.000Z",
        meterExternalId: "report-electric-101",
        readingKind: "interval",
        unit: "kwh",
        utilityType: "electric",
        value: 30,
      },
      {
        measuredAt: "2026-06-05T10:00:00.000Z",
        meterExternalId: "report-water-102",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 75,
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
      .get("/api/v1/reports/monthly-usage?month=2026-06")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          format: "json",
          organizationId: "org_north",
          periodEnd: "2026-07-01T00:00:00.000Z",
          periodStart: "2026-06-01T00:00:00.000Z",
          reportType: "usage_summary",
          totals: {
            electricKwh: 30,
            estimatedCost: 5.51,
            waterGallons: 200,
          },
        });
        expect(
          body.columns.map((column: { key: string }) => column.key),
        ).toEqual([
          "buildingName",
          "unitName",
          "waterGallons",
          "electricKwh",
          "estimatedCost",
        ]);
        expect(body.rows).toEqual([
          expect.objectContaining({
            buildingId: building.body.id,
            buildingName: "Report Tower",
            electricKwh: 30,
            estimatedCost: 5.13,
            unitId: unit101.body.id,
            unitName: "101",
            waterGallons: 125,
          }),
          expect.objectContaining({
            buildingId: building.body.id,
            buildingName: "Report Tower",
            electricKwh: 0,
            estimatedCost: 0.38,
            unitId: unit102.body.id,
            unitName: "102",
            waterGallons: 75,
          }),
        ]);
      });

    await request(app.getHttpServer())
      .get("/api/v1/reports/monthly-usage?month=2026-06")
      .set("Authorization", `Bearer ${southOwnerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.organizationId).toBe("org_south");
        expect(body.rows).toEqual([]);
        expect(body.totals).toEqual({
          electricKwh: 0,
          estimatedCost: 0,
          waterGallons: 0,
        });
      });
  });

  it("rejects unsupported leak-response export formats", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/reports/leak-response/export?format=spreadsheet")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe("LEAK_REPORT_FORMAT_INVALID");
      });
  });
});
