import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { vi } from "vitest";
import { AppModule } from "../src/app.module";

describe("Security and operational hardening", () => {
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

  async function login(email = "owner@north.example"): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "password123" })
      .expect(201);
    return response.body.accessToken;
  }

  it("returns structured errors without stack traces or credentials", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "owner@north.example",
        password: "super-secret-password",
      })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect",
        method: "POST",
        path: "/api/v1/auth/login",
        statusCode: 401,
        timestamp: expect.any(String),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(
      "super-secret-password",
    );
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain("stack");
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain("token");
  });

  it("reports API, PostgreSQL, and Redis dependency health", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          dependencies: {
            api: { status: "ok" },
            postgres: { status: "ok" },
            redis: { status: "ok" },
          },
          service: "iot-management-api",
          status: "ok",
        });
      });
  });

  it("rate limits repeated failed login attempts", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: "owner@north.example",
          password: `wrong-password-${attempt}`,
        })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "wrong-password-final" })
      .expect(429)
      .expect(({ body }) => {
        expect(body.error).toMatchObject({
          code: "RATE_LIMITED",
          message: "Too many auth attempts. Try again later.",
          statusCode: 429,
        });
      });
  });

  it("rate limits high-volume reading ingestion", async () => {
    const token = await login();
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rate Limit Tower", timezone: "America/Detroit" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${token}`)
      .send({
        buildingId: building.body.id,
        externalId: "rate-limit-water",
        source: "simulated",
        utilityType: "water",
      })
      .expect(201);

    for (let index = 0; index < 10; index += 1) {
      await request(app.getHttpServer())
        .post("/api/v1/readings/ingest")
        .set("Authorization", `Bearer ${token}`)
        .send({
          measuredAt: `2026-06-29T12:${String(index).padStart(2, "0")}:00.000Z`,
          meterExternalId: "rate-limit-water",
          readingKind: "interval",
          unit: "gallon",
          utilityType: "water",
          value: index + 1,
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${token}`)
      .send({
        measuredAt: "2026-06-29T12:10:00.000Z",
        meterExternalId: "rate-limit-water",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 11,
      })
      .expect(429)
      .expect(({ body }) => {
        expect(body.error).toMatchObject({
          code: "RATE_LIMITED",
          message: "Too many ingestion requests. Try again later.",
          statusCode: 429,
        });
      });
  });

  it("logs alert lifecycle actions without leaking bearer tokens", async () => {
    const token = await login();
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audit Tower", timezone: "America/Detroit" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${token}`)
      .send({
        buildingId: building.body.id,
        externalId: "audit-water",
        source: "simulated",
        utilityType: "water",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${token}`)
      .send({
        measuredAt: "2026-06-29T12:20:00.000Z",
        meterExternalId: "audit-water",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 20,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/analytics/aggregate")
      .set("Authorization", `Bearer ${token}`)
      .send({ periodType: "hour" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/alerts/rules")
      .set("Authorization", `Bearer ${token}`)
      .send({
        conditionType: "high_usage",
        name: "Audit high usage",
        scopeType: "organization",
        threshold: 10,
        utilityType: "water",
        windowMinutes: 60,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/alerts/evaluate")
      .set("Authorization", `Bearer ${token}`)
      .send({ now: "2026-06-29T13:00:00.000Z" })
      .expect(201);

    const listed = await request(app.getHttpServer())
      .get("/api/v1/alerts")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const alertId = listed.body.items[0].id;

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    let logLines: string[] = [];
    try {
      await request(app.getHttpServer())
        .post(`/api/v1/alerts/${alertId}/acknowledge`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/alerts/${alertId}/resolve`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      logLines = logSpy.mock.calls.map(([line]) => String(line));
    } finally {
      logSpy.mockRestore();
    }

    expect(logLines).toHaveLength(2);
    expect(logLines.join("\n")).not.toContain(token);
    expect(logLines.map((line) => JSON.parse(line))).toEqual([
      expect.objectContaining({
        action: "acknowledged",
        alertId,
        event: "alert.lifecycle",
        level: "info",
        organizationId: "org_north",
        userId: "user_north_owner",
      }),
      expect.objectContaining({
        action: "resolved",
        alertId,
        event: "alert.lifecycle",
        level: "info",
        organizationId: "org_north",
        userId: "user_north_owner",
      }),
    ]);
  });
});
