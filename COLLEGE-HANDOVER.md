# College handover and operations

## Before accepting the project

- Obtain written approval for college branding, event content, photography, student directory publication, and the public registration workflow.
- Ask the college DBA for the approved `users` and `students` table DDL/migrations and confirm account retention/privacy requirements. Those schemas are not present in this repository.
- Review [DATABASE-SCHEMA-REVIEW.md](./DATABASE-SCHEMA-REVIEW.md) with the DBA. `backend/migrations/0001_account_schema.proposed.sql` is a review artifact only; do not execute it.
- Select a hosting provider and PostgreSQL plan under college ownership. Decide who owns billing, access recovery, backups, incident response, and domain/DNS changes.
- Create separate development, staging, and production database credentials. Never reuse production data or credentials in tests.
- Create a strong unique JWT signing secret in the hosting secret manager. Do not email it or commit it.

## First local run

1. Install Node.js and PostgreSQL.
2. From the project root run `npm.cmd ci --prefix backend`.
3. If `backend\.env` does not exist, copy `backend\.env.example` to `backend\.env`; if it already exists, preserve it and do not overwrite it. Configure only a dedicated local database connection.
4. Apply the DBA-approved account schema to the dedicated local database.
5. After confirming `DB_NAME` is the dedicated local test database, set the one-time confirmation and run the initializer:

   ```powershell
   $env:DB_INIT_CONFIRM = 'jhcollege_events_test'
   npm.cmd --prefix backend run db:init
   Remove-Item Env:DB_INIT_CONFIRM
   ```

   The initializer is hard-limited to `DB_NAME=jhcollege_events_test` on localhost, refuses `NODE_ENV=production`, and requires the confirmation to match. Admin account creation/reset and diagnostic scripts also require `DB_ADMIN_SETUP_CONFIRM` to match and have the same test-only target restriction.
6. Run `npm.cmd --prefix backend test`.
7. Run `npm.cmd --prefix backend start` and open `http://localhost:5000/`.

The database initializer is an explicit command, not part of importing the app or starting the web service. Once confirmed, it executes DDL and inserts the initial event-settings row. It will not initialize another database name, connect to a remote host, or run in production mode. The local admin setup scripts are similarly test-only; provision a production administrator only through the separately approved DBA process.

For a synthetic first administrator in an approved isolated local test DB only, follow the README section **First administrator for an isolated local test database**. For the college server, the DBA/identity administrator must provision the first production admin through the separately approved process after validating the authoritative account schema. There is intentionally no production admin-creation command in this repository.

## Production release checklist

- [ ] **Schema:** DBA supplies authoritative versioned DDL for `users` and `students`, approves role/privacy/retention rules, and reviews production schema changes. Current repo DDL covers event/gallery only. Never use local `db:init` in production.
- [ ] **Database access:** create a production-only least-privilege application role; use the provider's private connection and verified TLS; store credentials only in the host secret manager. Confirm no local/test defaults are configured in production.
- [ ] **HTTPS and origins:** require HTTPS for public site, API, and all configured browser/API origins; verify certificate and redirect behavior. Prefer same-origin frontend/API; otherwise set exact `api-base`, `API_ORIGIN`, and `CORS_ORIGINS`.
- [ ] **Secrets and startup:** set `NODE_ENV=production`, provider-supplied `PORT`, all required DB settings, and a unique `JWT_SECRET` with at least 32 random bytes. Verify startup fails closed when required settings are absent or DB TLS certificate verification is disabled. Do not upload `.env`.
- [ ] **Persistent images:** choose durable object storage or confirm database-backed base64 capacity, limits, encryption, backup volume, and retention. If moving to object storage, verify private access, upload validation, deletion lifecycle, and backup/restore behavior before release; local ephemeral disk is not acceptable for durable uploads.
- [ ] **Rate limiting:** login/registration limits are in-memory by default. Set `TRUST_PROXY_HOPS` only to the exact number of trusted proxies so client IP keys are correct; never trust arbitrary forwarded headers. For multiple application instances, configure shared rate-limit storage and verify limits across instances; alert on repeated abuse.
- [ ] **Staging acceptance:** on an isolated database with synthetic users only, pass browser workflows for registration, login/logout, role boundaries, private student data, draft/publish, event CRUD, album/year filtering, multi-image upload, captions, deletion, and persistence after refresh. Record console errors and failed HTTP requests.
- [ ] **Backups and restore:** configure encrypted automated backups, retention, access control, and monitoring. Perform and record a restore into a separate isolated database; verify representative synthetic accounts, events, albums, and image objects are readable. Never restore over production as a test.
- [ ] **Operations:** configure `/api/health` monitoring (connectivity only), application/database logs and alerts, incident owner, secret rotation, staff account disable/reset process, and event/photo content owner.
- [ ] **Release authorization:** confirm college approval for branding, student-directory disclosure, registration, photography, retention, and publication; assign DNS/domain changes to the authorized owner.

## Separate deployment procedures

### Public website (internet-facing)

1. The college selects and owns an HTTPS-capable Node/container host and a private PostgreSQL service. Keep the web service and database in the provider's private network when possible.
2. The DBA supplies the approved account schema and a production migration procedure. Review the event/gallery DDL against it; this repository does not include authoritative account DDL. Do not execute the review-only proposal or run `db:init` in production.
3. Build from the repository root with `docker build -t jhcollege-events:<approved-release-tag> .`. The container uses Node.js 22, installs production dependencies only, runs as non-root, serves the frontend and API, and exposes port 5000. Docker was unavailable in the development verification environment, so the image still needs a staging build/run check.
4. In the provider's secret manager, configure `NODE_ENV=production`, the supplied `PORT`, database host/port/name/user/password, `DB_SSL=true`, `DB_SSL_REJECT_UNAUTHORIZED=true`, and a unique random JWT secret (at least 32 bytes). Never add secrets to Docker build args, image layers, Git, or logs.
5. Prefer same-origin service routing. If frontend and API are separate, configure exact HTTPS `api-base`, `API_ORIGIN`, and `CORS_ORIGINS` values and verify CSP/CORS in a browser.
6. Configure HTTPS edge termination, health check `/api/health`, logs/alerts, private DB networking, shared rate-limit storage when scaling, durable photo storage, encrypted backups, and scheduled restore verification.
7. Deploy only after synthetic staging tests cover registration/login, roles, private student fields, event drafts/publishing, photo upload/caption/deletion, refresh persistence, and restore. Obtain college approval for publication/privacy first.

### College-managed server

1. The college IT administrator chooses the supported OS, Docker/container runtime (or approves an alternative Node.js 22 LTS installation), firewall, HTTPS reverse proxy/certificate, DNS, and private PostgreSQL location.
2. Transfer the reviewed source/release artifact through the college's approved channel. Build or load the tagged image; do not transfer `.env`, production database dumps, or local test credentials.
3. Configure the web service as a managed/restarting service with the provider/OS secret store. Ensure only HTTPS is public, the database port is not internet exposed, and logs/backup paths are access-controlled.
4. DBA provisions and migrates the database using the authoritative approved schema and creates the initial administrator through the college process. The repo's local utility scripts are test-only and blocked for production.
5. Validate health, browser workflows, backup and isolated restore; document service owner, restart/rollback, update cadence, secret rotation, backup retention, incident contacts, and access review.

These procedures are intentionally separate: public hosting may use a college-approved managed cloud account; the handover procedure places operations and secrets under the college IT/DBA authority. Neither procedure has been executed.

## Data and backup responsibilities

Student/account records are in PostgreSQL. Gallery photos are stored as base64 image data inside PostgreSQL rows rather than local disk or object storage. Back up the database with encryption, retention, and access controls appropriate for student information and photographs. Test restoring backups to a separate environment. Monitor database growth and define image retention/deletion policy.

For command examples, see the README's **PostgreSQL backup and isolated restore example**. DBA/operator only: verify the intended source and protected destination before backup; `pg_dump --format=custom` prompts for its password. Restore only into a newly created, separately named empty database; never use `--clean`, `dropdb`, or a production target for a restore drill. Record evidence (backup timestamp, restore target, application/read checks, duration, errors, and responsible operator) and follow the college-approved cleanup procedure for the isolated restore database.

## Current handover blockers

1. Approved `users` and `students` schema/migrations have not been supplied in this project.
2. No PostgreSQL-backed integration suite or synthetic account fixture setup is present.
3. No hosting provider, domain, monitoring, backup configuration, or staging environment is configured.
4. The initializer is not versioned and only creates event/gallery tables; production schema ownership and upgrade procedure must be defined with the DBA.
5. College approval for branding, public student data, and published photos must be confirmed.
6. A published account lifecycle (staff password reset, disable/deactivate, and removal policy) has not been approved or implemented in the UI.

No database provisioning, deployment, DNS change, paid service creation, or production data operation is included in this handover.

## College policy decisions requiring written answers

- **Branding:** May the project use the college name, logo, colors, event photographs, and institutional wording? Who approves final public content?
- **Student privacy:** Is public self-registration permitted, or must accounts be verified against college records? May the public directory show student name and semester? What consent, correction, retention, and deletion process applies?
- **Authorization:** Current code allows `teacher`, `principal`, and `admin` to create/edit/delete all events and manage albums/photos; only `admin` can edit photo captions. Is that policy correct? Who may publish/unpublish events, and should changes require review or event ownership?
- **Staff accounts:** Who approves staff account creation, initial administrator provisioning, password reset, deactivation, and periodic access review?
- **Photography and retention:** Who verifies permission to publish each photograph? What is the retention/deletion schedule for image data and associated captions, including backups?
- **Operations:** Which college unit owns the domain, hosting account/billing, incident response, database backups, recovery objectives, and access to student/account data?

## Browser end-to-end test plan

Run only against a local/staging server configured with an isolated, approved test database and synthetic accounts. Record browser console errors and failed network requests. Never use actual student records.

1. **Registration:** submit a valid synthetic student; verify validation for malformed email, invalid semester, missing fields, and short password; retry the same email and verify duplicate handling; verify the sixth request in the rate-limit window is rejected. Confirm the created profile can log in.
2. **Login/session:** test student and each provisioned staff role with valid/invalid credentials; refresh after login; verify `/api/students/me` or `/api/users/me` returns the same role/profile; logout and verify protected controls disappear and protected API calls return 401.
3. **Permissions/private data:** as student, attempt staff directory, event writes, album/photo writes, caption edits, and staff account management; expect 403/401. Verify the public directory shows only the intended name and semester, never email, roll number, or IDs.
4. **Events:** as authorized staff, create a published event and a draft, refresh, edit/publish/unpublish, delete only the synthetic records, and verify persistence. Public requests must list/detail only published events; staff must see drafts. Try malformed event dates and confirm 400 without modifying the record.
5. **Gallery/albums:** create a synthetic album with a valid optional date, filter by year, refresh, and verify persistence. Upload multiple valid PNG/JPEG/WebP/GIF test images and captions; verify all photos display; attempt unsupported/malformed images, oversized batches, and captions over 200 characters.
6. **Caption/delete:** as admin, edit caption and refresh to verify persistence; as teacher/principal/student, verify caption update is rejected. Confirm photo and album deletion prompts; cancel once and verify data remains; confirm only test-created records are removed.
7. **Responsive/UI/network:** repeat key navigation at mobile, tablet, and desktop widths; check overflow, loading/empty/error states, broken links, console errors, CORS/CSP errors, and unexpected requests. Capture homepage, logged-in student, staff draft-management, and gallery screenshots.
8. **Database durability:** with DBA-approved backup procedures, snapshot the isolated test DB, perform test-only changes, restore into a second isolated database, and verify records/photos. Do not test restore by overwriting any existing database.
