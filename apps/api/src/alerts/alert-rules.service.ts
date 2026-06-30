import type { AlertRuleResponse } from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { CreateAlertRuleDto } from "./dto/create-alert-rule.dto";
import { UpdateAlertRuleDto } from "./dto/update-alert-rule.dto";

@Injectable()
export class AlertRulesService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(
    context: RequestContext,
    dto: CreateAlertRuleDto,
  ): Promise<AlertRuleResponse> {
    return await this.persistence.createAlertRule({
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

  async list(context: RequestContext) {
    return {
      items: await this.persistence.listAlertRules({
        organizationId: context.organization.id,
      }),
    };
  }

  async update(
    context: RequestContext,
    ruleId: string,
    dto: UpdateAlertRuleDto,
  ): Promise<AlertRuleResponse> {
    const rule = await this.persistence.updateAlertRule(
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
