"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { GravityWell } from "@/components/shared/gravity-well";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requestLoginMagicLink, requestRegisterMagicLink } from "@/lib/auth";

const magicLinkSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
});

type MagicLinkFormData = z.infer<typeof magicLinkSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export function LoginForm() {
  const reduceMotion = useReducedMotion();
  const loginForm = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onLoginSubmit(data: MagicLinkFormData) {
    try {
      await requestLoginMagicLink(data);
      toast.success("Magic link sent. Check your inbox to finish signing in.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send the magic link.";

      toast.error(message);
    }
  }

  async function onRegisterSubmit(data: RegisterFormData) {
    try {
      await requestRegisterMagicLink(data);
      toast.success("Registration link sent. Check your inbox to activate your account.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start registration.";

      toast.error(message);
    }
  }

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
    <Card className="app-shell orbital-panel border-primary/10">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <GravityWell intensity="pulse" size={16} tone="brand" />
          <div className="inline-flex w-fit rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Secure access
          </div>
        </div>
        <CardTitle className="text-3xl tracking-tight">Access OnCallr</CardTitle>
        <CardDescription>
          Use a Supabase magic link to enter the incident console or create an engineer account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="login" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form
              className="space-y-4"
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
            >
              <div className="space-y-2">
                <Label htmlFor="login-email">Email address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="engineer@oncallr.dev"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">
                Seeded admin and engineer accounts can sign in with their existing email address.
              </p>

              <Button
                className="w-full"
                disabled={loginForm.formState.isSubmitting}
                type="submit"
              >
                {loginForm.formState.isSubmitting
                  ? "Sending link..."
                  : "Email me a sign-in link"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form
              className="space-y-4"
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
            >
              <div className="space-y-2">
                <Label htmlFor="register-name">Full name</Label>
                <Input
                  id="register-name"
                  placeholder="On-Call Engineer"
                  {...registerForm.register("name")}
                />
                {registerForm.formState.errors.name ? (
                  <p className="text-sm text-destructive">
                    {registerForm.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Work email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="engineer@example.com"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {registerForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">
                Registration creates an engineer account. Admin accounts stay seeded from the backend.
              </p>

              <Button
                className="w-full"
                disabled={registerForm.formState.isSubmitting}
                type="submit"
              >
                {registerForm.formState.isSubmitting
                  ? "Sending link..."
                  : "Create account with magic link"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="rounded-[24px] border border-primary/12 bg-muted/35 p-4 text-sm text-muted-foreground">
          Magic links come from Supabase Auth. Add
          {" "}
          <span className="font-medium">http://localhost:3000/auth/callback</span>
          {" "}
          to your Supabase redirect URLs before testing.
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}
