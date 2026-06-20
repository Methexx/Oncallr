import nodemailer from "nodemailer";
import { FastifyInstance } from "fastify";

function hasSmtpConfig(app: FastifyInstance) {
  return Boolean(
    app.config.smtpHost &&
      app.config.smtpPort &&
      app.config.smtpFromEmail &&
      app.config.smtpUser &&
      app.config.smtpPass
  );
}

function getTransporter(app: FastifyInstance) {
  if (!hasSmtpConfig(app)) {
    return null;
  }

  return nodemailer.createTransport({
    host: app.config.smtpHost,
    port: app.config.smtpPort,
    secure: app.config.smtpSecure,
    auth: {
      user: app.config.smtpUser,
      pass: app.config.smtpPass,
    },
  });
}

export async function sendIncidentFallbackEmail(
  app: FastifyInstance,
  input: {
    email: string;
    name: string;
    incidentTitle: string;
    severity: string;
    serviceName: string;
    incidentId: string;
    stepNumber: number;
  }
) {
  const transporter = getTransporter(app);

  if (!transporter || !app.config.smtpFromEmail) {
    app.log.warn(
      {
        incidentId: input.incidentId,
        recipientEmail: input.email,
      },
      "SMTP is not configured. Skipping fallback incident email."
    );
    return false;
  }

  const incidentUrl = `${app.config.webOrigins[0]}/incidents/${input.incidentId}`;

  await transporter.sendMail({
    from: `"${app.config.smtpFromName}" <${app.config.smtpFromEmail}>`,
    to: input.email,
    subject: `[OnCallr] ${input.severity} incident for ${input.serviceName}`,
    text: [
      `Hi ${input.name},`,
      "",
      `You have been notified about an incident in OnCallr.`,
      `Service: ${input.serviceName}`,
      `Severity: ${input.severity}`,
      `Incident: ${input.incidentTitle}`,
      `Escalation step: ${input.stepNumber}`,
      "",
      `Open incident: ${incidentUrl}`,
      "",
      "Acknowledge the incident in the dashboard if you are taking ownership.",
    ].join("\n"),
  });

  app.log.info(
    {
      incidentId: input.incidentId,
      recipientEmail: input.email,
      stepNumber: input.stepNumber,
    },
    "Fallback incident email sent."
  );

  return true;
}
