import {
  EscalationTargetType,
  Incident,
  IncidentEventType,
  IncidentStatus,
} from "@prisma/client";
import { FastifyInstance } from "fastify";
import { EscalationJobData } from "../jobs/escalation-queue";
import {
  emitIncidentNotification,
  emitIncidentUpdate,
  hasActiveUserSocket,
} from "./socket-service";
import {
  EscalationStep,
  IncidentUpdatePayload,
} from "../types/escalation";
import { sendIncidentFallbackEmail } from "./email-service";

interface ResolvedEscalationTarget {
  step: EscalationStep;
  userId: string;
}

function parseEscalationSteps(steps: unknown): EscalationStep[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.filter((step): step is EscalationStep => {
    if (!step || typeof step !== "object") {
      return false;
    }

    const typedStep = step as EscalationStep;

    if (typedStep.type === EscalationTargetType.USER) {
      return typeof typedStep.userId === "string";
    }

    if (typedStep.type === EscalationTargetType.SCHEDULE) {
      return typeof typedStep.scheduleId === "string";
    }

    return false;
  });
}

export async function resolveEscalationTarget(
  app: FastifyInstance,
  step: EscalationStep,
  at = new Date()
): Promise<ResolvedEscalationTarget | null> {
  if (step.type === EscalationTargetType.USER && step.userId) {
    return {
      step,
      userId: step.userId,
    };
  }

  if (step.type === EscalationTargetType.SCHEDULE && step.scheduleId) {
    const shift = await app.prisma.oncallShift.findFirst({
      where: {
        scheduleId: step.scheduleId,
        startTime: {
          lte: at,
        },
        endTime: {
          gt: at,
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    if (!shift) {
      return null;
    }

    return {
      step,
      userId: shift.userId,
    };
  }

  return null;
}

export async function scheduleEscalationCheck(
  app: FastifyInstance,
  incident: Pick<Incident, "id">,
  timeoutMinutes: number
) {
  await app.queues.escalation.add(
    `incident:${incident.id}`,
    {
      incidentId: incident.id,
    },
    {
      jobId: incident.id,
      delay: timeoutMinutes * 60_000,
      removeOnComplete: 100,
      removeOnFail: 100,
    }
  );
}

export async function cancelEscalationCheck(
  app: FastifyInstance,
  incidentId: string
) {
  await app.queues.escalation.remove(incidentId).catch(() => undefined);
}

async function notifyIncidentAssignee(
  app: FastifyInstance,
  incident: Incident,
  serviceName: string,
  userId: string,
  eventMessage: string,
  stepNumber: number
) {
  const recipient = await app.prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
      name: true,
    },
  });

  emitIncidentNotification(app, userId, {
    incidentId: incident.id,
    title: incident.title,
    severity: incident.severity,
    serviceName,
  });

  await app.prisma.incidentEvent.create({
    data: {
      incidentId: incident.id,
      actorId: userId,
      type: IncidentEventType.NOTIFIED,
      message: eventMessage,
    },
  });

  if (recipient && !hasActiveUserSocket(app, userId)) {
    await sendIncidentFallbackEmail(app, {
      email: recipient.email,
      name: recipient.name,
      incidentTitle: incident.title,
      severity: incident.severity,
      serviceName,
      incidentId: incident.id,
      stepNumber,
    });
  }
}

function buildIncidentUpdatePayload(input: {
  incident: Pick<Incident, "id" | "title" | "severity" | "status" | "escalationStepIndex">;
  serviceName: string;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  updateType: IncidentUpdatePayload["updateType"];
}): IncidentUpdatePayload {
  return {
    incidentId: input.incident.id,
    title: input.incident.title,
    severity: input.incident.severity,
    serviceName: input.serviceName,
    status: input.incident.status,
    currentAssigneeId: input.currentAssigneeId,
    currentAssigneeName: input.currentAssigneeName,
    escalationStepIndex: input.incident.escalationStepIndex,
    updateType: input.updateType,
  };
}

export async function triggerInitialEscalation(
  app: FastifyInstance,
  incidentId: string
) {
  const incident = await app.prisma.incident.findUnique({
    where: {
      id: incidentId,
    },
    include: {
      service: {
        include: {
          escalationPolicy: true,
        },
      },
    },
  });

  if (!incident || !incident.service.escalationPolicy) {
    return;
  }

  const steps = parseEscalationSteps(incident.service.escalationPolicy.steps);
  const firstStep = steps[0];

  if (!firstStep) {
    return;
  }

  const target = await resolveEscalationTarget(app, firstStep);

  if (!target) {
    await app.prisma.incidentEvent.create({
      data: {
        incidentId: incident.id,
        type: IncidentEventType.ESCALATED,
        message: "Escalation step 1 could not resolve an on-call user.",
      },
    });

    return;
  }

  await app.prisma.incident.update({
    where: {
      id: incident.id,
    },
    data: {
      currentAssigneeId: target.userId,
      escalationStepIndex: 0,
    },
  });

  await notifyIncidentAssignee(
    app,
    incident,
    incident.service.name,
    target.userId,
    "Initial on-call engineer notified.",
    1
  );

  emitIncidentUpdate(
    app,
    buildIncidentUpdatePayload({
      incident: {
        ...incident,
        status: IncidentStatus.TRIGGERED,
        escalationStepIndex: 0,
      },
      serviceName: incident.service.name,
      currentAssigneeId: target.userId,
      updateType: "CREATED",
    }),
    {
      userIds: [target.userId],
      includeAdmins: true,
    }
  );

  await scheduleEscalationCheck(
    app,
    incident,
    incident.service.escalationPolicy.timeoutMinutes
  );
}

export async function processEscalationJob(
  app: FastifyInstance,
  data: EscalationJobData,
  options?: {
    skipReschedule?: boolean;
  }
) {
  const incident = await app.prisma.incident.findUnique({
    where: {
      id: data.incidentId,
    },
    include: {
      service: {
        include: {
          escalationPolicy: true,
        },
      },
    },
  });

  if (!incident || incident.status !== IncidentStatus.TRIGGERED) {
    return;
  }

  const policy = incident.service.escalationPolicy;

  if (!policy) {
    return;
  }

  const steps = parseEscalationSteps(policy.steps);

  if (steps.length === 0) {
    return;
  }

  const nextIndex = Math.min(incident.escalationStepIndex + 1, steps.length - 1);
  const target = await resolveEscalationTarget(app, steps[nextIndex]);

  if (!target) {
    await app.prisma.incidentEvent.create({
      data: {
        incidentId: incident.id,
        type: IncidentEventType.ESCALATED,
        message: `Escalation step ${nextIndex + 1} could not resolve an on-call user.`,
      },
    });

    if (!options?.skipReschedule) {
      await scheduleEscalationCheck(app, incident, policy.timeoutMinutes);
    }
    return;
  }

  const previousAssigneeId = incident.currentAssigneeId;
  await app.prisma.$transaction([
    app.prisma.incident.update({
      where: {
        id: incident.id,
      },
      data: {
        currentAssigneeId: target.userId,
        escalationStepIndex: nextIndex,
      },
    }),
    app.prisma.incidentEvent.create({
      data: {
        incidentId: incident.id,
        actorId: target.userId,
        type: IncidentEventType.ESCALATED,
        message: `Incident escalated to step ${nextIndex + 1}.`,
      },
    }),
  ]);

  await notifyIncidentAssignee(
    app,
    incident,
    incident.service.name,
    target.userId,
    `Engineer notified for escalation step ${nextIndex + 1}.`,
    nextIndex + 1
  );

  const assignee = await app.prisma.user.findUnique({
    where: {
      id: target.userId,
    },
    select: {
      name: true,
    },
  });

  emitIncidentUpdate(
    app,
    buildIncidentUpdatePayload({
      incident: {
        ...incident,
        status: IncidentStatus.TRIGGERED,
        escalationStepIndex: nextIndex,
      },
      serviceName: incident.service.name,
      currentAssigneeId: target.userId,
      currentAssigneeName: assignee?.name ?? null,
      updateType: "ESCALATED",
    }),
    {
      userIds: [previousAssigneeId, target.userId],
      includeAdmins: true,
    }
  );

  if (!options?.skipReschedule) {
    await scheduleEscalationCheck(app, incident, policy.timeoutMinutes);
  }
}
