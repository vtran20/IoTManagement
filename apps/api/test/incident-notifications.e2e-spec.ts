import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { IncidentNotificationsService } from "../src/notifications/incident-notifications.service";

describe("Incident notifications API", () => {
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

  async function createCriticalIncident() {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Notification Tower", timezone: "America/Detroit" })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/api/v1/incidents/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        description: "Water is escaping from the main riser.",
        severity: "critical",
        title: "Main riser leak",
      })
      .expect(201);

    return response.body;
  }

  it("notifies active owners and managers once, without notifying viewers", async () => {
    const incident = await createCriticalIncident();
    const notificationsService = app.get(IncidentNotificationsService);
    await Promise.all([
      notificationsService.notifyIncidentOpened(incident),
      notificationsService.notifyIncidentOpened(incident),
    ]);
    const managerToken = await login("manager@north.example");
    const viewerToken = await login("viewer@north.example");

    for (const token of [ownerToken, managerToken]) {
      await request(app.getHttpServer())
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.items).toEqual([
            expect.objectContaining({
              channel: "in_app",
              incidentId: incident.id,
              kind: "incident_opened",
            }),
          ]);
          expect(body.items[0]).not.toHaveProperty("readAt");
        });
    }

    await request(app.getHttpServer())
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));

    await request(app.getHttpServer())
      .get("/api/v1/dev/email-outbox")
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              subject: "Critical water incident: Main riser leak",
              to: "owner@north.example",
            }),
            expect.objectContaining({
              subject: "Critical water incident: Main riser leak",
              to: "manager@north.example",
            }),
          ]),
        );
        expect(body.items).toHaveLength(2);
      });
  });

  it("lets an owner manage acknowledgement deadlines and keeps viewers read-only", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/incident-responder-settings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          criticalAcknowledgementDeadlineMinutes: 15,
          emailEnabled: true,
          warningAcknowledgementDeadlineMinutes: 60,
        });
      });

    const viewerToken = await login("viewer@north.example");
    await request(app.getHttpServer())
      .patch("/api/v1/incident-responder-settings")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ criticalAcknowledgementDeadlineMinutes: 10 })
      .expect(403);

    await request(app.getHttpServer())
      .patch("/api/v1/incident-responder-settings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        criticalAcknowledgementDeadlineMinutes: 10,
        emailEnabled: false,
        warningAcknowledgementDeadlineMinutes: 45,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          criticalAcknowledgementDeadlineMinutes: 10,
          emailEnabled: false,
          warningAcknowledgementDeadlineMinutes: 45,
        });
      });
  });

  it("documents notification and responder-setting endpoints in OpenAPI", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/openapi.json")
      .expect(200)
      .expect(({ body }) => {
        expect(body.paths["/api/v1/notifications"]).toEqual(
          expect.objectContaining({ get: expect.any(Object) }),
        );
        expect(
          body.paths["/api/v1/notifications/{notificationId}/read"],
        ).toEqual(expect.objectContaining({ post: expect.any(Object) }));
        expect(body.paths["/api/v1/incident-responder-settings"]).toEqual(
          expect.objectContaining({
            get: expect.any(Object),
            patch: expect.any(Object),
          }),
        );
      });
  });
});
