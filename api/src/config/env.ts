import { z } from "zod";

const webOriginsSchema = z
  .string()
  .transform((value) => value.split(",").map((origin) => origin.trim()))
  .pipe(z.array(z.string().url()).min(1));

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(5000),
  WEB_ORIGIN: webOriginsSchema,
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AUTH_COOKIE_NAME: z.string().default("oncallr_token"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().min(1).default("OnCallr"),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  webOrigins: string[];
  databaseUrl: string;
  redisUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  authCookieName: string;
  openaiApiKey?: string;
  openaiModel: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  smtpFromName: string;
  databaseSslRejectUnauthorized: boolean;
};

export function getEnvConfig(): AppConfig {
  const parsed = envSchema.parse(process.env);

  return {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    webOrigins: parsed.WEB_ORIGIN,
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    supabaseUrl: parsed.SUPABASE_URL,
    supabasePublishableKey: parsed.SUPABASE_PUBLISHABLE_KEY,
    jwtSecret: parsed.JWT_SECRET,
    jwtExpiresIn: parsed.JWT_EXPIRES_IN,
    authCookieName: parsed.AUTH_COOKIE_NAME,
    openaiApiKey: parsed.OPENAI_API_KEY,
    openaiModel: parsed.OPENAI_MODEL,
    smtpHost: parsed.SMTP_HOST,
    smtpPort: parsed.SMTP_PORT,
    smtpSecure: parsed.SMTP_SECURE,
    smtpUser: parsed.SMTP_USER,
    smtpPass: parsed.SMTP_PASS,
    smtpFromEmail: parsed.SMTP_FROM_EMAIL,
    smtpFromName: parsed.SMTP_FROM_NAME,
    databaseSslRejectUnauthorized: parsed.DATABASE_SSL_REJECT_UNAUTHORIZED,
  };
}
