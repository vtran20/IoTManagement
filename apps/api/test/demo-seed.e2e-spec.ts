import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Demo seed API", () => {
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

  it("creates predictable demo data and is safe to run repeatedly", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/simulations/demo-seed")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          aggregateCount: 4,
          buildingCount: 2,
          duplicateReadingCount: 0,
          meterCount: 4,
          reportMonth: "2026-06",
          unitCount: 2,
        });
        expect(body.acceptedReadingCount).toBe(4);
      });

    await request(app.getHttpServer())
      .get("/api/v1/reports/monthly-usage?month=2026-06")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.rows).toEqual([
          expect.objectContaining({
            buildingName: "Demo Lakeview Apartments",
            electricKwh: 20,
            estimatedCost: 3.38,
            unitName: "802",
            waterGallons: 75,
          }),
          expect.objectContaining({
            buildingName: "Demo North Ridge",
            electricKwh: 40,
            estimatedCost: 6.5,
            unitName: "1201",
            waterGallons: 100,
          }),
        ]);
        expect(body.totals).toEqual({
          electricKwh: 60,
          estimatedCost: 9.88,
          waterGallons: 175,
        });
      });

    await request(app.getHttpServer())
      .post("/api/v1/simulations/demo-seed")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.acceptedReadingCount).toBe(0);
        expect(body.duplicateReadingCount).toBe(4);
        expect(body.aggregateCount).toBe(4);
      });
  });
});
