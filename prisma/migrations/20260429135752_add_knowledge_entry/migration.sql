-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'note',
    "sourceUrl" TEXT,
    "rawContent" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "keyIdeas" TEXT NOT NULL DEFAULT '[]',
    "contentAngles" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeEntry_status_idx" ON "KnowledgeEntry"("status");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_createdAt_idx" ON "KnowledgeEntry"("createdAt");
