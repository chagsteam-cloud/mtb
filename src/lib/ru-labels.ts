import type {
  EquipmentStatus,
  OperationType,
  UserRole,
} from "@/generated/prisma/enums";

/** Полное название роли (подписи в меню, формах). */
export function userRoleFullLabel(role: UserRole): string {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "Системный администратор";
    case "ACCOUNTING":
      return "Бухгалтерия";
    case "LABORATORY":
      return "Лаборант";
    case "TEACHER":
      return "Преподаватель";
  }
}

/** Короткая подпись роли (бейджи, компактные списки). */
export function userRoleShortLabel(role: UserRole): string {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "Администратор";
    case "ACCOUNTING":
      return "Бухгалтерия";
    case "LABORATORY":
      return "Лаборант";
    case "TEACHER":
      return "Преподаватель";
  }
}

export function equipmentStatusLabel(status: EquipmentStatus): string {
  switch (status) {
    case "WORKING":
      return "Исправно";
    case "MAINTENANCE":
      return "На обслуживании";
    case "BROKEN":
      return "Неисправно";
    case "WRITTEN_OFF":
      return "Списано";
  }
}

export function operationTypeLabel(type: OperationType): string {
  switch (type) {
    case "STATUS_CHANGED":
      return "Изменение статуса";
    case "MOVED":
      return "Перемещение";
    case "CREATED":
      return "Создание записи";
    case "UPDATED":
      return "Изменение записи";
    case "DELETED":
      return "Удаление записи";
    case "MOVEMENT_REQUESTED":
      return "Запрос на перемещение";
    case "MOVEMENT_APPROVED":
      return "Перемещение согласовано";
    case "MOVEMENT_REJECTED":
      return "Перемещение отклонено";
  }
}
