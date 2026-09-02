-- AlterTable
ALTER TABLE "PageView" ADD COLUMN "referrer" TEXT;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN "fingerprint" TEXT;

-- CreateTable
CREATE TABLE "IpScore" (
    "ip" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'observado',
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "assetHits" INTEGER NOT NULL DEFAULT 0,
    "htmlHits" INTEGER NOT NULL DEFAULT 0,
    "verifiedBot" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT,
    "whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "honeypotHit" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScoreSignal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ip" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreSignal_ip_fkey" FOREIGN KEY ("ip") REFERENCES "IpScore" ("ip") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IpScore_score_idx" ON "IpScore"("score");

-- CreateIndex
CREATE INDEX "IpScore_state_idx" ON "IpScore"("state");

-- CreateIndex
CREATE INDEX "IpScore_fingerprint_idx" ON "IpScore"("fingerprint");

-- CreateIndex
CREATE INDEX "ScoreSignal_ip_createdAt_idx" ON "ScoreSignal"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreSignal_key_createdAt_idx" ON "ScoreSignal"("key", "createdAt");

-- CreateIndex
CREATE INDEX "Visit_fingerprint_idx" ON "Visit"("fingerprint");
