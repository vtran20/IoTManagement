import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Readings ingestion API", () => {
  let app: INestApplication;
  let ownerToken: string;
  let southToken: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    ownerToken = await login("owner@north.example");
    southToken = await login("owner@south.example");
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

  async function createMeter(input: {
    externalId: string;
    token?: string;
    utilityType: "water" | "electric";
  }) {
    const token = input.token ?? ownerToken;
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `${input.externalId} Building`,
        timezone: "America/Detroit",
      })
      .expect(201);

    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${token}`)
      .send({
        buildingId: building.body.id,
        utilityType: input.utilityType,
        source: "simulated",
        externalId: input.externalId,
      })
      .expect(201);

    return meter.body;
  }

  it("accepts and persists a water reading", async () => {
    const meter = await createMeter({
      externalId: "sim-water-ingest-101",
      utilityType: "water",
    });

    const response = await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        meterExternalId: "sim-water-ingest-101",
        measuredAt: "2026-06-29T12:00:00.000Z",
        utilityType: "water",
        value: 12844.25,
        unit: "gallon",
        readingKind: "cumulative",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      accepted: true,
      duplicate: false,
      reading: {
        meterId: meter.id,
        quality: "good",
        unit: "gallon",
        value: 12844.25,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/meters/${meter.id}/readings`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));

    await request(app.getHttpServer())
      .get(`/api/v1/meters/${meter.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.lastReadingAt).toBe("2026-06-29T12:00:00.000Z"),
      );
  });

  it("accepts an electric reading", async () => {
    await createMeter({
      externalId: "sim-electric-ingest-201",
      utilityType: "electric",
    });

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        meterExternalId: "sim-electric-ingest-201",
        measuredAt: "2026-06-29T12:05:00.000Z",
        utilityType: "electric",
        value: 442.8,
        unit: "kwh",
        readingKind: "interval",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.accepted).toBe(true);
        expect(body.reading.utilityType).toBe("electric");
      });
  });

  it("handles duplicate meter timestamp idempotently", async () => {
    await createMeter({
      externalId: "sim-water-duplicate",
      utilityType: "water",
    });
    const payload = {
      meterExternalId: "sim-water-duplicate",
      measuredAt: "2026-06-29T12:10:00.000Z",
      utilityType: "water",
      value: 12,
      unit: "gallon",
      readingKind: "interval",
    };

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(payload)
      .expect(200)
      .expect(({ body }) => {
        expect(body.accepted).toBe(false);
        expect(body.duplicate).toBe(true);
      });
  });

  it("rejects unknown and cross-organization meter external IDs", async () => {
    await createMeter({
      externalId: "south-only-meter",
      token: southToken,
      utilityType: "water",
    });

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        meterExternalId: "south-only-meter",
        measuredAt: "2026-06-29T12:15:00.000Z",
        utilityType: "water",
        value: 1,
        unit: "gallon",
        readingKind: "interval",
      })
      .expect(404)
      .expect(({ body }) => expect(body.error.code).toBe("UNKNOWN_METER"));
  });

  it("rejects invalid units, negative values, and stale timestamps", async () => {
    await createMeter({
      externalId: "sim-water-validation",
      utilityType: "water",
    });

    const basePayload = {
      meterExternalId: "sim-water-validation",
      measuredAt: "2026-06-29T12:20:00.000Z",
      utilityType: "water",
      value: 1,
      unit: "gallon",
      readingKind: "interval",
    };

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...basePayload, unit: "kwh" })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error.code).toBe("INVALID_READING_UNIT"),
      );

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...basePayload, value: -1 })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error.code).toBe("INVALID_READING_VALUE"),
      );

    await request(app.getHttpServer())
      .post("/api/v1/readings/ingest")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...basePayload, measuredAt: "2000-01-01T00:00:00.000Z" })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error.code).toBe("STALE_READING_TIMESTAMP"),
      );
  });
});
