import type { AlertRuleResponse } from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { CreateAlertRuleDto } from "./dto/create-alert-rule.dto";
import { UpdateAlertRuleDto } from "./dto/update-alert-rule.dto";

@Injectable()
export class AlertRulesService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  create(context: RequestContext, dto: CreateAlertRuleDto): AlertRuleResponse {
    return this.persistence.createAlertRule({
      conditionType: dto.conditionType,
      enabled: dto.enabled ?? true,
      name: dto.name,
      organizationId: context.organization.id,
      scopeId: dto.scopeId,
      scopeType: dto.scopeType,
      threshold: dto.threshold,
      utilityType: dto.utilityType,
      windowMinutes: dto.windowMinutes,
    });
  }

  list(context: RequestContext) {
    return {
      items: this.persistence.listAlertRules({
        organizationId: context.organization.id,
      }),
    };
  }

  update(
    context: RequestContext,
    ruleId: string,
    dto: UpdateAlertRuleDto,
  ): AlertRuleResponse {
    const rule = this.persistence.updateAlertRule(
      context.organization.id,
      ruleId,
      dto,
    );
    if (!rule) {
      throw tenantResourceNotFound("Alert rule");
    }
    return rule;
  }
}
