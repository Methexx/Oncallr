import OpenAI from "openai";
import { FastifyInstance } from "fastify";

const postmortemDraftSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description: "Plain-English summary of what happened.",
    },
    impact: {
      type: "string",
      description: "Customer and system impact of the incident.",
    },
    rootCause: {
      type: "string",
      description: "Most likely technical or operational root cause.",
    },
    resolution: {
      type: "string",
      description: "How the team restored service and validated recovery.",
    },
    timelineHighlights: {
      type: "array",
      items: {
        type: "string",
      },
      minItems: 3,
      maxItems: 8,
    },
    followUpActions: {
      type: "array",
      items: {
        type: "string",
      },
      minItems: 2,
      maxItems: 6,
    },
  },
  required: [
    "summary",
    "impact",
    "rootCause",
    "resolution",
    "timelineHighlights",
    "followUpActions",
  ],
} as const;

function buildTimelineText(
  events: Array<{
    type: string;
    message: string;
    createdAt: Date;
    actor?: {
      name: string;
      email: string;
    } | null;
  }>
) {
  return events
    .map((event) => {
      const actor = event.actor
        ? ` by ${event.actor.name} (${event.actor.email})`
        : "";

      return `- ${event.createdAt.toISOString()} | ${event.type} | ${event.message}${actor}`;
    })
    .join("\n");
}

export function isOpenAiConfigured(app: FastifyInstance) {
  return Boolean(app.config.openaiApiKey);
}

export async function generatePostmortemDraftWithAi(
  app: FastifyInstance,
  incident: {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    createdAt: Date;
    resolvedAt: Date | null;
    service: {
      name: string;
    };
    events: Array<{
      type: string;
      message: string;
      createdAt: Date;
      actor?: {
        name: string;
        email: string;
      } | null;
    }>;
  }
) {
  if (!app.config.openaiApiKey) {
    throw new Error("OpenAI is not configured.");
  }

  const client = new OpenAI({
    apiKey: app.config.openaiApiKey,
  });

  const durationMinutes = incident.resolvedAt
    ? Math.max(
        1,
        Math.round(
          (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 60_000
        )
      )
    : null;

  const response = await client.responses.create({
    model: app.config.openaiModel,
    store: false,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are an incident response assistant. Generate a concise, professional engineering postmortem draft. Use only the provided incident data. Do not invent facts. If details are unclear, state that uncertainty clearly while still producing a useful draft.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Incident ID: ${incident.id}`,
              `Service: ${incident.service.name}`,
              `Title: ${incident.title}`,
              `Severity: ${incident.severity}`,
              `Created at: ${incident.createdAt.toISOString()}`,
              `Resolved at: ${incident.resolvedAt?.toISOString() ?? "Unknown"}`,
              `Duration minutes: ${durationMinutes ?? "Unknown"}`,
              `Description: ${incident.description ?? "No description provided."}`,
              "",
              "Timeline:",
              buildTimelineText(incident.events),
            ].join("\n"),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "postmortem_draft",
        strict: true,
        schema: postmortemDraftSchema,
      },
    },
  });

  return JSON.parse(response.output_text);
}
