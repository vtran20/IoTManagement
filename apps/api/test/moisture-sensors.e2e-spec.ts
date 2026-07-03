import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../src/persistence/persistence.service";

describe("Moisture sensors API", () => {
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

  it("lets an owner register a simulated moisture sensor for a building", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Sensor Tower", timezone: "America/Detroit" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/moisture-sensors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "sensor-tower-lobby-01",
        name: "Lobby moisture sensor",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          buildingId: building.body.id,
          externalId: "sensor-tower-lobby-01",
          name: "Lobby moisture sensor",
          organizationId: "org_north",
          source: "simulated",
          status: "online",
        });
        expect(body.id).toEqual(expect.any(String));
      });
  });

  it("correlates a wet unit sensor event with the matching meter-anomaly incident once", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Correlation Tower", timezone: "America/Detroit" })
      .expect(201);
    const unit = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "101" })
      .expect(201);
    const sensor = await request(app.getHttpServer())
      .post("/api/v1/moisture-sensors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "correlation-101",
        name: "Unit 101 sensor",
        unitId: unit.body.id,
      })
      .expect(201);
    const persistence = app.get<PersistenceService>(PERSISTENCE_SERVICE);
    const measuredAt = "2026-07-03T12:00:00.000Z";
    const incident = await persistence.createLeakIncident({
      buildingId: building.body.id,
      description: "Meter intervals indicate continuous water flow.",
      detectedAt: "2026-07-03T12:15:00.000Z",
      organizationId: "org_north",
      severity: "critical",
      source: "meter_anomaly",
      title: "Continuous water flow detected",
      unitId: unit.body.id,
    });

    const first = await request(app.getHttpServer())
      .post(`/api/v1/moisture-sensors/${sensor.body.id}/events`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ measuredAt, state: "wet" })
      .expect(201);
    expect(first.body).toMatchObject({
      correlated: true,
      duplicate: false,
      incident: { id: incident.id },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/moisture-sensors/${sensor.body.id}/events`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ measuredAt, state: "wet" })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          correlated: true,
          duplicate: true,
          incident: { id: incident.id },
        });
      });

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incident.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.sensorEvidence).toHaveLength(1);
        expect(body.sensorEvidence[0]).toMatchObject({
          incidentId: incident.id,
          sensorId: sensor.body.id,
        });
      });
  });

  it("opens a moisture-sensor incident when the meter anomaly is outside the correlation window", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Window Tower", timezone: "America/Detroit" })
      .expect(201);
    const sensor = await request(app.getHttpServer())
      .post("/api/v1/moisture-sensors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "window-lobby",
        name: "Lobby sensor",
      })
      .expect(201);
    const persistence = app.get<PersistenceService>(PERSISTENCE_SERVICE);
    await persistence.createLeakIncident({
      buildingId: building.body.id,
      description: "Older meter anomaly.",
      detectedAt: "2026-07-03T11:29:00.000Z",
      organizationId: "org_north",
      severity: "warning",
      source: "meter_anomaly",
      title: "Older water anomaly",
    });

    await request(app.getHttpServer())
      .post(`/api/v1/moisture-sensors/${sensor.body.id}/events`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ measuredAt: "2026-07-03T12:00:00.000Z", state: "wet" })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          correlated: false,
          duplicate: false,
          incident: expect.objectContaining({ source: "moisture_sensor" }),
        });
      });
  });

  it("documents moisture sensor and correlation-setting endpoints in OpenAPI", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/openapi.json")
      .expect(200)
      .expect(({ body }) => {
        expect(body.paths["/api/v1/moisture-sensors"]).toEqual(
          expect.objectContaining({
            get: expect.any(Object),
            post: expect.any(Object),
          }),
        );
        expect(
          body.paths["/api/v1/moisture-sensors/{sensorId}/events"],
        ).toEqual(
          expect.objectContaining({
            get: expect.any(Object),
            post: expect.any(Object),
          }),
        );
        expect(body.paths["/api/v1/incident-correlation-settings"]).toEqual(
          expect.objectContaining({
            get: expect.any(Object),
            patch: expect.any(Object),
          }),
        );
      });
  });

  it("keeps sensor writes restricted and sensor lookup tenant-scoped", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Secure Sensor Tower", timezone: "America/Detroit" })
      .expect(201);
    const sensor = await request(app.getHttpServer())
      .post("/api/v1/moisture-sensors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "secure-lobby",
        name: "Secure lobby sensor",
      })
      .expect(201);
    const viewerToken = await login("viewer@north.example");
    const southOwnerToken = await login("owner@south.example");

    await request(app.getHttpServer())
      .post("/api/v1/moisture-sensors")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: "viewer-blocked",
        name: "Blocked sensor",
      })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/moisture-sensors/${sensor.body.id}`)
      .set("Authorization", `Bearer ${southOwnerToken}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body.error.code).toBe("TENANT_RESOURCE_NOT_FOUND");
      });
  });
});
