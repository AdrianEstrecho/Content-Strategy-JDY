-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN     "igMediaId" TEXT,
ADD COLUMN     "igPermalink" TEXT,
ADD COLUMN     "publishError" TEXT;

-- CreateTable
CREATE TABLE "IntegrationToken" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishLog" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "igMediaId" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationToken_provider_key" ON "IntegrationToken"("provider");

-- CreateIndex
CREATE INDEX "PublishLog_contentItemId_idx" ON "PublishLog"("contentItemId");

-- CreateIndex
CREATE INDEX "PublishLog_createdAt_idx" ON "PublishLog"("createdAt");
