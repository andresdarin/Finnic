-- WhatsApp intake (linking, durable queue, drafts, audited writes), LLEGAR goals and Finnic Rewards.
-- Additive only: no existing column, constraint or row is modified.

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "whatsappDefaultAccountId" TEXT,
ADD COLUMN     "whatsappDefaultCurrency" "FinanceCurrency",
ADD COLUMN     "whatsappLinkedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WhatsAppInboundMessage" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contextWamid" TEXT,
ADD COLUMN     "intent" TEXT,
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "mediaId" TEXT,
ADD COLUMN     "mediaMimeType" TEXT,
ADD COLUMN     "mediaSha256" TEXT,
ADD COLUMN     "mediaSize" INTEGER,
ADD COLUMN     "messageTimestamp" TIMESTAMP(3),
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "replyAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "replyError" TEXT,
ADD COLUMN     "replyNextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "replySentAt" TIMESTAMP(3),
ADD COLUMN     "replyStatus" TEXT,
ADD COLUMN     "replyText" TEXT,
ADD COLUMN     "replyWamid" TEXT,
ADD COLUMN     "result" JSONB;

-- CreateTable
CREATE TABLE "TranquilityGoal" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(18,2) NOT NULL,
    "currency" "FinanceCurrency" NOT NULL,
    "targetDate" DATE NOT NULL,
    "allocatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

CONSTRAINT "TranquilityGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranquilityGoalContribution" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "date" DATE NOT NULL,
    "movementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "TranquilityGoalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rewardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "RewardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "priceAmount" DECIMAL(18,2) NOT NULL,
    "currency" "FinanceCurrency" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "RewardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLinkCode" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "WhatsAppLinkCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppExpenseDraft" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sourceInboundId" TEXT NOT NULL,
    "sourceWamid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting',
    "pendingField" TEXT,
    "question" TEXT,
    "proposal" JSONB NOT NULL,
    "expenseId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

CONSTRAINT "WhatsAppExpenseDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppExpenseAction" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "inboundId" TEXT NOT NULL,
    "expenseId" TEXT,
    "kind" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "WhatsAppExpenseAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranquilityGoal_profileId_status_idx" ON "TranquilityGoal"("profileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TranquilityGoal_id_profileId_key" ON "TranquilityGoal"("id", "profileId");

-- CreateIndex
CREATE INDEX "TranquilityGoalContribution_profileId_goalId_date_idx" ON "TranquilityGoalContribution"("profileId", "goalId", "date");

-- CreateIndex
CREATE INDEX "RewardEntry_profileId_createdAt_idx" ON "RewardEntry"("profileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardEntry_profileId_ruleKey_periodKey_key" ON "RewardEntry"("profileId", "ruleKey", "periodKey");

-- CreateIndex
CREATE INDEX "RewardItem_profileId_isActive_idx" ON "RewardItem"("profileId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppLinkCode_codeHash_key" ON "WhatsAppLinkCode"("codeHash");

-- CreateIndex
CREATE INDEX "WhatsAppLinkCode_profileId_createdAt_idx" ON "WhatsAppLinkCode"("profileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppExpenseDraft_sourceInboundId_key" ON "WhatsAppExpenseDraft"("sourceInboundId");

-- CreateIndex
CREATE INDEX "WhatsAppExpenseDraft_profileId_status_updatedAt_idx" ON "WhatsAppExpenseDraft"("profileId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppExpenseAction_inboundId_key" ON "WhatsAppExpenseAction"("inboundId");

-- CreateIndex
CREATE INDEX "WhatsAppExpenseAction_profileId_createdAt_idx" ON "WhatsAppExpenseAction"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppExpenseAction_expenseId_idx" ON "WhatsAppExpenseAction"("expenseId");

-- CreateIndex
CREATE INDEX "WhatsAppInboundMessage_status_nextAttemptAt_idx" ON "WhatsAppInboundMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WhatsAppInboundMessage_replyStatus_replyNextAttemptAt_idx" ON "WhatsAppInboundMessage"("replyStatus", "replyNextAttemptAt");

-- CreateIndex
CREATE INDEX "WhatsAppInboundMessage_replyWamid_idx" ON "WhatsAppInboundMessage"("replyWamid");

-- CreateIndex
CREATE INDEX "WhatsAppInboundMessage_profileId_mediaSha256_idx" ON "WhatsAppInboundMessage"("profileId", "mediaSha256");

-- AddForeignKey
ALTER TABLE "TranquilityGoal" ADD CONSTRAINT "TranquilityGoal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranquilityGoalContribution" ADD CONSTRAINT "TranquilityGoalContribution_goalId_profileId_fkey" FOREIGN KEY ("goalId", "profileId") REFERENCES "TranquilityGoal"("id", "profileId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardEntry" ADD CONSTRAINT "RewardEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardItem" ADD CONSTRAINT "RewardItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppLinkCode" ADD CONSTRAINT "WhatsAppLinkCode_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppExpenseDraft" ADD CONSTRAINT "WhatsAppExpenseDraft_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppExpenseAction" ADD CONSTRAINT "WhatsAppExpenseAction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity guards that Prisma cannot model.
ALTER TABLE "TranquilityGoal" ADD CONSTRAINT "TranquilityGoal_amounts_valid" CHECK ("targetAmount" > 0 AND "allocatedAmount" >= 0);
ALTER TABLE "TranquilityGoal" ADD CONSTRAINT "TranquilityGoal_status_valid" CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'ARCHIVED'));
ALTER TABLE "TranquilityGoalContribution" ADD CONSTRAINT "TranquilityGoalContribution_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "TranquilityGoalContribution" ADD CONSTRAINT "TranquilityGoalContribution_kind_valid" CHECK ("kind" IN ('CONTRIBUTION', 'ALLOCATION', 'RELEASE'));
ALTER TABLE "RewardEntry" ADD CONSTRAINT "RewardEntry_points_sign" CHECK (("kind" = 'EARN' AND "points" > 0) OR ("kind" = 'REDEEM' AND "points" < 0));
ALTER TABLE "RewardItem" ADD CONSTRAINT "RewardItem_values_positive" CHECK ("pointsCost" > 0 AND "priceAmount" > 0);
ALTER TABLE "WhatsAppExpenseAction" ADD CONSTRAINT "WhatsAppExpenseAction_kind_valid" CHECK ("kind" IN ('create', 'correct', 'undo'));

-- Server-only tables: never readable through Supabase anon/authenticated roles.
ALTER TABLE "WhatsAppInboundMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppLinkCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppExpenseDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppExpenseAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranquilityGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranquilityGoalContribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RewardEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RewardItem" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE "WhatsAppInboundMessage", "WhatsAppLinkCode", "WhatsAppExpenseDraft", "WhatsAppExpenseAction", "TranquilityGoal", "TranquilityGoalContribution", "RewardEntry", "RewardItem" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE "WhatsAppInboundMessage", "WhatsAppLinkCode", "WhatsAppExpenseDraft", "WhatsAppExpenseAction", "TranquilityGoal", "TranquilityGoalContribution", "RewardEntry", "RewardItem" FROM authenticated; END IF;
END $$;
