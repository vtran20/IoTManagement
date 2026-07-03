import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseService } from "../src/database/database.service";
import { runMigrations } from "../src/migrate";
import { PostgresPersistenceService } from "../src/persistence/postgres-persistence.service";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://iot_local:iot_local_password@localhost:5432/iot_management";

describe("PostgresPersistenceService", () => {
  let database: DatabaseService;
  let persistence: PostgresPersistenceService;
  let pool: Pool;
  let schema: string;

  beforeAll(async () => {
    schema = `test_persistence_${randomUUID().replace(/-/g, "_")}`;
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query(`CREATE SCHEMA ${schema}`);
    await runMigrations({ databaseUrl, schema });
    database = new DatabaseService({ databaseUrl, schema });
    persistence = new PostgresPersistenceService(database);
    await persistence.ensureBootstrapData();
  });

  afterAll(async () => {
    await database?.onModuleDestroy();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await pool.end();
    }
  });

  it("persists tenant, portfolio, meter, reading, aggregate, and alert data", async () => {
    const user = await persistence.findUserByEmail("owner@north.example");
    expect(user?.id).toBe("user_north_owner");

    const membership =
      await persistence.findPrimaryMembershipForUser("user_north_owner");
    expect(membership).toMatchObject({
      organizationId: "org_north",
      role: "owner",
    });

    const organization = await persistence.findOrganizationById("org_north");
    expect(organization?.name).toBe("North Properties");

    const building = await persistence.createBuilding({
      address: "1 Persistence Way",
      name: "Persistence Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const floor = await persistence.createFloor({
      buildingId: building.id,
      level: 7,
      name: "Level 7",
      organizationId: "org_north",
    });
    const unit = await persistence.createUnit({
      buildingId: building.id,
      floorId: floor.id,
      name: "701",
      occupancyStatus: "occupied",
      organizationId: "org_north",
    });
    const meter = await persistence.createMeter({
      buildingId: building.id,
      externalId: "persistence-water-701",
      organizationId: "org_north",
      source: "simulated",
      unitId: unit.id,
      utilityType: "water",
    });

    const reading = await persistence.createReading({
      measuredAt: "2026-06-30T10:00:00.000Z",
      meterId: meter.id,
      organizationId: "org_north",
      readingKind: "interval",
      receivedAt: "2026-06-30T10:01:00.000Z",
      unit: "gallon",
      utilityType: "water",
      value: 42.5,
    });
    const duplicate = await persistence.findReadingByMeterAndMeasuredAt(
      "org_north",
      meter.id,
      reading.measuredAt,
    );

    const aggregates = await persistence.replaceUsageAggregates({
      organizationId: "org_north",
      periodType: "month",
      aggregates: [
        {
          buildingId: building.id,
          costEstimate: 12.34,
          meterId: meter.id,
          organizationId: "org_north",
          periodEnd: "2026-07-01T00:00:00.000Z",
          periodStart: "2026-06-01T00:00:00.000Z",
          periodType: "month",
          unitId: unit.id,
          usageValue: 42.5,
          utilityType: "water",
        },
      ],
    });

    const rule = await persistence.createAlertRule({
      conditionType: "high_usage",
      name: "Persistence high usage",
      organizationId: "org_north",
      scopeType: "meter",
      scopeId: meter.id,
      threshold: 10,
      utilityType: "water",
      windowMinutes: 60,
    });
    const event = await persistence.createAlertEvent({
      message: "Usage crossed threshold",
      organizationId: "org_north",
      ruleId: rule.id,
      severity: "warning",
      title: "High usage",
      triggeredAt: "2026-06-30T10:05:00.000Z",
    });

    expect(
      await persistence.findBuildingById("org_north", building.id),
    ).toEqual(building);
    expect(await persistence.findUnitById("org_north", unit.id)).toEqual(unit);
    expect(
      await persistence.findMeterByExternalId(
        "org_north",
        "persistence-water-701",
      ),
    ).toEqual(meter);
    expect(duplicate).toEqual(reading);
    expect(aggregates).toHaveLength(1);
    expect(
      await persistence.listUsageAggregates({
        organizationId: "org_north",
        periodType: "month",
      }),
    ).toHaveLength(1);
    expect(await persistence.findAlertRuleById("org_north", rule.id)).toEqual(
      rule,
    );
    expect(await persistence.findAlertEventById("org_north", event.id)).toEqual(
      event,
    );
  });

  it("returns dashboard aggregates grouped in PostgreSQL with portfolio names", async () => {
    const firstBuilding = await persistence.createBuilding({
      name: "Grouped First Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const secondBuilding = await persistence.createBuilding({
      name: "Grouped Second Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const firstUnit = await persistence.createUnit({
      buildingId: firstBuilding.id,
      name: "1101",
      occupancyStatus: "occupied",
      organizationId: "org_north",
    });
    const secondUnit = await persistence.createUnit({
      buildingId: secondBuilding.id,
      name: "2201",
      occupancyStatus: "occupied",
      organizationId: "org_north",
    });
    const firstMeter = await persistence.createMeter({
      buildingId: firstBuilding.id,
      externalId: "grouped-first-water",
      organizationId: "org_north",
      source: "simulated",
      unitId: firstUnit.id,
      utilityType: "water",
    });
    const secondMeter = await persistence.createMeter({
      buildingId: secondBuilding.id,
      externalId: "grouped-second-water",
      organizationId: "org_north",
      source: "simulated",
      unitId: secondUnit.id,
      utilityType: "water",
    });

    for (const [buildingId, meterId, unitId, usageValue] of [
      [firstBuilding.id, firstMeter.id, firstUnit.id, 12],
      [secondBuilding.id, secondMeter.id, secondUnit.id, 8],
    ] as const) {
      await persistence.createUsageAggregate({
        buildingId,
        meterId,
        organizationId: "org_north",
        periodEnd: "2026-06-30T00:00:00.000Z",
        periodStart: "2026-06-29T00:00:00.000Z",
        periodType: "day",
        unitId,
        usageValue,
        utilityType: "water",
      });
    }

    const query = {
      from: "2026-06-01T00:00:00.000Z",
      organizationId: "org_north",
      periodType: "day" as const,
      to: "2026-07-01T00:00:00.000Z",
    };

    await expect(
      persistence.listDashboardTrendAggregates(query),
    ).resolves.toEqual([
      expect.objectContaining({
        periodStart: "2026-06-29T00:00:00.000Z",
        usageValue: 20,
        utilityType: "water",
      }),
    ]);
    await expect(
      persistence.listDashboardBuildingAggregates(query),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          buildingName: "Grouped First Tower",
          usageValue: 12,
        }),
        expect.objectContaining({
          buildingName: "Grouped Second Tower",
          usageValue: 8,
        }),
      ]),
    );
    await expect(
      persistence.listDashboardUnitAggregates({ ...query, limit: 1 }),
    ).resolves.toEqual([
      expect.objectContaining({
        buildingName: "Grouped First Tower",
        unitName: "1101",
        usageValue: 12,
      }),
    ]);
  });

  it("installs dashboard performance indexes", async () => {
    const result = await pool.query<{ indexname: string }>(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = $1
         AND tablename IN ('usage_aggregates', 'alert_events')`,
      [schema],
    );

    expect(result.rows.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        "usage_aggregates_dashboard_window_idx",
        "usage_aggregates_dashboard_building_idx",
        "usage_aggregates_dashboard_utility_idx",
        "alert_events_dashboard_open_idx",
      ]),
    );
  });

  it("persists leak repair work orders with their incident context", async () => {
    const building = await persistence.createBuilding({
      name: "Work Order Persistence Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const incident = await persistence.createLeakIncident({
      buildingId: building.id,
      description: "Water is dripping from a supply line.",
      detectedAt: "2026-07-03T10:00:00.000Z",
      organizationId: "org_north",
      severity: "critical",
      source: "manual_report",
      title: "Supply line leak",
    });
    const workOrder = await persistence.createWorkOrder({
      assignedMembershipId: "membership_north_manager",
      buildingId: building.id,
      createdAt: "2026-07-03T10:01:00.000Z",
      description: "Replace the failed supply-line fitting.",
      dueAt: "2026-07-04T10:00:00.000Z",
      incidentId: incident.id,
      organizationId: "org_north",
      priority: "critical",
      status: "assigned",
      title: "Repair supply line",
      updatedAt: "2026-07-03T10:01:00.000Z",
    });

    await expect(
      persistence.findWorkOrderById("org_north", workOrder.id),
    ).resolves.toEqual(workOrder);
    await expect(
      persistence.listWorkOrders({
        incidentId: incident.id,
        organizationId: "org_north",
      }),
    ).resolves.toEqual([workOrder]);
  });
});
