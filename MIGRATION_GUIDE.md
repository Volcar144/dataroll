# How to Apply Database Migration

This fix includes a database migration that needs to be applied to resolve the account creation error.

## For Development
```bash
# Apply the migration
npx prisma migrate deploy

# Or use the npm script
npm run db:migrate:deploy
```

## For Production/Staging
```bash
# Set the DIRECT_URL environment variable
export DIRECT_URL="your-postgresql-connection-string"

# Apply the migration
npx prisma migrate deploy
```

## Verification
After applying the migration, Better Auth should be able to create accounts successfully. Test by:
1. Attempting to sign up with email/password
2. Checking the logs for the "Argument `type` is missing" error (should be gone)
3. Verifying accounts are created in the database

## Rollback
If you need to rollback this migration:
```sql
-- Make fields required again (only if no Better Auth accounts exist)
ALTER TABLE "accounts" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "accounts" ALTER COLUMN "provider" SET NOT NULL;
ALTER TABLE "accounts" ALTER COLUMN "providerAccountId" SET NOT NULL;
```

**Warning:** Rollback will fail if there are accounts created by Better Auth that have NULL values in these fields.
