import type { Membership, Organization, User } from "@iot-management/types";
import type { Request } from "express";
import type { StoredSession } from "../persistence/persistence.service";

export interface RequestContext {
  membership: Membership;
  organization: Organization;
  user: User;
}

export interface RequestWithContext extends Request {
  auth?: {
    scheme: "bearer" | "session";
    session?: StoredSession;
    sessionToken?: string;
  };
  context?: RequestContext;
  requestId?: string;
}
