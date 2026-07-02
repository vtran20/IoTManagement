import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Leak incidents API", () => {
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

  it("lets an owner create a manual leak incident for a building", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Incident Tower", timezone: "America/Detroit" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/incidents/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        description: "Resident reported water beneath the kitchen sink.",
        severity: "critical",
        title: "Kitchen water report",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          buildingId: building.body.id,
          organizationId: "org_north",
          severity: "critical",
          source: "manual_report",
          status: "open",
          title: "Kitchen water report",
        });
        expect(body.id).toEqual(expect.any(String));
        expect(body.detectedAt).toEqual(expect.any(String));
      });
  });

  it("lets a manager acknowledge an incident and records the activity", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Acknowledgement Tower", timezone: "America/Detroit" })
      .expect(201);
    const incident = await request(app.getHttpServer())
      .post("/api/v1/incidents/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        description: "Water was reported under the bathroom vanity.",
        severity: "warning",
        title: "Bathroom water report",
      })
      .expect(201);
    const managerToken = await login("manager@north.example");

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.body.id}/acknowledge`)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: incident.body.id,
          status: "acknowledged",
        });
        expect(body.acknowledgedAt).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incident.body.id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.activities).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              actorUserId: "user_north_manager",
              type: "acknowledged",
            }),
          ]),
        );
      });
  });

  it("enforces the response lifecycle and records a resolution outcome", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Lifecycle Tower", timezone: "America/Detroit" })
      .expect(201);
    const incident = await request(app.getHttpServer())
      .post("/api/v1/incidents/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        description: "Water is running continuously in the vacant unit.",
        severity: "critical",
        title: "Continuous water report",
      })
      .expect(201);
    const incidentPath = `/api/v1/incidents/${incident.body.id}`;

    await request(app.getHttpServer())
      .post(`${incidentPath}/contain`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.error.code).toBe("INVALID_INCIDENT_TRANSITION");
      });

    for (const [action, status] of [
      ["acknowledge", "acknowledged"],
      ["investigate", "investigating"],
      ["contain", "contained"],
      ["monitor", "monitoring"],
    ]) {
      await request(app.getHttpServer())
        .post(`${incidentPath}/${action}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200)
        .expect(({ body }) => expect(body.status).toBe(status));
    }

    await request(app.getHttpServer())
      .post(`${incidentPath}/resolve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ resolutionCategory: "leak_fixed" })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe("RESOLUTION_NOTE_REQUIRED");
      });

    await request(app.getHttpServer())
      .post(`${incidentPath}/resolve`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resolutionCategory: "leak_fixed",
        resolutionNote:
          "Replaced the failed toilet fill valve and confirmed no flow.",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          resolutionCategory: "leak_fixed",
          status: "resolved",
        });
        expect(body.resolvedAt).toEqual(expect.any(String));
      });
  });

  it("records a manager investigation note in the tenant-scoped incident timeline", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Notes Tower", timezone: "America/Detroit" })
      .expect(201);
    const incident = await request(app.getHttpServer())
      .post("/api/v1/incidents/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        description: "The laundry room drain has standing water.",
        severity: "warning",
        title: "Laundry room report",
      })
      .expect(201);
    const managerToken = await login("manager@north.example");

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.body.id}/notes`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ note: "Inspected the drain; plumber is scheduled for 09:00." })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          actorUserId: "user_north_manager",
          incidentId: incident.body.id,
          summary: "Inspected the drain; plumber is scheduled for 09:00.",
          type: "note",
        });
      });
  });

  it("rejects unit and meter context outside the authenticated building scope", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Scoped Incident Tower", timezone: "America/Detroit" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/incidents/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        description: "Attempt to mix organizations in an incident.",
        severity: "critical",
        title: "Invalid context report",
        unitId: "unit_south_101",
      })
      .expect(404)
      .expect(({ body }) => {
        expect(body.error.code).toBe("TENANT_RESOURCE_NOT_FOUND");
      });
  });

  it("lists only the authenticated organization incidents for a viewer", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "List Tower", timezone: "America/Detroit" })
      .expect(201);
    const incident = await request(app.getHttpServer())
      .post("/api/v1/incidents/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        description: "Water was reported near the boiler room.",
        severity: "warning",
        title: "Boiler room water report",
      })
      .expect(201);
    const viewerToken = await login("viewer@north.example");

    await request(app.getHttpServer())
      .get("/api/v1/incidents")
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: incident.body.id,
              organizationId: "org_north",
            }),
          ]),
        );
        expect(
          body.items.every(
            (item: { organizationId: string }) =>
              item.organizationId === "org_north",
          ),
        ).toBe(true);
      });
  });
});
