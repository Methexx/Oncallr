ALTER TABLE "User"
ADD COLUMN "supabaseUserId" UUID;

CREATE UNIQUE INDEX "User_supabaseUserId_key"
ON "User"("supabaseUserId");
