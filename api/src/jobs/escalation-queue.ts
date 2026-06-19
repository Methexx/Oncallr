import { Job, Queue, Worker } from "bullmq";
import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { processEscalationJob } from "../services/escalation-service";

export interface EscalationJobData {
  incidentId: string;
}

export const ESCALATION_QUEUE_NAME = "incident-escalation";

export const escalationQueuePlugin = fp(async (app: FastifyInstance) => {
  const escalationQueue = new Queue<EscalationJobData>(ESCALATION_QUEUE_NAME, {
    connection: {
      url: app.config.redisUrl,
    },
  });

  const escalationWorker = new Worker<EscalationJobData>(
    ESCALATION_QUEUE_NAME,
    async (job: Job<EscalationJobData>) => {
      await processEscalationJob(app, job.data);
    },
    {
      connection: {
        url: app.config.redisUrl,
      },
    }
  );

  app.decorate("queues", {
    escalation: escalationQueue,
  });

  app.decorate("workers", {
    escalation: escalationWorker,
  });

  app.addHook("onClose", async () => {
    await escalationWorker.close();
    await escalationQueue.close();
  });
});
