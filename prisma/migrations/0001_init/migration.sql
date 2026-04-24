-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMIN', 'ACCOUNTING', 'LABORATORY', 'TEACHER');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('WORKING', 'MAINTENANCE', 'BROKEN', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('STATUS_CHANGED', 'MOVED', 'CREATED', 'UPDATED', 'DELETED', 'MOVEMENT_REQUESTED', 'MOVEMENT_APPROVED', 'MOVEMENT_REJECTED');

-- CreateEnum
CREATE TYPE "MovementRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditorium" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "building" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auditorium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAuditoriumAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "auditoriumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAuditoriumAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "inventoryNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'WORKING',
    "cost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "auditoriumId" TEXT NOT NULL,
    "responsiblePersonId" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementRequest" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "fromAuditoriumId" TEXT NOT NULL,
    "toAuditoriumId" TEXT NOT NULL,
    "status" "MovementRequestStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decisionComment" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationLog" (
    "id" TEXT NOT NULL,
    "operationType" "OperationType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "previousStatus" "EquipmentStatus",
    "newStatus" "EquipmentStatus",
    "fromAuditoriumId" TEXT,
    "toAuditoriumId" TEXT,
    "equipmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "OperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCategory_name_key" ON "EquipmentCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Auditorium_number_key" ON "Auditorium"("number");

-- CreateIndex
CREATE INDEX "UserAuditoriumAssignment_auditoriumId_idx" ON "UserAuditoriumAssignment"("auditoriumId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuditoriumAssignment_userId_auditoriumId_key" ON "UserAuditoriumAssignment"("userId", "auditoriumId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_inventoryNumber_key" ON "Equipment"("inventoryNumber");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_auditoriumId_idx" ON "Equipment"("auditoriumId");

-- CreateIndex
CREATE INDEX "Equipment_categoryId_idx" ON "Equipment"("categoryId");

-- CreateIndex
CREATE INDEX "MovementRequest_status_createdAt_idx" ON "MovementRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MovementRequest_equipmentId_idx" ON "MovementRequest"("equipmentId");

-- CreateIndex
CREATE INDEX "MovementRequest_requestedById_idx" ON "MovementRequest"("requestedById");

-- CreateIndex
CREATE INDEX "OperationLog_equipmentId_occurredAt_idx" ON "OperationLog"("equipmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "OperationLog_authorId_occurredAt_idx" ON "OperationLog"("authorId", "occurredAt");

-- AddForeignKey
ALTER TABLE "UserAuditoriumAssignment" ADD CONSTRAINT "UserAuditoriumAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAuditoriumAssignment" ADD CONSTRAINT "UserAuditoriumAssignment_auditoriumId_fkey" FOREIGN KEY ("auditoriumId") REFERENCES "Auditorium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_auditoriumId_fkey" FOREIGN KEY ("auditoriumId") REFERENCES "Auditorium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_responsiblePersonId_fkey" FOREIGN KEY ("responsiblePersonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_fromAuditoriumId_fkey" FOREIGN KEY ("fromAuditoriumId") REFERENCES "Auditorium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_toAuditoriumId_fkey" FOREIGN KEY ("toAuditoriumId") REFERENCES "Auditorium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_fromAuditoriumId_fkey" FOREIGN KEY ("fromAuditoriumId") REFERENCES "Auditorium"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_toAuditoriumId_fkey" FOREIGN KEY ("toAuditoriumId") REFERENCES "Auditorium"("id") ON DELETE SET NULL ON UPDATE CASCADE;
