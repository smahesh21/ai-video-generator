# Drishvo account operations

## Session policy

- Sessions use secure, HTTP-only Better Auth cookies backed by MongoDB.
- A session expires after 24 hours and may refresh after six hours of activity.
- Sensitive Better Auth operations require a session created within the last 15 minutes.
- The encrypted cookie cache lasts 60 seconds, limiting the window before a remote revocation is observed.
- Password changes revoke other sessions. Password resets revoke every session.
- Public signup remains disabled and every request must still belong to an approved email.

## Password recovery

- The sign-in page offers a generic reset request that does not reveal whether an account exists.
- Better Auth issues a one-use token that expires after 30 minutes.
- Reset links are sent by the configured transactional email account. API keys stay only in ignored local settings and the production environment.
- A successful reset changes the password and revokes all active sessions. The user must sign in again on every device.
- Operators should revoke the transactional email key and disable reset requests if email delivery is suspected to be compromised.

## Internal-V1 backup and retention policy

The product PRD deliberately excludes a customer-facing backup/restore product. Operational protection is limited to the following policy:

- MongoDB is the source of truth for accounts, projects, approvals, render status, and publishing history. Enable provider-managed daily snapshots before inviting additional users; retain 14 daily and four weekly restore points.
- Cloudflare R2 rendered MP4s and posters are private derived artifacts. Retain them until the owner deletes the project. They are not copied to a second object store in internal V1 because an approved storyboard can generate a replacement.
- Secrets, password hashes, Instagram tokens, session tokens, and environment files must never be placed in source control or an unencrypted manual export.
- A restore must target an isolated database first. Verify account isolation, project counts, one owner-checked media read, and the worker queue before promoting restored data.
- Run a restore drill after enabling snapshots and at least once every three months. Record the date, snapshot identifier, validation, and operator in the private operations log.
- Project deletion remains authoritative: cancel unclaimed work, revoke media access, remove owned R2 objects, and do not restore intentionally deleted content from an older snapshot except during an incident with explicit owner approval.

If the current MongoDB plan cannot provide managed snapshots, production hardening is not complete. Keep the service internal or move to a plan that supports the policy; do not silently describe regenerable media as a database backup.
