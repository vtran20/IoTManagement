ALTER TABLE memberships
  ADD COLUMN status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'disabled'));

CREATE TABLE invitations (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  organization_id text NOT NULL REFERENCES organizations(id),
  inviter_user_id text NOT NULL REFERENCES users(id),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'viewer', 'tenant')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX invitations_organization_id_idx ON invitations (organization_id);
CREATE INDEX invitations_email_idx ON invitations (email);
CREATE INDEX invitations_active_token_hash_idx
  ON invitations (token_hash)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE audit_logs (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  actor_user_id text REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_organization_id_created_at_idx
  ON audit_logs (organization_id, created_at DESC);
