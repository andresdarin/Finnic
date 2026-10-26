-- Additive migration for the personal Tranquilidad Financiera lane.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceAccountPurpose') THEN
    CREATE TYPE "FinanceAccountPurpose" AS ENUM ('OPERATING','EMERGENCY','INVESTMENT');
  ELSE
    ALTER TYPE "FinanceAccountPurpose" ADD VALUE IF NOT EXISTS 'OPERATING';
    ALTER TYPE "FinanceAccountPurpose" ADD VALUE IF NOT EXISTS 'EMERGENCY';
    ALTER TYPE "FinanceAccountPurpose" ADD VALUE IF NOT EXISTS 'INVESTMENT';
  END IF;
END $$;

ALTER TABLE "FinanceAccount" ADD COLUMN IF NOT EXISTS "purpose" "FinanceAccountPurpose" NOT NULL DEFAULT 'OPERATING';
ALTER TABLE "FinanceAccount" ADD COLUMN IF NOT EXISTS "openingBalance" DECIMAL(18,2);
ALTER TABLE "PersonalExpense" ADD COLUMN IF NOT EXISTS "tranquilityCategoryId" TEXT;
ALTER TABLE "PersonalExpense" ADD COLUMN IF NOT EXISTS "tranquilityBucket" TEXT;
ALTER TABLE "PersonalExpense" ADD COLUMN IF NOT EXISTS "tranquilityFxSnapshot" JSONB;
ALTER TABLE "PersonalExpense" ADD COLUMN IF NOT EXISTS "tranquilityOwned" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "TranquilityConfig" (
  "id" TEXT NOT NULL PRIMARY KEY, "profileId" TEXT NOT NULL UNIQUE, "currency" "FinanceCurrency" NOT NULL,
  "config" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "TranquilityBudget" (
  "id" TEXT NOT NULL PRIMARY KEY, "profileId" TEXT NOT NULL, "month" TEXT NOT NULL, "currency" "FinanceCurrency" NOT NULL,
  "needsTarget" DECIMAL(18,2) NOT NULL, "wantsTarget" DECIMAL(18,2) NOT NULL, "futureTarget" DECIMAL(18,2) NOT NULL,
  "configSnapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("profileId","month")
);
CREATE TABLE IF NOT EXISTS "TranquilityCategory" (
  "id" TEXT NOT NULL PRIMARY KEY, "profileId" TEXT NOT NULL, "name" TEXT NOT NULL, "bucket" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("profileId","name")
);
CREATE TABLE IF NOT EXISTS "TranquilityScenario" (
  "id" TEXT NOT NULL PRIMARY KEY, "profileId" TEXT NOT NULL, "name" TEXT NOT NULL, "scenario" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "TranquilityValuation" (
  "id" TEXT NOT NULL PRIMARY KEY, "profileId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "date" DATE NOT NULL,
  "oldBalance" DECIMAL(18,2) NOT NULL, "newBalance" DECIMAL(18,2) NOT NULL, "difference" DECIMAL(18,2) NOT NULL,
  "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "PersonalExpense" ADD CONSTRAINT "PersonalExpense_tranquilityCategoryId_fkey" FOREIGN KEY ("tranquilityCategoryId") REFERENCES "TranquilityCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TranquilityConfig" ADD CONSTRAINT "TranquilityConfig_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE;
ALTER TABLE "TranquilityBudget" ADD CONSTRAINT "TranquilityBudget_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE;
ALTER TABLE "TranquilityCategory" ADD CONSTRAINT "TranquilityCategory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE;
ALTER TABLE "TranquilityScenario" ADD CONSTRAINT "TranquilityScenario_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE;
ALTER TABLE "TranquilityValuation" ADD CONSTRAINT "TranquilityValuation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "TranquilityBudget_profileId_month_idx" ON "TranquilityBudget"("profileId","month");
CREATE INDEX IF NOT EXISTS "TranquilityValuation_profileId_date_idx" ON "TranquilityValuation"("profileId","date");
ALTER TABLE "TranquilityConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranquilityBudget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranquilityCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranquilityScenario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranquilityValuation" ENABLE ROW LEVEL SECURITY;

-- Browser roles never access these tables; the API always applies profile predicates.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE "TranquilityConfig","TranquilityBudget","TranquilityCategory","TranquilityScenario","TranquilityValuation" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE "TranquilityConfig","TranquilityBudget","TranquilityCategory","TranquilityScenario","TranquilityValuation" FROM authenticated; END IF;
END $$;
