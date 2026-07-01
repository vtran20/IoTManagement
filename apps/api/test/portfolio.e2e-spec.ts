import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Portfolio API", () => {
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

  it("creates and lists buildings inside the current organization", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "North Tower",
        address: "100 Main St",
        timezone: "America/Detroit",
      })
      .expect(201);

    expect(created.body).toMatchObject({
      name: "North Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });

    const list = await request(app.getHttpServer())
      .get("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    expect(list.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.body.id }),
      ]),
    );
    expect(list.body.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ organizationId: "org_south" }),
      ]),
    );
  });

  it("gets and updates a building in the current organization", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Meter Lab", timezone: "America/Detroit" })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/buildings/${created.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.name).toBe("Meter Lab"));

    await request(app.getHttpServer())
      .patch(`/api/v1/buildings/${created.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Meter Lab East" })
      .expect(200)
      .expect(({ body }) => expect(body.name).toBe("Meter Lab East"));
  });

  it("creates floors and units under a current-organization building", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Unit Building", timezone: "America/Detroit" })
      .expect(201);

    const floor = await request(app.getHttpServer())
      .post("/api/v1/floors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "Level 1", level: 1 })
      .expect(201);

    expect(floor.body).toMatchObject({
      buildingId: building.body.id,
      name: "Level 1",
      organizationId: "org_north",
    });

    const unit = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        floorId: floor.body.id,
        name: "101",
      })
      .expect(201);

    expect(unit.body).toMatchObject({
      buildingId: building.body.id,
      floorId: floor.body.id,
      name: "101",
      occupancyStatus: "vacant",
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/units/${unit.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ occupancyStatus: "occupied" })
      .expect(200)
      .expect(({ body }) => expect(body.occupancyStatus).toBe("occupied"));
  });

  it("does not expose another organization's buildings", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/buildings/building_south")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(404)
      .expect(({ body }) =>
        expect(body.error.code).toBe("TENANT_RESOURCE_NOT_FOUND"),
      );
  });

  it("returns building detail with child floors, units, and meters", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Detail Building", timezone: "America/Detroit" })
      .expect(201);
    const floor = await request(app.getHttpServer())
      .post("/api/v1/floors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "Level 4", level: 4 })
      .expect(201);
    const unit = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        floorId: floor.body.id,
        name: "401",
      })
      .expect(201);
    const meter = await request(app.getHttpServer())
      .post("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buildingId: building.body.id,
        unitId: unit.body.id,
        utilityType: "water",
        source: "simulated",
        externalId: "detail-building-water-401",
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/buildings/${building.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.building).toMatchObject({
          id: building.body.id,
          lifecycleStatus: "active",
        });
        expect(body.floors).toEqual([
          expect.objectContaining({ id: floor.body.id }),
        ]);
        expect(body.units).toEqual([
          expect.objectContaining({ id: unit.body.id }),
        ]);
        expect(body.meters).toEqual([
          expect.objectContaining({ id: meter.body.id }),
        ]);
      });
  });

  it("archives and restores buildings while blocking child creation under archived parents", async () => {
    const building = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Archive Building", timezone: "America/Detroit" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${building.body.id}/archive`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.lifecycleStatus).toBe("archived");
        expect(body.archivedAt).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .post("/api/v1/floors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "Blocked", level: 9 })
      .expect(409)
      .expect(({ body }) => expect(body.error.code).toBe("PARENT_ARCHIVED"));

    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${building.body.id}/restore`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.lifecycleStatus).toBe("active");
        expect(body).not.toHaveProperty("archivedAt");
      });

    await request(app.getHttpServer())
      .post("/api/v1/floors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: building.body.id, name: "Allowed", level: 1 })
      .expect(201);
  });

  it("rejects moving a unit to a floor in a different building", async () => {
    const firstBuilding = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Move Source", timezone: "America/Detroit" })
      .expect(201);
    const secondBuilding = await request(app.getHttpServer())
      .post("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Move Target", timezone: "America/Detroit" })
      .expect(201);
    const targetFloor = await request(app.getHttpServer())
      .post("/api/v1/floors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: secondBuilding.body.id, name: "Other", level: 2 })
      .expect(201);
    const unit = await request(app.getHttpServer())
      .post("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buildingId: firstBuilding.body.id, name: "101" })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/units/${unit.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ floorId: targetFloor.body.id })
      .expect(404)
      .expect(({ body }) =>
        expect(body.error.code).toBe("TENANT_RESOURCE_NOT_FOUND"),
      );
  });
});
