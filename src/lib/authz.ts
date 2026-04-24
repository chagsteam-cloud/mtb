import type { UserRole } from "@/generated/prisma/enums";

export function canSeeAllEquipment(role: UserRole) {
  return role === "SYSTEM_ADMIN" || role === "ACCOUNTING";
}

export function canSeeFinancials(role: UserRole) {
  return role === "SYSTEM_ADMIN" || role === "ACCOUNTING";
}

export function canManageUsers(role: UserRole) {
  return role === "SYSTEM_ADMIN";
}

export function canManageReferenceData(role: UserRole) {
  return role === "SYSTEM_ADMIN" || role === "ACCOUNTING";
}

export function canExportInventory(role: UserRole) {
  return role === "SYSTEM_ADMIN" || role === "ACCOUNTING";
}

export function canApproveMovementRequests(role: UserRole) {
  return role === "SYSTEM_ADMIN" || role === "ACCOUNTING";
}
