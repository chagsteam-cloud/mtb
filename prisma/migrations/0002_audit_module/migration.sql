-- CreateEnum
CREATE TYPE "AuditSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AuditItemResult" AS ENUM ('PENDING', 'FOUND', 'MISSING');

-- CreateTable
CREATE TABLE "AuditSession" (
    "id" TEXT NOT NULL,
    "auditoriumId" TEXT NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "AuditSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AuditSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditSessionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "result" "AuditItemResult" NOT NULL DEFAULT 'PENDING',
    "foundAt" TIMESTAMP(3),

    CONSTRAINT "AuditSessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditSessionSurplus" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditSessionSurplus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditSession_status_startedAt_idx" ON "AuditSession"("status", "startedAt");
CREATE INDEX "AuditSession_auditoriumId_idx" ON "AuditSession"("auditoriumId");
CREATE INDEX "AuditSessionItem_sessionId_result_idx" ON "AuditSessionItem"("sessionId", "result");
CREATE UNIQUE INDEX "AuditSessionItem_sessionId_equipmentId_key" ON "AuditSessionItem"("sessionId", "equipmentId");
CREATE INDEX "AuditSessionSurplus_sessionId_idx" ON "AuditSessionSurplus"("sessionId");
CREATE UNIQUE INDEX "AuditSessionSurplus_sessionId_equipmentId_key" ON "AuditSessionSurplus"("sessionId", "equipmentId");

-- AddForeignKey
ALTER TABLE "AuditSession" ADD CONSTRAINT "AuditSession_auditoriumId_fkey" FOREIGN KEY ("auditoriumId") REFERENCES "Auditorium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditSession" ADD CONSTRAINT "AuditSession_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditSession" ADD CONSTRAINT "AuditSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditSessionItem" ADD CONSTRAINT "AuditSessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditSessionItem" ADD CONSTRAINT "AuditSessionItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditSessionSurplus" ADD CONSTRAINT "AuditSessionSurplus_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditSessionSurplus" ADD CONSTRAINT "AuditSessionSurplus_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
