-- CreateTable
CREATE TABLE "UserAuditoriumAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "auditoriumId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAuditoriumAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAuditoriumAssignment_auditoriumId_fkey" FOREIGN KEY ("auditoriumId") REFERENCES "Auditorium" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovementRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "fromAuditoriumId" TEXT NOT NULL,
    "toAuditoriumId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decisionComment" TEXT,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovementRequest_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovementRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovementRequest_fromAuditoriumId_fkey" FOREIGN KEY ("fromAuditoriumId") REFERENCES "Auditorium" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovementRequest_toAuditoriumId_fkey" FOREIGN KEY ("toAuditoriumId") REFERENCES "Auditorium" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovementRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserAuditoriumAssignment_auditoriumId_idx" ON "UserAuditoriumAssignment"("auditoriumId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuditoriumAssignment_userId_auditoriumId_key" ON "UserAuditoriumAssignment"("userId", "auditoriumId");

-- CreateIndex
CREATE INDEX "MovementRequest_status_createdAt_idx" ON "MovementRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MovementRequest_equipmentId_idx" ON "MovementRequest"("equipmentId");

-- CreateIndex
CREATE INDEX "MovementRequest_requestedById_idx" ON "MovementRequest"("requestedById");
