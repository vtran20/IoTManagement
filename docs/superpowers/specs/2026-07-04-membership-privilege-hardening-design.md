# Membership Privilege Hardening Design

Date: 2026-07-04
Status: Approved for implementation planning

## Purpose

Close inconsistent authorization paths in membership administration so an
authenticated manager cannot create, change, disable, or reactivate an owner
or manager membership through direct API calls.

## Managed Roles

This administration workflow supports only `owner`, `manager`, and `viewer`.
The schema-level `tenant` role remains reserved for a future tenant-facing
product and is rejected by membership and invitation administration APIs.

## Authorization Matrix

| Action | Owner | Manager | Viewer |
|---|---|---|---|
| List memberships | Yes | Yes | No |
| Invite owner or manager | Yes | No | No |
| Invite viewer | Yes | Yes | No |
| Create direct owner or manager membership | Yes | No | No |
| Create direct viewer membership | Yes | Yes | No |
| Change membership role | Yes | No | No |
| Disable or reactivate owner or manager | Yes, preserve last owner | No | No |
| Disable or reactivate viewer | Yes | Yes | No |

An owner may never remove or disable the last active owner. Cross-tenant
membership identifiers continue to return a tenant-scoped not-found response.

## Server Design

Centralize membership authorization inside `MembershipsService`, after the
target membership has been resolved in the authenticated organization.

- Validate all assignable roles against the managed role set.
- For manager actors, allow only viewer-target creation and viewer-target
  disable/reactivate operations.
- Allow only owners to change a membership role.
- Preserve the existing last-active-owner check for owner actions.
- Apply the same managed-role validation to invitations so `tenant` cannot be
  issued by a crafted request.
- Keep controller role guards as the first defense; service checks are the
  resource-aware enforcement layer.

## Dashboard Design

The Users screen reads the authenticated membership before showing invitation
controls.

- Owners can choose viewer, manager, or owner invitations.
- Managers can invite viewers only.
- Viewers receive a clear access-restricted state and no invite form.
- The server remains authoritative; the UI does not replace API checks.

## Testing

- Add API tests proving managers receive `403` for direct owner/manager
  creation and lifecycle operations, while viewer operations remain allowed.
- Add API tests rejecting the reserved tenant role for invitations and direct
  memberships.
- Preserve tenant-boundary and last-owner regression coverage.
- Add dashboard tests for owner, manager, and viewer invitation choices.
