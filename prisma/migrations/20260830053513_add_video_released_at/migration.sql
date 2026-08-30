-- AlterTable
ALTER TABLE "Video" ADD COLUMN "releasedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Video_releasedAt_idx" ON "Video"("releasedAt");
