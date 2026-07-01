CREATE TABLE password_reset_tokens (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  requested_ip text,
  user_agent text
);

CREATE INDEX password_reset_tokens_user_id_idx
  ON password_reset_tokens (user_id);
CREATE INDEX password_reset_tokens_active_token_hash_idx
  ON password_reset_tokens (token_hash)
  WHERE used_at IS NULL;

CREATE TABLE email_outbox (
  id text PRIMARY KEY,
  to_email text NOT NULL,
  subject text NOT NULL,
  text_body text NOT NULL,
  html_body text,
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX email_outbox_created_at_idx ON email_outbox (created_at DESC);
