ALTER TABLE incident_activities
  DROP CONSTRAINT IF EXISTS incident_activities_type_check;

ALTER TABLE incident_activities
  ADD CONSTRAINT incident_activities_type_check CHECK (
    type IN (
      'opened', 'acknowledged', 'investigating', 'contained', 'monitoring', 'resolved', 'note',
      'work_order_created', 'work_order_assigned', 'work_order_started', 'work_order_completed',
      'work_order_cancelled', 'work_order_due_date_changed', 'work_order_updated'
    )
  );

CREATE TABLE work_orders (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  incident_id text NOT NULL REFERENCES leak_incidents(id) ON DELETE CASCADE,
  building_id text NOT NULL REFERENCES buildings(id),
  unit_id text REFERENCES units(id),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_membership_id text REFERENCES memberships(id),
  due_at timestamptz,
  completion_note text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK ((status <> 'completed') OR (completion_note IS NOT NULL AND completed_at IS NOT NULL))
);

CREATE INDEX work_orders_organization_status_due_idx
  ON work_orders (organization_id, status, due_at);
CREATE INDEX work_orders_organization_assignee_idx
  ON work_orders (organization_id, assigned_membership_id, created_at DESC);
CREATE INDEX work_orders_incident_idx
  ON work_orders (organization_id, incident_id, created_at DESC);
