import type {
  MonthlyUsageReportColumn,
  MonthlyUsageReportQuery,
  MonthlyUsageReportResponse,
  MonthlyUsageReportRow,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async monthlyUsage(
    organizationId: string,
    query: MonthlyUsageReportQuery,
  ): Promise<MonthlyUsageReportResponse> {
    const periodStart = monthStart(query.month);
    const periodEnd = monthEnd(periodStart);
    const grouped = new Map<string, MonthlyUsageReportRow>();

    for (const aggregate of await this.persistence.listUsageAggregates({
      buildingId: query.buildingId,
      from: periodStart,
      organizationId,
      periodType: "month",
      to: periodEnd,
      unitId: query.unitId,
    })) {
      const building = await this.persistence.findBuildingById(
        organizationId,
        aggregate.buildingId,
      );
      const unit = aggregate.unitId
        ? await this.persistence.findUnitById(organizationId, aggregate.unitId)
        : undefined;
      const key = `${aggregate.buildingId}:${aggregate.unitId ?? "shared"}`;
      const existing = grouped.get(key) ?? {
        buildingId: aggregate.buildingId,
        buildingName: building?.name ?? aggregate.buildingId,
        electricKwh: 0,
        estimatedCost: 0,
        unitId: aggregate.unitId,
        unitName: unit?.name ?? "Building shared",
        waterGallons: 0,
      };

      if (aggregate.utilityType === "water") {
        existing.waterGallons = roundUsage(
          existing.waterGallons + aggregate.usageValue,
        );
      } else {
        existing.electricKwh = roundUsage(
          existing.electricKwh + aggregate.usageValue,
        );
      }
      existing.estimatedCost = roundMoney(
        existing.estimatedCost + (aggregate.costEstimate ?? 0),
      );
      grouped.set(key, existing);
    }

    const rows = [...grouped.values()].sort((left, right) =>
      left.buildingName === right.buildingName
        ? left.unitName.localeCompare(right.unitName)
        : left.buildingName.localeCompare(right.buildingName),
    );

    return {
      columns: monthlyUsageColumns,
      format: "json",
      generatedAt: new Date().toISOString(),
      id: `monthly_usage_${organizationId}_${query.month}`,
      organizationId,
      periodEnd,
      periodStart,
      reportType: "usage_summary",
      rows,
      totals: {
        electricKwh: roundUsage(
          rows.reduce((sum, row) => sum + row.electricKwh, 0),
        ),
        estimatedCost: roundMoney(
          rows.reduce((sum, row) => sum + row.estimatedCost, 0),
        ),
        waterGallons: roundUsage(
          rows.reduce((sum, row) => sum + row.waterGallons, 0),
        ),
      },
    };
  }

  async monthlyUsageCsv(
    organizationId: string,
    query: MonthlyUsageReportQuery,
  ): Promise<string> {
    const report = await this.monthlyUsage(organizationId, query);
    const header = report.columns.map((column) => csvCell(column.label));
    const rows = report.rows.map((row) =>
      [
        row.buildingName,
        row.unitName,
        row.waterGallons,
        row.electricKwh,
        row.estimatedCost,
      ].map(csvCell),
    );
    return [header, ...rows].map((row) => row.join(",")).join("\n") + "\n";
  }
}

const monthlyUsageColumns: MonthlyUsageReportColumn[] = [
  { key: "buildingName", label: "Building" },
  { key: "unitName", label: "Unit" },
  { key: "waterGallons", label: "Water (gal)" },
  { key: "electricKwh", label: "Electric (kWh)" },
  { key: "estimatedCost", label: "Estimated cost" },
];

function monthStart(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new ApiError(
      "INVALID_REPORT_MONTH",
      "Report month must use YYYY-MM format",
      HttpStatus.BAD_REQUEST,
    );
  }

  const date = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      "INVALID_REPORT_MONTH",
      "Report month must use a valid calendar month",
      HttpStatus.BAD_REQUEST,
    );
  }

  return date.toISOString();
}

function monthEnd(periodStart: string): string {
  const date = new Date(periodStart);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

function roundUsage(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
