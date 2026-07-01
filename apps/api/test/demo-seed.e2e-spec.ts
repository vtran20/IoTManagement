import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { RequestContext } from "../src/common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../src/persistence/persistence.service";
import { DemoSeedService } from "../src/simulations/demo-seed.service";

describe("Demo seed API", () => {
  let app: INestApplication;
  let ownerToken: string;
  let ownerContext: RequestContext;
  let persistence: PersistenceService;
  let pool: Pool;
  const schema = process.env.DATABASE_SCHEMA!;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    persistence = app.get<PersistenceService>(PERSISTENCE_SERVICE);
    const user = await persistence.findUserByEmail("owner@north.example");
    const membership = user
      ? await persistence.findPrimaryMembershipForUser(user.id)
      : undefined;
    const organization = membership
      ? await persistence.findOrganizationById(membership.organizationId)
      : undefined;
    if (!user || !membership || !organization) {
      throw new Error("Unable to resolve owner context for demo seed tests.");
    }
    ownerContext = { membership, organization, user };
    ownerToken = await login("owner@north.example");
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterEach(async () => {
    await pool.end();
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "password123" })
      .expect(201);
    return response.body.accessToken;
  }

  it("creates rich predictable demo data and is safe to run repeatedly", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/simulations/demo-seed")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          alertEventCount: 3,
          alertRuleCount: 3,
          buildingCount: 3,
          floorCount: 10,
          duplicateReadingCount: 0,
          meterCount: 43,
          reportMonth: "2026-06",
          unitCount: 40,
        });
        expect(body.acceptedReadingCount).toBe(3870);
        expect(body.aggregateCount).toBeGreaterThanOrEqual(43);
      });

    await request(app.getHttpServer())
      .get("/api/v1/buildings")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.items.map((building: { name: string }) => building.name),
        ).toEqual([
          "Demo Lakeview Apartments",
          "Demo North Ridge",
          "Demo Riverside Lofts",
        ]);
      });

    await request(app.getHttpServer())
      .get("/api/v1/floors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(10);
      });

    await request(app.getHttpServer())
      .get("/api/v1/units")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(40);
      });

    await request(app.getHttpServer())
      .get("/api/v1/meters")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(43);
        expect(
          body.items.filter((meter: { unitId?: string }) => !meter.unitId),
        ).toHaveLength(3);
        expect(
          body.items.filter(
            (meter: { status: string }) => meter.status === "stale",
          ),
        ).toHaveLength(2);
        expect(
          body.items.filter(
            (meter: { status: string }) => meter.status === "offline",
          ),
        ).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .get("/api/v1/alerts/rules")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(3);
      });

    await request(app.getHttpServer())
      .get("/api/v1/alerts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(3);
        expect(
          body.items.map((event: { title: string }) => event.title).sort(),
        ).toEqual(["Device stale", "High usage", "Outage suspected"]);
      });

    const readingSummary = await pool.query<{
      day_count: string;
      reading_count: string;
    }>(
      `SELECT count(*)::text AS reading_count,
              count(DISTINCT measured_at::date)::text AS day_count
       FROM ${schema}.meter_readings
       WHERE organization_id = 'org_north'`,
    );
    expect(Number(readingSummary.rows[0]!.reading_count)).toBe(3870);
    expect(Number(readingSummary.rows[0]!.day_count)).toBe(90);

    await request(app.getHttpServer())
      .get("/api/v1/reports/monthly-usage?month=2026-06")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.rows.length).toBeGreaterThanOrEqual(23);
        expect(body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              buildingName: "Demo North Ridge",
              unitName: "101",
            }),
            expect.objectContaining({
              buildingName: "Demo Riverside Lofts",
              unitName: "Building shared",
            }),
          ]),
        );
        expect(body.totals.electricKwh).toBeGreaterThan(0);
        expect(body.totals.waterGallons).toBeGreaterThan(0);
        expect(body.totals.estimatedCost).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .post("/api/v1/simulations/demo-seed")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.acceptedReadingCount).toBe(0);
        expect(body.duplicateReadingCount).toBe(3870);
        expect(body.buildingCount).toBe(3);
        expect(body.floorCount).toBe(10);
        expect(body.unitCount).toBe(40);
        expect(body.meterCount).toBe(43);
      });

    const idempotentCounts = await pool.query<{
      alert_events: string;
      alert_rules: string;
      buildings: string;
      floors: string;
      meters: string;
      units: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM ${schema}.buildings WHERE organization_id = 'org_north') AS buildings,
         (SELECT count(*)::text FROM ${schema}.floors WHERE organization_id = 'org_north') AS floors,
         (SELECT count(*)::text FROM ${schema}.units WHERE organization_id = 'org_north') AS units,
         (SELECT count(*)::text FROM ${schema}.meters WHERE organization_id = 'org_north') AS meters,
         (SELECT count(*)::text FROM ${schema}.alert_rules WHERE organization_id = 'org_north') AS alert_rules,
         (SELECT count(*)::text FROM ${schema}.alert_events WHERE organization_id = 'org_north') AS alert_events`,
    );
    expect(idempotentCounts.rows[0]).toEqual({
      alert_events: "3",
      alert_rules: "3",
      buildings: "3",
      floors: "10",
      meters: "43",
      units: "40",
    });
  }, 60000);

  it("resets only local demo data for the current organization", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/simulations/demo-seed")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect((response) => {
        expect([200, 201]).toContain(response.status);
      });

    const southBefore = await pool.query<{ count: string }>(
      `SELECT count(*)::text FROM ${schema}.buildings WHERE organization_id = 'org_south'`,
    );

    const demoSeedService = app.get(DemoSeedService) as DemoSeedService & {
      resetDemoData?: (context: RequestContext) => Promise<unknown>;
    };
    expect(demoSeedService.resetDemoData).toBeTypeOf("function");
    await demoSeedService.resetDemoData!(ownerContext);

    const northAfter = await pool.query<{
      alert_events: string;
      alert_rules: string;
      buildings: string;
      floors: string;
      meters: string;
      readings: string;
      units: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM ${schema}.buildings WHERE organization_id = 'org_north') AS buildings,
         (SELECT count(*)::text FROM ${schema}.floors WHERE organization_id = 'org_north') AS floors,
         (SELECT count(*)::text FROM ${schema}.units WHERE organization_id = 'org_north') AS units,
         (SELECT count(*)::text FROM ${schema}.meters WHERE organization_id = 'org_north') AS meters,
         (SELECT count(*)::text FROM ${schema}.meter_readings WHERE organization_id = 'org_north') AS readings,
         (SELECT count(*)::text FROM ${schema}.alert_rules WHERE organization_id = 'org_north') AS alert_rules,
         (SELECT count(*)::text FROM ${schema}.alert_events WHERE organization_id = 'org_north') AS alert_events`,
    );
    expect(northAfter.rows[0]).toEqual({
      alert_events: "0",
      alert_rules: "0",
      buildings: "0",
      floors: "0",
      meters: "0",
      readings: "0",
      units: "0",
    });

    const southAfter = await pool.query<{ count: string }>(
      `SELECT count(*)::text FROM ${schema}.buildings WHERE organization_id = 'org_south'`,
    );
    expect(southAfter.rows[0]!.count).toBe(southBefore.rows[0]!.count);
  }, 60000);
});
