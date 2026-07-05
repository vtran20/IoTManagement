CREATE TABLE vendors (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  company_name text NOT NULL,
  trade text NOT NULL,
  contact_name text,
  phone text,
  email text,
  status text NOT NULL CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

ALTER TABLE work_orders
  ADD COLUMN assigned_vendor_id text REFERENCES vendors(id),
  ADD COLUMN estimated_cost numeric,
  ADD COLUMN final_cost numeric,
  ADD CONSTRAINT work_orders_single_assignment_check CHECK (
    NOT (assigned_membership_id IS NOT NULL AND assigned_vendor_id IS NOT NULL)
  ),
  ADD CONSTRAINT work_orders_non_negative_cost_check CHECK (
    (estimated_cost IS NULL OR estimated_cost >= 0) AND
    (final_cost IS NULL OR final_cost >= 0)
  ),
  ADD CONSTRAINT work_orders_completed_final_cost_check CHECK (
    status <> 'completed' OR final_cost IS NOT NULL
  );

CREATE TABLE work_order_notes (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  work_order_id text NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  author_user_id text NOT NULL REFERENCES users(id),
  note text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE work_order_notifications (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  work_order_id text NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  recipient_membership_id text NOT NULL REFERENCES memberships(id),
  kind text NOT NULL CHECK (kind IN ('work_order_overdue')),
  status text NOT NULL CHECK (status IN ('delivered', 'suppressed')),
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL,
  read_at timestamptz,
  UNIQUE (organization_id, recipient_membership_id, dedupe_key)
);

CREATE INDEX vendors_organization_status_idx
  ON vendors (organization_id, status, company_name);
CREATE INDEX work_orders_organization_vendor_idx
  ON work_orders (organization_id, assigned_vendor_id, created_at DESC);
CREATE INDEX work_order_notes_work_order_idx
  ON work_order_notes (organization_id, work_order_id, created_at ASC);
CREATE INDEX work_order_notifications_recipient_idx
  ON work_order_notifications (organization_id, recipient_membership_id, read_at, created_at DESC);
