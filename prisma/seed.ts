import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { login: "admin" },
    update: {},
    create: {
      login: "admin",
      fullName: "Системный администратор",
      role: "SYSTEM_ADMIN",
      passwordHash:
        "$2b$12$t2ylskzfHHqvr.3Yt8tuZu7Z/VzIigGQBcWIbA0imps3hsIbA4nhm",
    },
  });

  const accountant = await prisma.user.upsert({
    where: { login: "buh" },
    update: {},
    create: {
      login: "buh",
      fullName: "Главный бухгалтер",
      role: "ACCOUNTING",
      passwordHash:
        "$2b$12$sED/cVphBMalN6J2mz6TIebKCsnuJswCrOFpfadM4zphO4lNWTHOi",
    },
  });

  const lab = await prisma.user.upsert({
    where: { login: "lab" },
    update: { fullName: "Старший лаборант" },
    create: {
      login: "lab",
      fullName: "Старший лаборант",
      role: "LABORATORY",
      passwordHash:
        "$2b$12$L3UltvyHctSDCSHJ6SHMquNEBarH64jYUrtYS9EnG3DXC0x5B0A5S",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { login: "teacher" },
    update: { fullName: "Преподаватель" },
    create: {
      login: "teacher",
      fullName: "Преподаватель",
      role: "TEACHER",
      passwordHash:
        "$2b$12$y93QtwlFfQCR.2LpvEmQI.mDPughtwOpmjjYLJDRY4BEMnazb7QP2",
    },
  });

  const catComputer = await prisma.equipmentCategory.upsert({
    where: { name: "Вычислительная техника" },
    update: {},
    create: {
      name: "Вычислительная техника",
      description: "ПК, мониторы, периферия",
    },
  });

  const catLab = await prisma.equipmentCategory.upsert({
    where: { name: "Лабораторное оборудование" },
    update: {},
    create: {
      name: "Лабораторное оборудование",
      description: "Измерительные и учебные стенды",
    },
  });

  const aud101 = await prisma.auditorium.upsert({
    where: { number: "101" },
    update: {},
    create: { number: "101", name: "Ауд. 101", building: "Корпус А" },
  });

  const aud202 = await prisma.auditorium.upsert({
    where: { number: "202" },
    update: {},
    create: { number: "202", name: "Ауд. 202", building: "Корпус Б" },
  });

  await prisma.userAuditoriumAssignment.upsert({
    where: {
      userId_auditoriumId: { userId: lab.id, auditoriumId: aud101.id },
    },
    update: {},
    create: { userId: lab.id, auditoriumId: aud101.id },
  });

  await prisma.userAuditoriumAssignment.upsert({
    where: {
      userId_auditoriumId: { userId: teacher.id, auditoriumId: aud202.id },
    },
    update: {},
    create: { userId: teacher.id, auditoriumId: aud202.id },
  });

  await prisma.equipment.upsert({
    where: { inventoryNumber: "INV-0001" },
    update: {},
    create: {
      inventoryNumber: "INV-0001",
      name: "Рабочая станция преподавателя",
      status: "WORKING",
      cost: "95000",
      categoryId: catComputer.id,
      auditoriumId: aud101.id,
      responsiblePersonId: admin.id,
    },
  });

  await prisma.equipment.upsert({
    where: { inventoryNumber: "INV-0002" },
    update: {},
    create: {
      inventoryNumber: "INV-0002",
      name: "Мультимедиа-проектор",
      status: "BROKEN",
      cost: "42000",
      categoryId: catComputer.id,
      auditoriumId: aud101.id,
      responsiblePersonId: accountant.id,
    },
  });

  await prisma.equipment.upsert({
    where: { inventoryNumber: "INV-0003" },
    update: {},
    create: {
      inventoryNumber: "INV-0003",
      name: "Осциллограф учебный",
      status: "MAINTENANCE",
      cost: "128000",
      categoryId: catLab.id,
      auditoriumId: aud202.id,
      responsiblePersonId: admin.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
