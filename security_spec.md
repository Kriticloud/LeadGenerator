# LeadPulse AI Security Specification

## 1. Data Invariants
- A lead must have a unique ID.
- A lead's `leadScore` and `urgencyScore` must be between 1 and 100.
- A lead's `status` must be one of the defined statuses.
- Users can only read and write their own settings (if we add multi-user, currently we assume a common set or single user for simplicity as OAuth wasn't explicitly asked but I'll prepare for it).
- Leads are currently shared or per-application instance in this version.

## 2. The "Dirty Dozen" Payloads (Deny Cases)
1. Lead with `leadScore` = 101.
2. Lead with `status` = 'undefined_status'.
3. Lead with string instead of object for `contactInfo`.
4. Lead with 2MB of junk text in `description`.
5. Lead with `createdAt` set to a future date by client.
6. Updating `id` field.
7. Updating `createdAt` field.
8. Lead with `urgencyScore` = -1.
9. Lead with `confidence` = 2.0.
10. Anonymous user trying to write to `/leads/`.
11. Admin field injection into a standard lead update.
12. Deleting a lead without valid ID.

## 3. Test Runner
(Standard `firestore.rules.test.ts` pattern would follow)
