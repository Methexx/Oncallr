import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { FastifyInstance } from "fastify";

const MAGIC_LINK_PASSWORD_PREFIX = "__supabase_magic_link__";

function createSupabaseClient(app: FastifyInstance) {
  return createClient(
    app.config.supabaseUrl,
    app.config.supabasePublishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function getDisplayName(email: string, metadata: Record<string, unknown>) {
  const metadataName = metadata.name;

  if (typeof metadataName === "string" && metadataName.trim().length > 0) {
    return metadataName.trim();
  }

  return email.split("@")[0] ?? "OnCallr User";
}

export async function exchangeSupabaseAccessToken(
  app: FastifyInstance,
  accessToken: string
) {
  const supabase = createSupabaseClient(app);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user?.email) {
    app.log.warn({ err: error }, "Supabase access token verification failed.");
    return null;
  }

  const metadata =
    data.user.user_metadata && typeof data.user.user_metadata === "object"
      ? (data.user.user_metadata as Record<string, unknown>)
      : {};

  const email = data.user.email.toLowerCase();

  let user = await app.prisma.user.findFirst({
    where: {
      OR: [
        {
          supabaseUserId: data.user.id,
        },
        {
          email,
        },
      ],
    },
  });

  if (!user) {
    const intendedFlow = metadata.intended;

    if (intendedFlow !== "register") {
      return null;
    }

    user = await app.prisma.user.create({
      data: {
        supabaseUserId: data.user.id,
        name: getDisplayName(email, metadata),
        email,
        passwordHash: await hash(
          `${MAGIC_LINK_PASSWORD_PREFIX}:${data.user.id}`,
          10
        ),
        role: UserRole.ENGINEER,
      },
    });
  } else if (user.supabaseUserId !== data.user.id) {
    user = await app.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        supabaseUserId: data.user.id,
      },
    });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
