-- CreateEnum
CREATE TYPE "DefaultQueryPeriod" AS ENUM ('MONTH', 'FORTNIGHT', 'WEEK', 'YEAR', 'ALL_TIME');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "defaultQueryPeriod" "DefaultQueryPeriod" NOT NULL DEFAULT 'MONTH';
