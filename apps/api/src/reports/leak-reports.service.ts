import type {
  LeakAnalyticsQuery,
  LeakResponseReportResponse,
} from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../common/request-context";
import { LeakAnalyticsService } from "../incidents/leak-analytics.service";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class LeakReportsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(LeakAnalyticsService)
    private readonly analytics: LeakAnalyticsService,
  ) {}

  async json(
    organizationId: string,
    query: LeakAnalyticsQuery,
  ): Promise<LeakResponseReportResponse> {
    const analytics = await this.analytics.summary(organizationId, query);
    return {
      ...analytics,
      format: "json",
      id: `leak_response_${organizationId}_${analytics.periodStart.slice(0, 10)}_${analytics.periodEnd.slice(0, 10)}`,
      organizationId,
      reportType: "leak_response",
    };
  }

  async csv(
    organizationId: string,
    query: LeakAnalyticsQuery,
  ): Promise<string> {
    const report = await this.json(organizationId, query);
    const metrics = [
      ["Period start", report.periodStart],
      ["Period end", report.periodEnd],
      ["Incident count", report.incidentCount],
      [
        "Acknowledgement median (minutes)",
        report.responseTime.acknowledged.medianMinutes ?? "",
      ],
      [
        "Containment median (minutes)",
        report.responseTime.contained.medianMinutes ?? "",
      ],
      [
        "Resolution median (minutes)",
        report.responseTime.resolved.medianMinutes ?? "",
      ],
      ["Estimated excess water (gal)", report.excessWater.gallons],
      ["Estimated excess cost", report.excessWater.estimatedCost],
    ];
    const outcomes = Object.entries(report.resolutionOutcomes).map(
      ([category, count]) => [`Resolution outcome: ${category}`, count],
    );
    const locations = report.recurringLocations.flatMap((location) => [
      [
        "Recurring location",
        `${location.buildingName}${location.unitName ? ` / ${location.unitName}` : ""}`,
      ],
      ["Location incident count", location.incidentCount],
      ["Location resolved count", location.resolvedCount],
    ]);
    return [...metrics, ...outcomes, ...locations]
      .map((row) => row.map(csvCell).join(","))
      .join("\n")
      .concat("\n");
  }

  async pdf(
    organizationId: string,
    query: LeakAnalyticsQuery,
  ): Promise<Buffer> {
    const report = await this.json(organizationId, query);
    const lines = [
      "Leak Response Report",
      `Period: ${report.periodStart} to ${report.periodEnd}`,
      `Incidents: ${report.incidentCount}`,
      `Acknowledgement median: ${formatMinutes(report.responseTime.acknowledged.medianMinutes)}`,
      `Containment median: ${formatMinutes(report.responseTime.contained.medianMinutes)}`,
      `Resolution median: ${formatMinutes(report.responseTime.resolved.medianMinutes)}`,
      `Estimated excess water: ${report.excessWater.gallons} gal`,
      `Estimated excess cost: $${report.excessWater.estimatedCost.toFixed(2)}`,
      "Resolution outcomes:",
      ...Object.entries(report.resolutionOutcomes).map(
        ([category, count]) => `- ${category}: ${count}`,
      ),
      "Recurring locations:",
      ...report.recurringLocations.map(
        (location) =>
          `- ${location.buildingName}${location.unitName ? ` / ${location.unitName}` : ""}: ${location.incidentCount}`,
      ),
    ];
    return simplePdf(lines);
  }

  async exportForContext(
    context: RequestContext,
    query: LeakAnalyticsQuery,
    format: "csv" | "pdf",
  ): Promise<Buffer | string> {
    const result =
      format === "csv"
        ? await this.csv(context.organization.id, query)
        : await this.pdf(context.organization.id, query);
    await this.persistence.createAuditLog({
      action: "report.exported",
      actorUserId: context.user.id,
      metadata: { format, reportType: "leak_response", ...query },
      organizationId: context.organization.id,
      targetId: `leak_response_${format}`,
      targetType: "report",
    });
    return result;
  }
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatMinutes(minutes?: number): string {
  return minutes === undefined
    ? "No completed incidents"
    : `${minutes} minutes`;
}

function simplePdf(lines: string[]): Buffer {
  const text = lines
    .slice(0, 42)
    .map((line, index) =>
      index === 0 ? `(${pdfText(line)}) Tj` : `0 -16 Td\n(${pdfText(line)}) Tj`,
    )
    .join("\n");
  const content = `BT\n/F1 11 Tf\n50 760 Td\n${text}\nET\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document, "utf8"));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document, "utf8");
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(document, "utf8");
}

function pdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
