import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Meters API", () => {
  let app: INestApplication;
  let ownerToken: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@north.example", password: "password123" })
      .expect(201);
    ownerToken = login.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createBuilding(name = "Meter Building") {
    return request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name, timezone: "America/Detroit" })
      .expect(201);
  }

  it("creates a building-level shared water meter", async () => {
    const building = await createBuilding();

    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        utilityType: "water",
        source: "simulated",
        externalId: "sim-water-shared",
      })
      .expect(201);

    expect(meter.body).toMatchObject({
      buildingId: building.body.id,
      externalId: "sim-water-shared",
      organizationId: "org_north",
      status: "online",
      supportedReadingUnits: ["gallon", "liter"],
    });
    expect(meter.body).not.toHaveProperty("unitId");
  });

  it("creates a unit-level electric meter", async () => {
    const building = await createBuilding("Electric Building");
    const unit = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "201" })
      .expect(201);

    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        unitId: unit.body.id,
        utilityType: "electric",
        source: "simulated",
        externalId: "sim-electric-201",
      })
      .expect(201);

    expect(meter.body).toMatchObject({
      unitId: unit.body.id,
      utilityType: "electric",
      supportedReadingUnits: ["kwh"],
    });
  });

  it("requires meter external IDs to be unique inside an organization", async () => {
    const building = await createBuilding("Unique Meter Building");
    const body = {
      buildingId: building.body.id,
      utilityType: "water",
      source: "simulated",
      externalId: "duplicate-meter",
    };

    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(body)
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(body)
      .expect(409)
      .expect(({ body: responseBody }) =>
        expect(responseBody.error.code).toBe("METER_EXTERNAL_ID_EXISTS"),
      );
  });

  it("rejects unit assignments outside the current organization", async () => {
    const building = await createBuilding("Tenant Boundary Meter Building");

    await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        unitId: "unit_south_101",
        utilityType: "water",
        source: "simulated",
        externalId: "bad-cross-tenant-meter",
      })
      .expect(404)
      .expect(({ body }) =>
        expect(body.error.code).toBe("TENANT_RESOURCE_NOT_FOUND"),
      );
  });

  it("archives and restores meters without physical deletion", async () => {
    const building = await createBuilding("Archive Meter Building");
    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        utilityType: "electric",
        source: "simulated",
        externalId: "archive-electric-meter",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/meters/${meter.body.id}/archive`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(meter.body.id);
        expect(body.lifecycleStatus).toBe("archived");
        expect(body.status).toBe("disabled");
        expect(body.archivedAt).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .get(`/api/v1/meters/${meter.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.lifecycleStatus).toBe("archived");
        expect(body.supportedReadingUnits).toEqual(["kwh"]);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/meters/${meter.body.id}/restore`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.lifecycleStatus).toBe("active");
        expect(body.status).toBe("online");
        expect(body).not.toHaveProperty("archivedAt");
      });
  });
});
