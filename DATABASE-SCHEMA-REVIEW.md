# Database schema requirements and review proposal

**Status: review only.** No database was contacted while preparing this document. The proposed SQL is not an approved migration and must not be executed until the college DBA verifies it against the authoritative college schema, confirms the target is an isolated database, and approves the migration.

## Authoritative schema search result

No authoritative `users` or `students` DDL is present in the current workspace or reachable Git history. The repository-wide search found account-table definitions only in `backend/migrations/0001_account_schema.proposed.sql`; that file is explicitly speculative and was added as a review artifact. Git history contains that same proposal, not an original account schema. The only other table definitions are the event/gallery DDL in `backend/initDb.js`. This conclusion is limited to the repository and its available Git history; it does not claim anything about databases or external source repositories, which were not accessed.

## Exact approval request for the college DBA

Send the following request to the college database owner/DBA before creating account tables or running database-backed tests:

> **Subject: Approval request — JH College Events account schema and isolated test database**
>
> Please provide the authoritative, versioned PostgreSQL DDL or migration source for the `users` and `students` tables used by the JH College Events application. Please include column names and types, nullability/defaults, primary and foreign keys, unique constraints and indexes, role values or enums, and any required extensions. Please confirm email normalization/uniqueness rules, accepted student semester and gender values, roll-number uniqueness policy, password-hash column compatibility with bcrypt, account status/deactivation rules, and whether staff accounts and students share any identifiers or constraints.
>
> Please also confirm the approved role/permission policy, public student-directory fields, and event ownership policy. The current application recognizes `student` for student accounts and `teacher`, `principal`, and `admin` for staff; event rows have no owner column in the repository-defined DDL.
>
> For testing, please authorize a separate local PostgreSQL database named `jhcollege_events_test` and a non-superuser application role that owns only that database (or has the minimum privileges required to create/use its test schema). Confirm explicitly that it contains no college/production data, provide the approved schema source for this test database, and approve running the repository's guarded event/gallery initializer against this test database only. No production connection, schema change, or production data is requested.
>
> Please identify the approved production migration/provisioning and initial administrator process separately; the repository's local test-only setup scripts must not be used for production.

Do not send passwords, JWT secrets, or production connection strings in email or chat. Obtain connection credentials through the college's approved secret-sharing process. Do not approve the proposed SQL by default; replace or reject it based on the authoritative source.

## Evidence and confidence

The only DDL found in the repository is `backend/initDb.js`. It defines `event_settings`, `events`, `annual_party_albums`, and `annual_party_photos`. No `.sql` migration, setup script, or test fixture defines `users` or `students`. Account routes and setup scripts query those tables, so the application requires schemas that are not currently defined in this repository.

The definitions below distinguish:

- **Repository-defined:** columns, PostgreSQL types, nullability/defaults, primary keys, and the photo-to-album foreign key explicitly declared by `backend/initDb.js`.
- **Query-required:** columns referenced by SQL in routes/scripts.
- **Proposal/assumption:** details for missing account schemas and additional constraints/indexes. These are suggestions derived from actual code use, not verified college schema. Obtain DBA approval before adoption.

## Verified repository DDL: event and gallery

| Table | Columns and verified definitions | Constraints / relationships |
|---|---|---|
| `event_settings` | `id INTEGER`; `party_date DATE`; `party_time TIME`; `venue VARCHAR(200)`; `announcement TEXT`; `updated_at TIMESTAMPTZ DEFAULT NOW()` | `id` primary key. Initial row uses `id = 1`; upsert relies on primary-key conflict. The DDL does not declare other columns `NOT NULL`. |
| `events` | `id SERIAL`; `title VARCHAR(150) NOT NULL`; `description TEXT`; `event_date DATE NOT NULL`; `start_time TIME`; `venue VARCHAR(200)`; `category VARCHAR(80) DEFAULT 'General'`; `cover_image TEXT`; `is_published BOOLEAN NOT NULL DEFAULT TRUE`; `created_at TIMESTAMPTZ DEFAULT NOW()`; `updated_at TIMESTAMPTZ DEFAULT NOW()` | `id` primary key. No author/owner column, so code cannot enforce “edit only your own event”; any authenticated `admin`, `principal`, or `teacher` can edit/delete every event. |
| `annual_party_albums` | `id SERIAL`; `year INTEGER NOT NULL`; `title VARCHAR(150) NOT NULL`; `description TEXT`; `event_date DATE`; `photographer VARCHAR(120)`; `created_at TIMESTAMPTZ DEFAULT NOW()`; `updated_at TIMESTAMPTZ DEFAULT NOW()` | `id` primary key. No year range check or unique year/title rule is declared. |
| `annual_party_photos` | `id SERIAL`; `album_id INTEGER NOT NULL`; `image_data TEXT NOT NULL`; `caption VARCHAR(200)`; `sort_order INTEGER NOT NULL DEFAULT 0`; `created_at TIMESTAMPTZ DEFAULT NOW()` | `id` primary key; `album_id` references `annual_party_albums(id) ON DELETE CASCADE`. This is the only declared foreign key. |

The DDL has no explicit secondary indexes. PostgreSQL creates indexes for primary keys. A unique constraint/index for account email is required for the routes’ duplicate handling, but is not defined by current repository DDL. An index on `annual_party_photos.album_id` is a performance recommendation for repeated album photo lookups, not a route correctness requirement.

## Required account columns traced from SQL

### `students`

Route queries in `backend/routes/studentRoutes.js` and `backend/routes/authRoutes.js` require:

- `id`: returned, used as a numeric JWT subject identity, and used in `WHERE id = $1`.
- `full_name`, `email`, `password_hash`: registration insert, login/profile selection.
- `gender`, `semester`, `roll_number`: insert, directory and profile fields. The browser and registration route now both require non-empty gender and roll number; the verified repository has no account DDL, so database `NOT NULL` remains a proposed constraint pending DBA confirmation.
- `created_at`: registration `RETURNING` and `/me` profile selection.

The registration route normalizes email to lowercase and reports PostgreSQL unique-violation code `23505` as a duplicate email. Login performs exact `email = $1` with a lowercased parameter. The code does not declare whether roll number is unique or what gender values are allowed. Passwords are bcrypt hashes, not plaintext.

### `users`

Route queries in `backend/routes/userRoutes.js`, `backend/routes/authRoutes.js` and scripts under `backend/scripts/` require:

- `id`: returned and placed in a numeric JWT identity.
- `full_name`, `email`, `password_hash`, `role`.
- `created_at`: `/me`, list, and create response.

User create/setup scripts report PostgreSQL unique violation `23505` for duplicate email. Staff login looks up by exact lowercased email and compares stored bcrypt hash. `createFirstAdmin.js` inserts role `admin`; user creation API permits `teacher` and `principal` only. Staff authentication/authorization code recognizes `admin`, `principal`, and `teacher`; `student` is a separate `students` table/account path and is not a stored `users.role` value in current code.

## Role and authorization contract

| Role | Current permitted surfaces (as enforced by route middleware) |
|---|---|
| `student` | Student `/me` and student login. Registration is public. |
| `teacher` | Student directory/list, event settings and event CRUD, gallery album/photo CRUD except caption edit, own `/api/users/me`. |
| `principal` | Teacher permissions plus staff account list/create-teacher. |
| `admin` | Staff permissions plus create principal/teacher, photo-caption edits, admin account setup. |

This list is the current code contract, not a DBA-approved role policy. Event records contain no creator identity and routes do not scope event edits/deletes to record ownership. The frontend has event and album controls but no account-list/create form, despite the backend implementing `GET /api/users` and `POST /api/users`.

## Constraints/indexes: verified vs required vs proposed

1. **Verified:** primary keys on all four initializer-created tables; album photo foreign key with cascading deletion; `NOT NULL` rules/defaults listed above.
2. **Required for current behavior:** `students.email` and `users.email` need uniqueness so duplicate detection can reliably map to `23505`. Both routes lowercase email before insertion. `users.role` must contain values used by staff setup/login. Account ids must be integer-compatible with middleware `Number.isInteger`.
3. **Not established:** any authoritative `users`/`students` column types/lengths, identity strategy, email case-insensitive constraint, password hash length, role enum/check, student semester domain, gender values, roll-number uniqueness, timestamps, cross-table uniqueness, account status/soft deletion, or relationships. The proposal uses non-null gender/roll columns to match current browser/API registration validation, but that still needs DBA approval.
4. **Suggested after DBA approval:** unique email constraints for both account tables; a check restricting `users.role` to `admin`, `principal`, `teacher`; `students.semester` check for 1 through 4 because registration enforces that range; index `annual_party_photos(album_id)` for album reads. These are proposals, not existing facts.

## Proposed account DDL for DBA review only

The adjacent file [`backend/migrations/0001_account_schema.proposed.sql`](./backend/migrations/0001_account_schema.proposed.sql) proposes minimum account tables based on query-required columns. It deliberately labels assumed types and constraints and is **not wired to a migration runner**. It does not modify or recreate event/gallery tables, and it must not be run as-is against any database. Replace or reject it based on the authoritative schema source and DBA review.

## Safe validation plan

After written approval only, follow the PowerShell procedure in the README's **Dedicated local PostgreSQL test database** section. Do not use `backend/.env` as permission to write to the college database. Verify `DB_HOST=localhost` and `DB_NAME=jhcollege_events_test` in the current shell, obtain/apply the authoritative approved schema only to that isolated database, and run the event/gallery initializer only after confirming the target and setting `DB_INIT_CONFIRM` to the exact test database name. Then run database-backed integration tests using synthetic records; cleanup may target only IDs created by that test run and only within the isolated test database.

Current automated route tests mock the pool. They do not verify DDL compatibility, constraints, PostgreSQL type behavior, persistence, or backups.
