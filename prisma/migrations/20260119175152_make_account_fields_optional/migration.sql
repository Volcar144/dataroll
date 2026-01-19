-- AlterTable
-- Make type, provider, and providerAccountId fields optional to support Better Auth
-- Better Auth uses accountId and providerId instead of provider and providerAccountId
ALTER TABLE "accounts" ALTER COLUMN "type" DROP NOT NULL;
ALTER TABLE "accounts" ALTER COLUMN "provider" DROP NOT NULL;
ALTER TABLE "accounts" ALTER COLUMN "providerAccountId" DROP NOT NULL;

-- Add unique constraint for Better Auth fields
-- This ensures account uniqueness when using Better Auth's accountId and providerId
CREATE UNIQUE INDEX "accounts_accountId_providerId_key" ON "accounts"("accountId", "providerId");
