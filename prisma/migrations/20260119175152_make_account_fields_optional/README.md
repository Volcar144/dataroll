# Migration: Make Account Fields Optional

## Purpose
This migration makes the `type`, `provider`, and `providerAccountId` fields optional in the `accounts` table to support Better Auth's field naming convention.

## Background
The Account model was originally designed with NextAuth-style fields, but the application uses Better Auth which has its own field naming:
- NextAuth: uses `type`, `provider`, `providerAccountId`
- Better Auth: uses `accountId`, `providerId`

Both sets of fields exist in the schema for compatibility, but Better Auth doesn't populate the NextAuth fields, causing account creation to fail when these fields are required.

## Changes
- `type` field: Changed from `String` to `String?` (nullable)
- `provider` field: Changed from `String` to `String?` (nullable)
- `providerAccountId` field: Changed from `String` to `String?` (nullable)
- Added unique constraint on `[accountId, providerId]` for Better Auth account uniqueness

## SQL
```sql
ALTER TABLE "accounts" ALTER COLUMN "type" DROP NOT NULL;
ALTER TABLE "accounts" ALTER COLUMN "provider" DROP NOT NULL;
ALTER TABLE "accounts" ALTER COLUMN "providerAccountId" DROP NOT NULL;
CREATE UNIQUE INDEX "accounts_accountId_providerId_key" ON "accounts"("accountId", "providerId");
```

## Impact
- Existing records: No data migration needed
- New records: Better Auth can now create accounts without providing NextAuth fields
- Compatibility: NextAuth-style authentication flows can still populate these fields if needed
