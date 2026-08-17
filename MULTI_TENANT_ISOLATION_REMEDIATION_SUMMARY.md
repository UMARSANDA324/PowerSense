# Multi-Tenant Isolation Remediation

## Scope

This release-blocking remediation establishes `Company` as the single ownership field for tenant-owned records. `platform-owner` is the only global role. Legacy `super-admin` is treated as a company-scoped role.

## Schema updates

The tenant enforcement plugin is applied to:

- `State`, `LGA`, `Ward`, `Feeder`, `InjectionSubstation`, `Coordinates`, and `FeederCoverage`
- `Report`, `Notification`, `Prediction`, `Outage`, `PowerLog`, `PowerStatus`, and `Reminder`
- `User`, `ActivityTimeline`, `Approval`, `Audit`, and `Workflow`

Operational schemas require `companyId` and retain the existing `Company` reference. The shared schema hook enforces ownership on reads, aggregates, updates, deletes, and saves. Non-platform saves receive the active company automatically and reject missing or foreign ownership.

## Collection migration

`backend/scripts/migrateToTenant.js` is idempotent and assigns legacy ownerless operational documents to the original/default company. It assigns only non-platform users to that company and deliberately preserves platform-owner users without `companyId`.

Run after configuring the production MongoDB connection:

```text
npm run migrate:tenant --prefix backend
```

## Repository and service corrections

- Runtime Context is now created per request instead of using a process-global mutable singleton.
- Operational Scope is now created per request and resolves through the request-local Runtime Context.
- AsyncLocalStorage carries the active tenant into model queries and shared repositories.
- Optional authentication runs before tenant/runtime context resolution.
- Tenant resolution fails closed for non-platform requests with no company.
- Assigned feeders and location resources are resolved through tenant-aware model queries.
- Legacy default-company fallback paths were removed from tenant resolution and admin provisioning.
- Admin creation uses the authenticated company, or an explicit target company supplied by the platform owner.
- Notification creation copies the recipient's company ownership.

## API corrections

- Location reads and writes apply tenant filters; ownerless public location reads return no tenant data.
- Location ID lookups are tenant-scoped by the model layer.
- Reports, predictions, notifications, power state/logs, and related operational queries are tenant-scoped.
- Anonymous report creation is disabled because reports must belong to exactly one company.
- Company registry, settings, and overview reads are restricted to the caller's company unless the caller is `platform-owner`.
- `super-admin` no longer receives global access in tenant validation, Runtime Context, or Operational Scope.

## Frontend corrections

- Logout clears local and session storage and emits a tenant logout event.
- Dashboard operational state is reset and in-flight requests are aborted when `companyId` changes.
- Existing API authentication continues to derive the bearer token from local storage per request.

## Validation performed

- Backend syntax checked across all model files and touched services/controllers/routes.
- VS Code diagnostics report no errors in touched files.
- `npm test --prefix backend` completed successfully.
- `npm run build --prefix frontend` completed successfully. Vite still reports pre-existing JSX warnings in `frontend/src/pages/AdminDashboard.jsx`; those warnings are outside this remediation.

## Required deployment validation

Against the configured MongoDB, execute the migration, create Company A and Company B, populate each independently, then verify all operational endpoints for each company. Specifically assert zero states, LGAs, wards, feeders, reports, notifications, predictions, and power records for a newly provisioned Company B before Company B data is created, then assert reciprocal non-visibility after both tenants are populated.

## Remaining risks

- The two-company runtime validation was not executed in this workspace because no live MongoDB test run was available during the change.
- Background jobs that intentionally operate outside an HTTP request must be reviewed to ensure they iterate explicit company IDs rather than relying on request-local context.
- Existing duplicate-name and global uniqueness indexes on some geographic collections may prevent identical names across companies; this is an isolation-safe constraint but may need a separate product decision.
- Existing frontend build warnings in `AdminDashboard.jsx` remain and should be cleaned up separately.
