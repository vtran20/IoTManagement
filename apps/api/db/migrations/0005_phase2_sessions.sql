CREATE TABLE sessions (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES users(id),
  organization_id text NOT NULL REFERENCES organizations(id),
  membership_id text NOT NULL REFERENCES memberships(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text,
  ip_address text
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_organization_id_idx ON sessions (organization_id);
CREATE INDEX sessions_membership_id_idx ON sessions (membership_id);
CREATE INDEX sessions_active_token_hash_idx
  ON sessions (token_hash)
  WHERE revoked_at IS NULL;
