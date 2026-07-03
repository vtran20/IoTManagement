import type { LeakDetectionPolicyResponse } from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { CreateLeakDetectionPolicyDto } from "./dto/create-leak-detection-policy.dto";

@Injectable()
export class LeakDetectionPoliciesService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(
    context: RequestContext,
    dto: CreateLeakDetectionPolicyDto,
  ): Promise<LeakDetectionPolicyResponse> {
    this.validateNumbers(dto);
    await this.validateScope(context, dto);
    const policy = await this.persistence.createLeakDetectionPolicy({
      ...dto,
      organizationId: context.organization.id,
    });
    await this.persistence.createAuditLog({
      action: "leak_detection_policy.created",
      actorUserId: context.user.id,
      metadata: { scopeType: policy.scopeType },
      organizationId: context.organization.id,
      targetId: policy.id,
      targetType: "leak_detection_policy",
    });
    return policy;
  }

  async list(context: RequestContext) {
    return {
      items: await this.persistence.listLeakDetectionPolicies({
        organizationId: context.organization.id,
      }),
    };
  }

  private validateNumbers(dto: CreateLeakDetectionPolicyDto) {
    if (
      !Number.isFinite(dto.minimumIntervalUsage) ||
      dto.minimumIntervalUsage < 0 ||
      !Number.isInteger(dto.minimumConsecutiveIntervals) ||
      dto.minimumConsecutiveIntervals < 2 ||
      !Number.isInteger(dto.maximumIntervalGapMinutes) ||
      dto.maximumIntervalGapMinutes < 1
    ) {
      throw new ApiError(
        "INVALID_LEAK_DETECTION_POLICY",
        "Leak detection policy thresholds are invalid",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async validateScope(
    context: RequestContext,
    dto: CreateLeakDetectionPolicyDto,
  ) {
    if (dto.scopeType === "organization") {
      if (!dto.scopeId) return;
      throw new ApiError(
        "INVALID_LEAK_DETECTION_SCOPE",
        "Organization policies cannot have a scopeId",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!dto.scopeId) {
      throw new ApiError(
        "INVALID_LEAK_DETECTION_SCOPE",
        "Scoped leak detection policies require a scopeId",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (dto.scopeType === "building") {
      if (
        !(await this.persistence.findBuildingById(
          context.organization.id,
          dto.scopeId,
        ))
      ) {
        throw tenantResourceNotFound("Building");
      }
      return;
    }
    if (dto.scopeType === "unit") {
      if (
        !(await this.persistence.findUnitById(
          context.organization.id,
          dto.scopeId,
        ))
      ) {
        throw tenantResourceNotFound("Unit");
      }
      return;
    }
    const meter = await this.persistence.findMeterById(
      context.organization.id,
      dto.scopeId,
    );
    if (!meter || meter.utilityType !== "water") {
      throw tenantResourceNotFound("Water meter");
    }
  }
}
