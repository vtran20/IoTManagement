import type { Membership, Organization, User } from "@iot-management/types";
import type { Request } from "express";

export interface RequestContext {
  membership: Membership;
  organization: Organization;
  user: User;
}

export interface RequestWithContext extends Request {
  context?: RequestContext;
}
