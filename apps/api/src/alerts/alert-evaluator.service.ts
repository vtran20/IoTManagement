import type {
  AlertConditionType,
  AlertEvent,
  AlertRule,
  Meter,
  UsageAggregate,
} from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";

export interface EvaluateAlertsInput {
  now?: string;
  organizationId: string;
}

export interface EvaluateAlertsResponse {
  createdCount: number;
  events: AlertEvent[];
}

@Injectable()
export class AlertEvaluatorService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  evaluate(input: EvaluateAlertsInput): EvaluateAlertsResponse {
    const now = input.now ?? new Date().toISOString();
    const events: AlertEvent[] = [];
    const rules = this.persistence
      .listAlertRules({ organizationId: input.organizationId })
      .filter((rule) => rule.enabled);

    for (const rule of rules) {
      if (
        this.persistence.findOpenAlertForRule(input.organizationId, rule.id)
      ) {
        continue;
      }

      const event = this.evaluateRule(input.organizationId, rule, now);
      if (event) {
        events.push(event);
      }
    }

    return { createdCount: events.length, events };
  }

  private evaluateRule(
    organizationId: string,
    rule: AlertRule,
    now: string,
  ): AlertEvent | undefined {
    if (rule.conditionType === "high_usage") {
      return this.evaluateHighUsage(organizationId, rule, now);
    }
    if (rule.conditionType === "leak_suspected") {
      return this.evaluateLeak(organizationId, rule, now);
    }
    if (rule.conditionType === "stale_device") {
      return this.evaluateDeviceCondition(
        organizationId,
        rule,
        now,
        "stale_device",
      );
    }
    return this.evaluateDeviceCondition(
      organizationId,
      rule,
      now,
      "outage_suspected",
    );
  }

  private evaluateHighUsage(
    organizationId: string,
    rule: AlertRule,
    now: string,
  ) {
    const aggregates = this.windowAggregates(organizationId, rule, now);
    const total = aggregates.reduce(
      (sum, aggregate) => sum + aggregate.usageValue,
      0,
    );
    if (total <= (rule.threshold ?? Number.POSITIVE_INFINITY)) {
      return undefined;
    }
    return this.persistence.createAlertEvent({
      message: `${rule.name} exceeded ${rule.threshold} with ${round(total)} usage`,
      organizationId,
      ruleId: rule.id,
      severity: "warning",
      title: "High usage",
      triggeredAt: now,
    });
  }

  private evaluateLeak(organizationId: string, rule: AlertRule, now: string) {
    const threshold = rule.threshold ?? 0;
    const aggregates = this.windowAggregates(organizationId, rule, now).filter(
      (aggregate) => aggregate.utilityType === "water",
    );
    if (
      aggregates.length < 2 ||
      !aggregates.every((aggregate) => aggregate.usageValue > threshold)
    ) {
      return undefined;
    }
    return this.persistence.createAlertEvent({
      message: `${rule.name} detected continuous water usage`,
      organizationId,
      ruleId: rule.id,
      severity: "critical",
      title: "Leak suspected",
      triggeredAt: now,
    });
  }

  private evaluateDeviceCondition(
    organizationId: string,
    rule: AlertRule,
    now: string,
    conditionType: Extract<
      AlertConditionType,
      "outage_suspected" | "stale_device"
    >,
  ) {
    const meters = this.scopedMeters(organizationId, rule);
    const matched = meters.find((meter) =>
      conditionType === "outage_suspected"
        ? meter.status === "offline"
        : this.isStale(meter, now, rule.windowMinutes),
    );
    if (!matched) {
      return undefined;
    }
    return this.persistence.createAlertEvent({
      message:
        conditionType === "outage_suspected"
          ? `${matched.externalId} is offline`
          : `${matched.externalId} has not reported within ${rule.windowMinutes} minutes`,
      organizationId,
      ruleId: rule.id,
      severity: conditionType === "outage_suspected" ? "critical" : "warning",
      title:
        conditionType === "outage_suspected"
          ? "Outage suspected"
          : "Device stale",
      triggeredAt: now,
    });
  }

  private windowAggregates(
    organizationId: string,
    rule: AlertRule,
    now: string,
  ): UsageAggregate[] {
    const from = new Date(now);
    from.setUTCMinutes(from.getUTCMinutes() - rule.windowMinutes);
    return this.persistence.listUsageAggregates({
      buildingId: rule.scopeType === "building" ? rule.scopeId : undefined,
      from: from.toISOString(),
      meterId: rule.scopeType === "meter" ? rule.scopeId : undefined,
      organizationId,
      periodType: "hour",
      to: now,
      unitId: rule.scopeType === "unit" ? rule.scopeId : undefined,
      utilityType: rule.utilityType,
    });
  }

  private scopedMeters(organizationId: string, rule: AlertRule): Meter[] {
    return this.persistence
      .listMeters({
        buildingId: rule.scopeType === "building" ? rule.scopeId : undefined,
        organizationId,
        unitId: rule.scopeType === "unit" ? rule.scopeId : undefined,
        utilityType: rule.utilityType,
      })
      .filter(
        (meter) => rule.scopeType !== "meter" || meter.id === rule.scopeId,
      );
  }

  private isStale(meter: Meter, now: string, windowMinutes: number): boolean {
    if (meter.status !== "online" || !meter.lastReadingAt) {
      return false;
    }
    const elapsedMs =
      new Date(now).getTime() - new Date(meter.lastReadingAt).getTime();
    return elapsedMs > windowMinutes * 60 * 1000;
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
