import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Tenant isolation regression suite", () => {
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

  it("rejects unauthenticated requests to protected endpoints", async () => {
    for (const endpoint of [
      { method: "get", path: "/api/v1/auth/me" },
      { method: "get", path: "/api/v1/buildings" },
      { method: "post", path: "/api/v1/buildings" },
      { method: "get", path: "/api/v1/meters" },
      { method: "post", path: "/api/v1/readings/ingest" },
      { method: "get", path: "/api/v1/dashboard/summary" },
      { method: "get", path: "/api/v1/dashboard/operations" },
      { method: "get", path: "/api/v1/alerts" },
      { method: "get", path: "/api/v1/reports/monthly-usage?month=2026-06" },
      { method: "post", path: "/api/v1/simulations/demo-seed" },
    ] as const) {
      await request(app.getHttpServer())
        [endpoint.method](endpoint.path)
        .send({})
        .expect(401)
        .expect(({ body }) =>
          expect(body.error).toMatchObject({ code: "UNAUTHENTICATED" }),
        );
    }
  });

  it("prevents viewers from mutating portfolio, ingestion, alerts, analytics, and demo data", async () => {
    const ownerToken = await login("owner@north.example");
    const viewerToken = await login("viewer@north.example");
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Viewer Guard Tower", timezone: "America/Detroit" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "viewer-guard-water",
        source: "simulated",
        utilityType: "water",
      })
      .expect(201);

    for (const mutation of [
      {
        body: { name: "Viewer Created", timezone: "America/Detroit" },
        path: "/api/v1/buildings",
      },
      {
        body: {
          buildingId: building.body.id,
          externalId: "viewer-created-meter",
          source: "simulated",
          utilityType: "water",
        },
        path: "/api/v1/meters",
      },
      {
        body: {
          measuredAt: "2026-06-29T13:00:00.000Z",
          meterExternalId: "viewer-guard-water",
          readingKind: "interval",
          unit: "gallon",
          utilityType: "water",
          value: 2,
        },
        path: "/api/v1/readings/ingest",
      },
      {
        body: { periodType: "hour" },
        path: "/api/v1/analytics/aggregate",
      },
      {
        body: {
          conditionType: "high_usage",
          name: "Viewer rule",
          scopeType: "organization",
          threshold: 1,
          utilityType: "water",
          windowMinutes: 60,
        },
        path: "/api/v1/alerts/rules",
      },
      {
        body: {},
        path: "/api/v1/simulations/demo-seed",
      },
    ]) {
      await request(app.getHttpServer())
        .post(mutation.path)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send(mutation.body)
        .expect(403)
        .expect(({ body }) =>
          expect(body.error).toMatchObject({ code: "ROLE_FORBIDDEN" }),
        );
    }
  });

  it("blocks cross-organization resource identifiers", async () => {
    const northToken = await login("owner@north.example");
    const southToken = await login("owner@south.example");
    const southBuilding = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${southToken}`)
      .send({ name: "South Private Tower", timezone: "America/Detroit" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${northToken}`)
      .send({ buildingId: southBuilding.body.id, name: "North cannot use" })
      .expect(404);

    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${northToken}`)
      .send({
        buildingId: southBuilding.body.id,
        externalId: "north-cannot-use-south-building",
        source: "simulated",
        utilityType: "electric",
      })
      .expect(404);
  });
});
