-- AlterTable
ALTER TABLE "Visit" ADD COLUMN "ip" TEXT;

-- CreateIndex
CREATE INDEX "Visit_ip_createdAt_idx" ON "Visit"("ip", "createdAt");
