import type {
  CreateVendorRequest,
  UpdateVendorRequest,
  Vendor,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";

@Injectable()
export class VendorsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async list(context: RequestContext): Promise<{ items: Vendor[] }> {
    return {
      items: await this.persistence.listVendors({
        organizationId: context.organization.id,
      }),
    };
  }

  async create(
    context: RequestContext,
    dto: CreateVendorRequest,
  ): Promise<Vendor> {
    const now = new Date().toISOString();
    const vendor = await this.persistence.createVendor({
      companyName: this.requireText(
        dto.companyName,
        "VENDOR_COMPANY_NAME_REQUIRED",
      ),
      trade: this.requireText(dto.trade, "VENDOR_TRADE_REQUIRED"),
      contactName: this.optionalText(dto.contactName),
      phone: this.optionalText(dto.phone),
      email: this.optionalText(dto.email),
      organizationId: context.organization.id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await this.persistence.createAuditLog({
      action: "vendor.created",
      actorUserId: context.user.id,
      metadata: { trade: vendor.trade },
      organizationId: context.organization.id,
      targetId: vendor.id,
      targetType: "vendor",
    });
    return vendor;
  }

  async update(
    context: RequestContext,
    vendorId: string,
    dto: UpdateVendorRequest,
  ): Promise<Vendor> {
    const current = await this.persistence.findVendorById(
      context.organization.id,
      vendorId,
    );
    if (!current) throw tenantResourceNotFound("Vendor");
    const updated = await this.persistence.updateVendor(
      context.organization.id,
      vendorId,
      {
        ...(dto.companyName === undefined
          ? {}
          : {
              companyName: this.requireText(
                dto.companyName,
                "VENDOR_COMPANY_NAME_REQUIRED",
              ),
            }),
        ...(dto.trade === undefined
          ? {}
          : { trade: this.requireText(dto.trade, "VENDOR_TRADE_REQUIRED") }),
        ...(dto.contactName === undefined
          ? {}
          : { contactName: this.optionalText(dto.contactName) }),
        ...(dto.phone === undefined
          ? {}
          : { phone: this.optionalText(dto.phone) }),
        ...(dto.email === undefined
          ? {}
          : { email: this.optionalText(dto.email) }),
        ...(dto.status === undefined
          ? {}
          : { status: this.validateStatus(dto.status) }),
        updatedAt: new Date().toISOString(),
      },
    );
    const vendor = updated!;
    await this.persistence.createAuditLog({
      action:
        vendor.status === "archived" && current.status !== "archived"
          ? "vendor.archived"
          : "vendor.updated",
      actorUserId: context.user.id,
      metadata: { fields: Object.keys(dto) },
      organizationId: context.organization.id,
      targetId: vendor.id,
      targetType: "vendor",
    });
    return vendor;
  }

  private requireText(value: unknown, code: string): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized)
      throw new ApiError(
        code,
        "A non-empty value is required",
        HttpStatus.BAD_REQUEST,
      );
    return normalized;
  }

  private optionalText(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    return this.requireText(value, "VENDOR_CONTACT_VALUE_INVALID");
  }

  private validateStatus(value: unknown): Vendor["status"] {
    if (value !== "active" && value !== "archived") {
      throw new ApiError(
        "VENDOR_STATUS_INVALID",
        "Vendor status must be active or archived",
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }
}
