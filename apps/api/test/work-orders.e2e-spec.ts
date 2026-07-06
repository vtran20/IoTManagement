import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Leak repair work orders API", () => {
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

  async function createIncident() {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Repair Tower", timezone: "America/Detroit" })
      .expect(201);

    const incident = await request(app.getHttpServer())
      .post("/api/v1/incidents/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        description: "Water is dripping below the bathroom sink.",
        severity: "critical",
        title: "Bathroom leak",
      })
      .expect(201);

    return { building: building.body, incident: incident.body };
  }

  it("creates an assigned repair work order and records it on the incident timeline", async () => {
    const { incident } = await createIncident();

    const response = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.id}/work-orders`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        assignedMembershipId: "membership_north_manager",
        description: "Inspect the sink trap and replace failed parts.",
        dueAt: "2026-07-05T12:00:00.000Z",
        priority: "high",
        title: "Inspect bathroom leak",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      assignedMembershipId: "membership_north_manager",
      incidentId: incident.id,
      priority: "high",
      status: "assigned",
      title: "Inspect bathroom leak",
    });
    expect(response.body.id).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incident.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.activities).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: "work_order_created",
            }),
          ]),
        );
      });
  });

  it("records non-lifecycle repair updates on the incident timeline", async () => {
    const { incident } = await createIncident();
    const workOrder = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.id}/work-orders`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        description: "Inspect the sink trap and replace failed parts.",
        priority: "high",
        title: "Inspect bathroom leak",
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/work-orders/${workOrder.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Inspect bathroom sink leak" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toBe("Inspect bathroom sink leak");
      });

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incident.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.activities).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: "work_order_updated" }),
          ]),
        );
      });
  });

  it("rejects an unsupported work-order priority at the API boundary", async () => {
    const { incident } = await createIncident();

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.id}/work-orders`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        description: "Inspect the sink trap and replace failed parts.",
        priority: "immediate",
        title: "Inspect bathroom leak",
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe("WORK_ORDER_PRIORITY_INVALID");
      });
  });

  it("rejects a non-text work-order due date at the API boundary", async () => {
    const { incident } = await createIncident();

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.id}/work-orders`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        description: "Inspect the sink trap and replace failed parts.",
        dueAt: 42,
        priority: "high",
        title: "Inspect bathroom leak",
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe("WORK_ORDER_DUE_DATE_INVALID");
      });
  });

  it("rejects a non-text completion note at the API boundary", async () => {
    const { incident } = await createIncident();
    const workOrder = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.id}/work-orders`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        assignedMembershipId: "membership_north_manager",
        description: "Inspect the sink trap and replace failed parts.",
        priority: "high",
        title: "Inspect bathroom leak",
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/work-orders/${workOrder.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "in_progress" })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/work-orders/${workOrder.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ completionNote: 42, status: "completed" })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe("WORK_ORDER_COMPLETION_NOTE_REQUIRED");
      });
  });

  it("enforces eligible assignment, repair lifecycle, and overdue filtering", async () => {
    const { incident } = await createIncident();

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.id}/work-orders`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        assignedMembershipId: "membership_north_viewer",
        description: "Inspect the sink trap and replace failed parts.",
        priority: "high",
        title: "Inspect bathroom leak",
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe("WORK_ORDER_ASSIGNEE_INVALID");
      });

    const workOrder = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incident.id}/work-orders`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        assignedMembershipId: "membership_north_manager",
        description: "Inspect the sink trap and replace failed parts.",
        dueAt: "2026-01-01T12:00:00.000Z",
        priority: "high",
        title: "Inspect bathroom leak",
      })
      .expect(201);

    const viewerToken = await login("viewer@north.example");
    await request(app.getHttpServer())
      .patch(`/api/v1/work-orders/${workOrder.body.id}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ status: "in_progress" })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/work-orders/${workOrder.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "in_progress" })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe("in_progress"));

    await request(app.getHttpServer())
      .patch(`/api/v1/work-orders/${workOrder.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "completed" })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe("WORK_ORDER_COMPLETION_NOTE_REQUIRED");
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/work-orders/${workOrder.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        completionNote:
          "Replaced the failed washer and confirmed the drip stopped.",
        status: "completed",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          completionNote:
            "Replaced the failed washer and confirmed the drip stopped.",
          status: "completed",
        });
        expect(body.finalCost).toBeUndefined();
        expect(body.completedAt).toEqual(expect.any(String));
        expect(body.isOverdue).toBe(false);
      });

    await request(app.getHttpServer())
      .get("/api/v1/work-orders")
      .set("Authorization", `Bearer ${viewerToken}`)
      .query({
        assignedMembershipId: "membership_north_manager",
        priority: "high",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: workOrder.body.id,
              status: "completed",
            }),
          ]),
        );
      });

    await request(app.getHttpServer())
      .get("/api/v1/work-orders")
      .set("Authorization", `Bearer ${viewerToken}`)
      .query({
        assignedMembershipId: "membership_north_manager",
        overdue: false,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: workOrder.body.id }),
          ]),
        );
      });

    await request(app.getHttpServer())
      .get("/api/v1/work-orders")
      .set("Authorization", `Bearer ${viewerToken}`)
      .query({ overdue: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: workOrder.body.id }),
          ]),
        );
      });
  });
});
