import "dotenv/config";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import {
  EscalationTargetType,
  IncidentSeverity,
  PrismaClient,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@oncallr.dev",
    },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@oncallr.dev",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const engineer = await prisma.user.upsert({
    where: {
      email: "engineer@oncallr.dev",
    },
    update: {},
    create: {
      name: "On-Call Engineer",
      email: "engineer@oncallr.dev",
      passwordHash,
      role: UserRole.ENGINEER,
    },
  });

  const schedule = await prisma.schedule.upsert({
    where: {
      id: "11111111-1111-1111-1111-111111111111",
    },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Primary Backend Rotation",
      timeZone: "UTC",
      members: {
        create: [
          {
            userId: engineer.id,
            rotationOrder: 1,
          },
          {
            userId: admin.id,
            rotationOrder: 2,
          },
        ],
      },
    },
  });

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await prisma.oncallShift.upsert({
    where: {
      id: "22222222-2222-2222-2222-222222222222",
    },
    update: {
      userId: engineer.id,
      startTime: now,
      endTime: nextWeek,
    },
    create: {
      id: "22222222-2222-2222-2222-222222222222",
      scheduleId: schedule.id,
      userId: engineer.id,
      startTime: now,
      endTime: nextWeek,
    },
  });

  const service = await prisma.service.upsert({
    where: {
      id: "33333333-3333-3333-3333-333333333333",
    },
    update: {},
    create: {
      id: "33333333-3333-3333-3333-333333333333",
      name: "Payment API",
      description: "Processes checkout and payment requests.",
      webhookToken: randomUUID(),
    },
  });

  await prisma.escalationPolicy.upsert({
    where: {
      serviceId: service.id,
    },
    update: {},
    create: {
      serviceId: service.id,
      timeoutMinutes: 5,
      steps: [
        {
          type: EscalationTargetType.SCHEDULE,
          scheduleId: schedule.id,
          label: "Primary schedule",
        },
        {
          type: EscalationTargetType.USER,
          userId: admin.id,
          label: "Fallback admin",
        },
      ],
    },
  });

  console.log("Seed complete.");
  console.log("Admin login: admin@oncallr.dev / password123");
  console.log("Engineer login: engineer@oncallr.dev / password123");
  console.log(`Webhook token for ${service.name}: ${service.webhookToken}`);
  console.log(`Try severity values like: ${IncidentSeverity.CRITICAL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
