-- Write-integrity constraints for the Tranquilidad command lane.
ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_id_profileId_key" UNIQUE ("id", "profileId");
ALTER TABLE "TranquilityCategory" ADD CONSTRAINT "TranquilityCategory_id_profileId_key" UNIQUE ("id", "profileId");
ALTER TABLE "TranquilityValuation" ADD CONSTRAINT "TranquilityValuation_account_profile_fkey"
  FOREIGN KEY ("accountId", "profileId") REFERENCES "FinanceAccount"("id", "profileId");
ALTER TABLE "PersonalExpense" ADD CONSTRAINT "PersonalExpense_category_profile_fkey"
  FOREIGN KEY ("tranquilityCategoryId", "profileId") REFERENCES "TranquilityCategory"("id", "profileId");
CREATE INDEX IF NOT EXISTS "PersonalExpense_profile_date_idx" ON "PersonalExpense"("profileId", "date");
CREATE INDEX IF NOT EXISTS "TranquilityValuation_profile_account_date_idx" ON "TranquilityValuation"("profileId", "accountId", "date");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PersonalExpense_tranquility_amount_positive') THEN
    ALTER TABLE "PersonalExpense" ADD CONSTRAINT "PersonalExpense_tranquility_amount_positive" CHECK (NOT "tranquilityOwned" OR "amount" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TranquilityBudget_targets_nonnegative') THEN
    ALTER TABLE "TranquilityBudget" ADD CONSTRAINT "TranquilityBudget_targets_nonnegative" CHECK ("needsTarget" >= 0 AND "wantsTarget" >= 0 AND "futureTarget" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TranquilityBudget_month_format') THEN
    ALTER TABLE "TranquilityBudget" ADD CONSTRAINT "TranquilityBudget_month_format" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TranquilityCategory_bucket_valid') THEN
    ALTER TABLE "TranquilityCategory" ADD CONSTRAINT "TranquilityCategory_bucket_valid" CHECK ("bucket" IN ('NEEDS', 'WANTS'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TranquilityConfig_bps_valid') THEN
    ALTER TABLE "TranquilityConfig" ADD CONSTRAINT "TranquilityConfig_bps_valid" CHECK (
      ("config"->>'needsBps')::int BETWEEN 0 AND 10000 AND
      ("config"->>'wantsBps')::int BETWEEN 0 AND 10000 AND
      ("config"->>'futureBps')::int BETWEEN 0 AND 10000 AND
      ("config"->>'needsBps')::int + ("config"->>'wantsBps')::int + ("config"->>'futureBps')::int = 10000
    );
  END IF;
END $$;
ALTER TABLE "PersonalExpense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceAccount" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE "PersonalExpense", "FinanceAccount" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE "PersonalExpense", "FinanceAccount" FROM authenticated; END IF;
END $$;
