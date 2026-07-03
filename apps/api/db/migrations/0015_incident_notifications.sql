ALTER TABLE email_outbox
  ADD COLUMN dedupe_key text;

ALTER TABLE email_outbox
  ADD CONSTRAINT email_outbox_dedupe_key_unique UNIQUE (dedupe_key);

CREATE TABLE incident_responder_settings (
  organization_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  critical_acknowledgement_deadline_minutes integer NOT NULL DEFAULT 15
    CHECK (critical_acknowledgement_deadline_minutes BETWEEN 1 AND 1440),
  warning_acknowledgement_deadline_minutes integer NOT NULL DEFAULT 60
    CHECK (warning_acknowledgement_deadline_minutes BETWEEN 1 AND 1440),
  updated_at timestamptz NOT NULL
);

CREATE TABLE incident_notifications (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id text NOT NULL REFERENCES leak_incidents(id) ON DELETE CASCADE,
  recipient_membership_id text NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('in_app', 'email')),
  kind text NOT NULL CHECK (kind IN ('incident_opened', 'acknowledgement_overdue')),
  status text NOT NULL CHECK (status IN ('queued', 'delivered', 'suppressed')),
  dedupe_key text NOT NULL,
  email_outbox_id text REFERENCES email_outbox(id),
  created_at timestamptz NOT NULL,
  read_at timestamptz,
  UNIQUE (organization_id, recipient_membership_id, channel, dedupe_key)
);

CREATE INDEX incident_notifications_recipient_created_idx
  ON incident_notifications (organization_id, recipient_membership_id, created_at DESC);
CREATE INDEX incident_notifications_incident_idx
  ON incident_notifications (organization_id, incident_id, created_at DESC);
