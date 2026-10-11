# Government J.H. College Betul Events

A static HTML/CSS/JavaScript frontend and Node.js/Express/PostgreSQL API for student registration, staff login, event management, and annual party photo galleries.

## Project status and important limitations

- The backend serves the existing frontend at `/`, `/script.js`, and `/style.css`; the API and frontend can run on one origin.
- Event and gallery table definitions are in `backend/initDb.js`. This initializer creates tables and the default event-settings row, but it is not a versioned migration system.
- This repository contains **no verified DDL for `users` or `students`**. Do not invent those tables from route queries. Obtain the approved schema from the college database owner or original migration source before provisioning login/registration data or declaring the application production-ready.
- The verified table/column inventory and DBA-review-only proposal are in [DATABASE-SCHEMA-REVIEW.md](./DATABASE-SCHEMA-REVIEW.md). The adjacent proposed SQL is not approved and must not be executed.
- No PostgreSQL-backed end-to-end suite or seeded test accounts are included. Automated route tests use mocked database calls. Passing them does not verify PostgreSQL persistence.
- Photo images are stored as base64 strings in PostgreSQL, not in local files or object storage. Database size, backup, and restore policies must account for gallery growth.
- College branding and deployment permission should be approved by the college before publication.

## Requirements

- Node.js 18 or newer is required by the locked dependencies; use a currently supported Node.js LTS release (Node.js 22+ recommended) for deployment.
- PostgreSQL 15 or newer is recommended; the project has been inspected with PostgreSQL 18 available locally.
- An approved PostgreSQL schema for the existing `users` and `students` tables is required for authentication workflows.

## Local installation

Run these commands from the repository root in PowerShell:

```powershell
npm.cmd ci --prefix backend
if (-not (Test-Path backend\.env)) {
    Copy-Item backend\.env.example backend\.env
} else {
    Write-Output 'backend\.env already exists and was left unchanged.'
}
```

Edit `backend\.env` locally. Set `DB_NAME` to a **dedicated development/test database**, not the college database. Set `DB_USER` and `DB_PASSWORD` to the PostgreSQL role created for that database. Never commit the populated `.env`.

`JWT_SECRET` must be at least 32 bytes when `NODE_ENV=production`; use a cryptographically random value stored in a secret manager. Do not reuse an example or commit a real secret.

The API defaults to `http://localhost:5000`. If `DB_NAME` is omitted outside production, the connection default is the isolated-test name `jhcollege_events_test`; configure a dedicated local database role and host explicitly. When the frontend is hosted on another local port, include that exact origin in `CORS_ORIGINS` (the example includes the common port 5500). Opening the HTML through `file://` is only a static visual preview; browser API requests from that opaque origin are not enabled. For working local workflows, open the frontend through the Express server at `http://localhost:5000/`.

## Database setup and initialization

The authoritative account schema is not in this repository. Obtain the DBA's written approval and schema source first; see [DATABASE-SCHEMA-REVIEW.md](./DATABASE-SCHEMA-REVIEW.md) for the exact request. The following commands are preparation instructions only. **Do not run the creation commands until the college DBA explicitly approves a dedicated empty test database.** They do not connect to the college database and must not be adapted to use its host, name, role, or credentials.

### Dedicated local PostgreSQL test database (PowerShell, instructions only)

These commands assume PostgreSQL 18 is installed in its standard Windows location. They do not read or alter `backend\.env`. Stop if the local PostgreSQL service or expected `psql.exe` is absent; do not substitute the college server.

1. Identify the local PostgreSQL 18 service and client without displaying credentials:

   ```powershell
   Get-Service -Name '*postgres*' | Select-Object Name, Status
   $pgBin = Join-Path $env:ProgramFiles 'PostgreSQL\18\bin'
   $psql = Join-Path $pgBin 'psql.exe'
   if (-not (Test-Path $psql)) { throw 'PostgreSQL 18 psql.exe was not found at the standard install path.' }
   ```

2. Use the role selected as the local PostgreSQL administrator during installation (commonly `postgres`, but do not assume). `-W` prompts for that role's password; it does not put the password in command history. This lists only role names and privilege flags, not password data:

   ```powershell
   $adminRole = Read-Host 'Local PostgreSQL administrator role name'
   & $psql -h localhost -p 5432 -U $adminRole -d postgres -W -c "SELECT rolname, rolsuper, rolcreatedb FROM pg_roles WHERE rolsuper OR rolcreatedb ORDER BY rolname;"
   ```

   If authentication or role identity is unclear, stop and ask the local PostgreSQL administrator; do not try credentials from `backend\.env`.

3. Only after explicit DBA approval for this isolated target, create a dedicated non-superuser role and a new database owned by that role. `CREATE` statements intentionally have no `IF NOT EXISTS`: if either name already exists, stop and inspect locally rather than reusing or altering it. `\password` prompts interactively and avoids putting the new role password in SQL or command history.

   ```powershell
   & $psql -v ON_ERROR_STOP=1 -h localhost -p 5432 -U $adminRole -d postgres -W -c 'CREATE ROLE jhcollege_events_test_app LOGIN'
   if ($LASTEXITCODE -ne 0) { throw 'Role creation failed; stop and consult the local PostgreSQL administrator.' }
   & $psql -v ON_ERROR_STOP=1 -h localhost -p 5432 -U $adminRole -d postgres -W -c 'CREATE DATABASE jhcollege_events_test OWNER jhcollege_events_test_app'
   if ($LASTEXITCODE -ne 0) { throw 'Database creation failed; stop and consult the local PostgreSQL administrator. Do not remove the role automatically.' }
   & $psql -v ON_ERROR_STOP=1 -h localhost -p 5432 -U $adminRole -d postgres -W -c '\password jhcollege_events_test_app'
   if ($LASTEXITCODE -ne 0) { throw 'Password setup failed; stop and consult the local PostgreSQL administrator.' }
   ```

   This does not drop, reset, or truncate anything. If role creation succeeds but database creation fails, stop and ask the DBA how to proceed; do not remove the role automatically.

4. For the current PowerShell window only, override the database environment without editing `.env`. Enter the test-role password using the secure prompt; it is held in the process environment for the session and is not echoed:

   ```powershell
   $env:NODE_ENV = 'development'
   $env:DB_HOST = 'localhost'
   $env:DB_PORT = '5432'
   $env:DB_NAME = 'jhcollege_events_test'
   $env:DB_USER = 'jhcollege_events_test_app'
   $env:DB_SSL = 'false'
   $env:DB_SSL_REJECT_UNAUTHORIZED = 'true'
   $secure = Read-Host 'Dedicated test database password' -AsSecureString
   $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
   try { $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
   finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
   ```

   Confirm only the non-secret target values before any schema operation:

   ```powershell
   if ($env:DB_HOST -ne 'localhost' -or $env:DB_NAME -ne 'jhcollege_events_test') {
       throw 'Refusing database work: target is not the dedicated loopback test database.'
   }
   "Target: $($env:DB_HOST):$($env:DB_PORT)/$($env:DB_NAME)"
   ```

   PowerShell process environment values take precedence over dotenv values. Keep this shell open for approved commands and tests; close it or clear the variables afterward:

   ```powershell
   'DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','DB_SSL','DB_SSL_REJECT_UNAUTHORIZED','DB_INIT_CONFIRM','DB_ADMIN_SETUP_CONFIRM' |
       ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
   ```

5. Before any DDL, perform a read-only identity check with the dedicated test role and confirm the database and current role in the output:

   ```powershell
   & $psql -h localhost -p 5432 -U $env:DB_USER -d $env:DB_NAME -W -c 'SELECT current_database(), current_user, inet_server_addr();'
   ```

   The database must be `jhcollege_events_test`, the user must be `jhcollege_events_test_app`, and the server address must be loopback. Stop if any value differs. Do not print environment variables or inspect `backend\.env`.

6. Have the DBA provide and approve the authoritative account DDL, then apply that approved source to this test database using the DBA-reviewed procedure. Do not run `backend/migrations/0001_account_schema.proposed.sql`; it contains unverified assumptions. After confirming the test target again, the repository event/gallery initializer can be run only with its exact guard:

```powershell
$env:DB_INIT_CONFIRM = 'jhcollege_events_test'
npm.cmd --prefix backend run db:init
Remove-Item Env:DB_INIT_CONFIRM
```

The initializer is hard-limited to `DB_NAME=jhcollege_events_test` on a loopback host (`localhost`, `127.0.0.1`, or `::1`), refuses `NODE_ENV=production`, and requires `DB_INIT_CONFIRM` to match. It refuses to load the database pool or run SQL otherwise. It then runs `CREATE TABLE IF NOT EXISTS` for event/gallery tables and `INSERT ... ON CONFLICT DO NOTHING` for the initial settings row. It does not create account tables, add versioned upgrades, or validate an existing schema. This is still a database write: do not run it until the approved isolated database exists and its target has been verified.

The `db:init`, `createFirstAdmin.js`, `resetAdminPassword.js`, and `checkAdminLogin.js` scripts are restricted to the confirmed, non-production local `jhcollege_events_test` database. The initializer requires `DB_INIT_CONFIRM`; account setup/diagnostic scripts require `DB_ADMIN_SETUP_CONFIRM`; each must exactly match `DB_NAME`. All refuse remote hosts and production mode. These scripts cannot be used for production account provisioning; use the college DBA's separately reviewed process.

### First administrator for an isolated local test database

This procedure creates a **synthetic test administrator only**. First obtain approval for the isolated `jhcollege_events_test` target, apply the DBA-approved account schema there, and configure the test-only DB environment as above. Never use this script for production.

```powershell
if ($env:DB_HOST -notin @('localhost','127.0.0.1','::1') -or
    $env:DB_NAME -ne 'jhcollege_events_test' -or
    $env:NODE_ENV -eq 'production') {
    throw 'Refusing admin setup: target is not the non-production loopback test database.'
}
$env:DB_ADMIN_SETUP_CONFIRM = 'jhcollege_events_test'
$env:ADMIN_INITIAL_NAME = Read-Host 'Synthetic test administrator name'
$env:ADMIN_INITIAL_EMAIL = Read-Host 'Synthetic test administrator email'
$secure = Read-Host 'Synthetic test administrator password (12+ characters)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:ADMIN_INITIAL_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
try { node backend\scripts\createFirstAdmin.js }
finally {
    'DB_ADMIN_SETUP_CONFIRM','ADMIN_INITIAL_NAME','ADMIN_INITIAL_EMAIL','ADMIN_INITIAL_PASSWORD' |
        ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
}
```

For production or a college server, the DBA/identity administrator must use the college-approved account provisioning process after validating the authoritative `users` schema. The application does not provide a production first-admin command; do not remove the local-test safety guard or write guessed SQL.

## Run and test

```powershell
npm.cmd --prefix backend start
```

The server checks database connectivity before listening. It does not initialize tables on module import or normal startup. Open `http://localhost:5000/`; check `http://localhost:5000/api/health` for database connectivity.

Run the backend test suite:

```powershell
npm.cmd --prefix backend test
```

The test suite is designed to use route-level mocks and does not require college data. It does not prove real PostgreSQL behavior. There is no frontend bundler/build step; `node --check script.js` provides a frontend JavaScript syntax check. The current verification environment ran Node.js 24.21.0.

## Configuration

Copy `backend/.env.example` to `backend/.env` and configure locally. Environment variables:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Use `production` on the production service. |
| `PORT` | HTTP port supplied by the hosting provider (default `5000`). |
| `TRUST_PROXY_HOPS` | Number of trusted reverse-proxy hops. Defaults to `0` (trust none); set only to the exact number of proxies controlled by the deployment, typically `1` behind one known edge proxy. Accepted range is `0`–`10`. Incorrectly trusting client-supplied forwarded headers can undermine client-IP rate limiting; never expose the app directly while trusting untrusted proxy hops. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection. All are required in production; no production fallback database is used. |
| `DB_SSL` | Set to `true` when the PostgreSQL provider requires TLS. |
| `DB_SSL_REJECT_UNAUTHORIZED` | Defaults to certificate verification. Do not disable verification in production. |
| `JWT_SECRET` | HMAC signing secret; production startup requires at least 32 random bytes. Keep it in the provider’s secret store. |
| `CORS_ORIGINS` | Comma-separated exact browser frontend origins. Production has no localhost CORS allowance. Same-origin hosting does not require CORS. |
| `API_ORIGIN` | API origin added to the Content Security Policy when a separate frontend needs to call the API cross-origin. |
| `FRONTEND_ORIGIN` | Optional deployment marker; if set, configure `API_ORIGIN` as well. |

For a separately hosted static frontend, set the `<meta name="api-base" content="">` value in `index.html` to the public HTTPS API origin, set backend `API_ORIGIN` to that API origin, and set `CORS_ORIGINS` to the exact frontend origin. Prefer serving the frontend and API from one origin.

## Production deployment

Recommended architecture: one Node.js web service running this Express app, serving the existing static frontend, plus a managed PostgreSQL database on a private/secured connection.

The repository includes a production container definition in `Dockerfile`. It packages only runtime dependencies, the Express app/routes, and the static frontend; it excludes `.env` files, tests, local scripts, and review SQL. The image runs as the non-root `node` user and checks `/api/health`. Docker is not installed in the current verification environment, so this image has not been built or run here.

### Public internet deployment

1. Select a hosting provider and PostgreSQL service under college ownership. Prefer a single HTTPS Node web service that serves the frontend and API on the same origin, plus a private managed PostgreSQL endpoint. A separate static host is possible but requires exact CORS/CSP/API-origin configuration.
2. Before provisioning application tables, obtain the approved `users`/`students` schema and production migration procedure from the college DBA. The repository lacks this authoritative schema. Never run `backend/migrations/0001_account_schema.proposed.sql` or the local `db:init` command against production.
3. Build the image from the repository root: `docker build -t jhcollege-events:release .`. Configure the service to start the image with port `5000` (or the platform-provided `PORT`) and health check `GET /api/health`. Do not deploy until the image has been built, staging checks have passed, and schema approval is complete.
4. Add these environment variables through the hosting provider's secret/configuration manager—not a committed file or Docker build argument: `NODE_ENV=production`, platform `PORT`, `TRUST_PROXY_HOPS` set to the exact trusted proxy count (usually `1` behind a single controlled proxy; do not copy that value without confirming topology), `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `DB_SSL_REJECT_UNAUTHORIZED=true`, and a new random `JWT_SECRET` of at least 32 bytes. Use the managed database's TLS certificate requirements. Do not place secrets in image layers, logs, source control, or support tickets.
5. With same-origin frontend/API, leave `CORS_ORIGINS` and `API_ORIGIN` unset unless the provider requires otherwise. For a separate frontend, set the HTML `api-base` to the public HTTPS API origin; set `API_ORIGIN` to that API origin and `CORS_ORIGINS` to the exact HTTPS frontend origin. Test CSP, CORS preflight, and browser API requests on staging.
6. Have the DBA apply the reviewed production schema using the college's migration/change process after a backup and rollback plan are approved. Production startup checks connectivity and security configuration, but `/api/health` does not validate schema completeness.
7. Use synthetic staging accounts to pass registration/login, role-permission, event draft/publish, gallery upload/caption/delete, and refresh-persistence workflows before public release.
8. Configure durable photo storage/retention, encrypted backups, monitoring, and a restore drill as described below. Complete college privacy/publication approval before enabling public registration or directory data.

For a local container operator who controls an approved secret file outside Git, create `backend\.env.production.local` with the required variables and access-restrict it, then pass it at runtime with `docker run --env-file backend\.env.production.local -p 5000:5000 jhcollege-events:release`. The ignore rules exclude this file from Git and the image build; still verify this before use and never share or commit it. Prefer a hosting secret manager instead. This command is a template only and does not deploy or start any service in this workspace.

### College server handover

Use the college-owned server only after its administrator approves the operating system, container runtime, firewall rules, DNS/TLS termination, and database endpoint. The portable image can be installed from a reviewed release artifact or built from an approved source checkout; pin the Node base image/version and retain the release tag/digest. Provide secrets using the server's protected service configuration, not source files or shell command history. Route public traffic through the college's HTTPS reverse proxy, allow only required inbound ports, and keep PostgreSQL private. Record the operator, restart/rollback procedure, log location, secret-rotation procedure, backup owner, and tested restore steps in the college's operations register. Do not use local test-only admin/setup scripts for production account provisioning.

The container does not embed PostgreSQL and does not run migrations or initialization at startup. Have the DBA separately provision and validate production schema and the initial admin through the approved process. Do not copy test databases, `.env` files, or synthetic credentials into production.

### Image storage, rate limits, backups

Photos are currently stored as base64 text in PostgreSQL. Base64 adds roughly one-third overhead over binary data, and every image increases database, backup, memory, and API response size. All album photos are returned together by gallery endpoints, so large galleries can affect query latency and memory. The JSON body limit is 20 MB per request; this is not a durable object-storage strategy. For production scale, move images to private durable object storage with validated uploads, controlled delivery, lifecycle/deletion handling, and backups; store object references and captions in PostgreSQL. Do not use ephemeral container disk for uploaded assets.

The login and registration rate limits use process-local memory. A single replica shares counters only within that process; multiple replicas or restarts can weaken effective limits. Configure a shared rate-limit store before scaling horizontally, then verify the limit across instances.

Configure encrypted PostgreSQL backups, retention, restricted access, monitoring/alerts, and an assigned recovery owner. Restore into a second isolated environment—not over production—and verify synthetic accounts, event records, albums, and photo retrieval. Include object storage in the backup/restore plan if adopted.

#### PostgreSQL backup and isolated restore example (PowerShell; do not run as part of deployment)

These are operator-run examples for a DBA-approved connection and a protected backup location. `pg_dump` is read-only against the source database; it prompts for the DB password and does not put it in the command. A backup contains personal data and images: restrict access and encrypt it using the college-approved encrypted volume/backup service. Do not use a developer workstation or an unprotected share. Confirm the source target with the DBA before running; these commands have not been run here.

```powershell
$pgBin = Join-Path $env:ProgramFiles 'PostgreSQL\18\bin'
$pgDump = Join-Path $pgBin 'pg_dump.exe'
$backupDir = 'D:\CollegeBackups\JHCollegeEvents'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backupFile = Join-Path $backupDir ("jhcollege-events-{0}.dump" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path $backupFile) { throw 'Backup file already exists; choose a new unique filename.' }
& $pgDump --format=custom --no-owner --no-privileges --password `
    --host $env:DB_HOST --port $env:DB_PORT --username $env:DB_USER `
    --dbname $env:DB_NAME --file $backupFile
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed; do not treat this backup as valid.' }
```

For a restore drill, use an approved second isolated PostgreSQL instance or create a **new, uniquely named empty restore database**. Do not target the source database or use `dropdb`, `--clean`, or overwrite flags. Review the dump with the DBA before restore; schemas may include private account data.

```powershell
$restoreDb = 'jhcollege_events_restore_20261011'
$restoreAdmin = Read-Host 'Restore-server PostgreSQL administrator role'
$createdb = Join-Path $pgBin 'createdb.exe'
$pgRestore = Join-Path $pgBin 'pg_restore.exe'
& $createdb --host localhost --port 5432 --username $restoreAdmin --password $restoreDb
if ($LASTEXITCODE -ne 0) { throw 'Could not create the new restore database; stop and inspect without deleting anything.' }
& $pgRestore --exit-on-error --no-owner --no-privileges `
    --host localhost --port 5432 --username $restoreAdmin --password `
    --dbname $restoreDb $backupFile
if ($LASTEXITCODE -ne 0) { throw 'Restore did not complete; preserve the isolated target for DBA inspection.' }
```

Verify the restore using read-only checks and synthetic/test-only records where possible, confirm row/photo counts and application retrieval, record duration and errors, then retain or remove the isolated restore database only under the DBA's approved cleanup procedure. A successful command alone is not a successful restore test.

The repository does not contain provider-specific hosting configuration, a production migration set, a staging environment, or a deployment verification. No deployment has been performed.

## Security and operations notes

- Passwords are hashed with bcrypt by registration/account-creation routes; JWTs expire after two hours.
- Student registration is rate-limited to five attempts per 15 minutes, and login is limited to ten attempts per 15 minutes. The default limiter uses in-memory state; multi-instance deployments need shared rate-limit storage to enforce cluster-wide limits.
- Photo uploads are restricted by allowed image data types/signatures and the Express JSON request-body limit. Base64 upload limits apply to the whole request, not each image independently.
- A single accepted upload request is capped by the 20 MB JSON limit; multiple concurrent administrators and full album reads can still create high memory/database/network load. Monitor payload sizes and move images to managed object storage with access controls and durable backups before substantial usage.
- Multi-photo insertion uses a transaction so a failed image insert does not leave a partial batch.
- Staff-account listing and creation are available in the UI to admins/principals; principals can create teachers only, while admins can create teachers or principals. Password reset/deactivation/deletion and event ownership are not available as ordinary UI workflows.
- User-provided database text is rendered through DOM text properties, not interpolated into HTML.
- Production CORS does not automatically allow localhost. Helmet CSP allows the configured API origin and Google Fonts; for deployments that do not need Google Fonts, review and tighten those external font/style sources.
- Review the public student directory fields and college privacy/consent requirements before publication.
- Logs should be access-controlled and monitored. Do not add passwords, tokens, or database connection strings to logs.

## College handover

See [COLLEGE-HANDOVER.md](./COLLEGE-HANDOVER.md) for the administrator and maintenance checklist.
