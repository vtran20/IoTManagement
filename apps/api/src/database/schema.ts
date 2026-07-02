import type { ColumnType, Generated } from "kysely";

type Timestamp = ColumnType<Date, string | Date, string | Date>;
type Numeric = ColumnType<string, string | number, string | number>;

export interface DatabaseSchema {
  alert_events: AlertEventRow;
  alert_rules: AlertRuleRow;
  audit_logs: AuditLogRow;
  incident_activities: IncidentActivityRow;
  buildings: BuildingRow;
  floors: FloorRow;
  invitations: InvitationRow;
  leak_incidents: LeakIncidentRow;
  memberships: MembershipRow;
  meter_readings: MeterReadingRow;
  meters: MeterRow;
  organizations: OrganizationRow;
  organization_utility_rates: OrganizationUtilityRatesRow;
  password_reset_tokens: PasswordResetTokenRow;
  schema_migrations: SchemaMigrationRow;
  email_outbox: EmailOutboxRow;
  sessions: SessionRow;
  units: UnitRow;
  usage_aggregates: UsageAggregateRow;
  users: UserRow;
}

export interface OrganizationRow {
  id: string;
  name: string;
  status: "active" | "disabled";
  created_at: Timestamp;
}

export interface OrganizationUtilityRatesRow {
  organization_id: string;
  water_per_gallon: Numeric;
  electric_per_kwh: Numeric;
  updated_at: Timestamp;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Timestamp;
}

export interface PasswordResetTokenRow {
  id: string;
  token_hash: string;
  user_id: string;
  created_at: Timestamp;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  requested_ip: string | null;
  user_agent: string | null;
}

export interface EmailOutboxRow {
  id: string;
  to_email: string;
  subject: string;
  text_body: string;
  html_body: string | null;
  status: "queued" | "sent" | "failed";
  created_at: Timestamp;
  sent_at: Timestamp | null;
}

export interface MembershipRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "manager" | "viewer" | "tenant";
  status: "active" | "disabled";
}

export interface InvitationRow {
  id: string;
  token_hash: string;
  organization_id: string;
  inviter_user_id: string;
  email: string;
  role: "owner" | "manager" | "viewer" | "tenant";
  created_at: Timestamp;
  expires_at: Timestamp;
  accepted_at: Timestamp | null;
  revoked_at: Timestamp | null;
}

export interface LeakIncidentRow {
  id: string;
  organization_id: string;
  building_id: string;
  unit_id: string | null;
  meter_id: string | null;
  source: "manual_report" | "meter_anomaly" | "moisture_sensor";
  severity: "info" | "warning" | "critical";
  status:
    | "open"
    | "acknowledged"
    | "investigating"
    | "contained"
    | "monitoring"
    | "resolved";
  title: string;
  description: string;
  detected_at: Timestamp;
  acknowledged_at: Timestamp | null;
  investigating_at: Timestamp | null;
  contained_at: Timestamp | null;
  monitoring_at: Timestamp | null;
  resolved_at: Timestamp | null;
  resolution_category:
    | "leak_fixed"
    | "false_positive"
    | "planned_usage"
    | "sensor_fault"
    | "other"
    | null;
  resolution_note: string | null;
}

export interface IncidentActivityRow {
  id: string;
  organization_id: string;
  incident_id: string;
  actor_user_id: string | null;
  type:
    | "opened"
    | "acknowledged"
    | "investigating"
    | "contained"
    | "monitoring"
    | "resolved"
    | "note";
  summary: string;
  created_at: Timestamp;
}

export interface AuditLogRow {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: unknown;
  created_at: Timestamp;
}

export interface SessionRow {
  id: string;
  token_hash: string;
  user_id: string;
  organization_id: string;
  membership_id: string;
  created_at: Timestamp;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  user_agent: string | null;
  ip_address: string | null;
}

export interface BuildingRow {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  timezone: string;
  lifecycle_status: "active" | "archived";
  archived_at: Timestamp | null;
}

export interface FloorRow {
  id: string;
  organization_id: string;
  building_id: string;
  name: string;
  level: number;
  lifecycle_status: "active" | "archived";
  archived_at: Timestamp | null;
}

export interface UnitRow {
  id: string;
  organization_id: string;
  building_id: string;
  floor_id: string | null;
  name: string;
  occupancy_status: "occupied" | "vacant" | "maintenance";
  lifecycle_status: "active" | "archived";
  archived_at: Timestamp | null;
}

export interface MeterRow {
  id: string;
  organization_id: string;
  building_id: string;
  floor_id: string | null;
  unit_id: string | null;
  utility_type: "water" | "electric";
  source: "simulated" | "gateway" | "direct_api" | "mqtt";
  external_id: string;
  status: "online" | "offline" | "stale" | "disabled";
  installed_at: Timestamp | null;
  last_reading_at: Timestamp | null;
  lifecycle_status: "active" | "archived";
  archived_at: Timestamp | null;
}

export interface MeterReadingRow {
  id: string;
  organization_id: string;
  meter_id: string;
  measured_at: Timestamp;
  utility_type: "water" | "electric";
  value: Numeric;
  unit: "gallon" | "liter" | "kwh";
  reading_kind: "cumulative" | "interval";
  quality: "good" | "estimated" | "duplicate" | "invalid";
  received_at: Timestamp;
}

export interface UsageAggregateRow {
  id: string;
  organization_id: string;
  meter_id: string;
  building_id: string;
  unit_id: string | null;
  utility_type: "water" | "electric";
  period_start: Timestamp;
  period_end: Timestamp;
  period_type: "hour" | "day" | "month";
  usage_value: Numeric;
  cost_estimate: Numeric | null;
}

export interface AlertRuleRow {
  id: string;
  organization_id: string;
  name: string;
  utility_type: "water" | "electric" | null;
  scope_type: "organization" | "building" | "unit" | "meter";
  scope_id: string | null;
  condition_type:
    "high_usage" | "leak_suspected" | "stale_device" | "outage_suspected";
  threshold: Numeric | null;
  window_minutes: number;
  enabled: boolean;
}

export interface AlertEventRow {
  id: string;
  organization_id: string;
  rule_id: string | null;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  title: string;
  message: string;
  triggered_at: Timestamp;
  acknowledged_at: Timestamp | null;
  resolved_at: Timestamp | null;
}

export interface SchemaMigrationRow {
  version: string;
  checksum: string;
  applied_at: Generated<Timestamp>;
}
