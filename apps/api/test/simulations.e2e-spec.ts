import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Simulation API", () => {
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

  async function createMeter(input: {
    externalId: string;
    utilityType: "water" | "electric";
  }) {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: `${input.externalId} Building`,
        timezone: "America/Detroit",
      })
      .expect(201);

    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        externalId: input.externalId,
        source: "simulated",
        utilityType: input.utilityType,
      })
      .expect(201);

    return meter.body;
  }

  it("runs simulation through ingestion and handles duplicate reruns", async () => {
    const meter = await createMeter({
      externalId: "sim-phase6-water",
      utilityType: "water",
    });
    const payload = {
      intervalMinutes: 60,
      intervals: 3,
      meterExternalIds: ["sim-phase6-water"],
      scenario: "normal",
      seed: "phase6-e2e",
      startAt: "2026-06-29T00:00:00.000Z",
    };

    await request(app.getHttpServer())
      .post("/api/v1/simulations/run")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(payload)
      .expect(201)
      .expect(({ body }) => {
        expect(body.acceptedCount).toBe(3);
        expect(body.duplicateCount).toBe(0);
        expect(body.generatedCount).toBe(3);
        expect(body.meters).toEqual([
          expect.objectContaining({
            externalId: "sim-phase6-water",
            generatedCount: 3,
          }),
        ]);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/meters/${meter.id}/readings`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(3));

    await request(app.getHttpServer())
      .post("/api/v1/simulations/run")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(payload)
      .expect(200)
      .expect(({ body }) => {
        expect(body.acceptedCount).toBe(0);
        expect(body.duplicateCount).toBe(3);
      });
  });
});
