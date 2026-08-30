-- CreateTable
CREATE TABLE "VideoAlert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "videoId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoAlert_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VideoAlert_createdAt_idx" ON "VideoAlert"("createdAt");

-- CreateIndex
CREATE INDEX "VideoAlert_videoId_source_resolved_idx" ON "VideoAlert"("videoId", "source", "resolved");
