"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  generatePostmortemDraft,
  getPostmortemDetails,
  savePostmortem,
} from "@/services/postmortems";
import { PostmortemContent } from "@/types/postmortem";

interface PostmortemDetailViewProps {
  incidentId: string;
}

const emptyContent: PostmortemContent = {
  summary: "",
  impact: "",
  rootCause: "",
  resolution: "",
  timelineHighlights: [""],
  followUpActions: [""],
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeContent(content?: PostmortemContent | null): PostmortemContent {
  if (!content) {
    return emptyContent;
  }

  return {
    summary: content.summary ?? "",
    impact: content.impact ?? "",
    rootCause: content.rootCause ?? "",
    resolution: content.resolution ?? "",
    timelineHighlights:
      content.timelineHighlights.length > 0 ? content.timelineHighlights : [""],
    followUpActions:
      content.followUpActions.length > 0 ? content.followUpActions : [""],
  };
}

interface PostmortemEditorProps {
  initialContent: PostmortemContent;
  isSaving: boolean;
  onSave: (content: PostmortemContent) => void;
}

function PostmortemEditor({
  initialContent,
  isSaving,
  onSave,
}: PostmortemEditorProps) {
  const [content, setContent] = useState<PostmortemContent>(initialContent);

  function updateArrayField(
    key: "timelineHighlights" | "followUpActions",
    index: number,
    value: string
  ) {
    setContent((current) => ({
      ...current,
      [key]: current[key].map((entry, entryIndex) =>
        entryIndex === index ? value : entry
      ),
    }));
  }

  function addArrayField(key: "timelineHighlights" | "followUpActions") {
    setContent((current) => ({
      ...current,
      [key]: [...current[key], ""],
    }));
  }

  function removeArrayField(
    key: "timelineHighlights" | "followUpActions",
    index: number
  ) {
    setContent((current) => ({
      ...current,
      [key]:
        current[key].length === 1
          ? [""]
          : current[key].filter((_, entryIndex) => entryIndex !== index),
    }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit postmortem</CardTitle>
        <CardDescription>
          Start from the generated draft, then tighten the narrative before saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                summary: event.target.value,
              }))
            }
            placeholder="What happened at a high level?"
            rows={4}
            value={content.summary}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="impact">Impact</Label>
          <Textarea
            id="impact"
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                impact: event.target.value,
              }))
            }
            placeholder="Who or what was affected?"
            rows={4}
            value={content.impact}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="root-cause">Root cause</Label>
          <Textarea
            id="root-cause"
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                rootCause: event.target.value,
              }))
            }
            placeholder="What actually caused the incident?"
            rows={4}
            value={content.rootCause}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resolution">Resolution</Label>
          <Textarea
            id="resolution"
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                resolution: event.target.value,
              }))
            }
            placeholder="What changed to restore service?"
            rows={4}
            value={content.resolution}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Timeline highlights</Label>
            <Button
              onClick={() => addArrayField("timelineHighlights")}
              size="sm"
              type="button"
              variant="outline"
            >
              Add highlight
            </Button>
          </div>
          <div className="space-y-3">
            {content.timelineHighlights.map((entry, index) => (
              <div key={`timeline-${index}`} className="flex gap-2">
                <Input
                  onChange={(event) =>
                    updateArrayField(
                      "timelineHighlights",
                      index,
                      event.target.value
                    )
                  }
                  placeholder="Key timeline event"
                  value={entry}
                />
                <Button
                  onClick={() => removeArrayField("timelineHighlights", index)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Follow-up actions</Label>
            <Button
              onClick={() => addArrayField("followUpActions")}
              size="sm"
              type="button"
              variant="outline"
            >
              Add action
            </Button>
          </div>
          <div className="space-y-3">
            {content.followUpActions.map((entry, index) => (
              <div key={`action-${index}`} className="flex gap-2">
                <Input
                  onChange={(event) =>
                    updateArrayField(
                      "followUpActions",
                      index,
                      event.target.value
                    )
                  }
                  placeholder="Action item"
                  value={entry}
                />
                <Button
                  onClick={() => removeArrayField("followUpActions", index)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          disabled={
            isSaving ||
            content.summary.trim().length === 0 ||
            content.impact.trim().length === 0 ||
            content.rootCause.trim().length === 0 ||
            content.resolution.trim().length === 0
          }
          onClick={() =>
            onSave({
              ...content,
              timelineHighlights: content.timelineHighlights
                .map((entry) => entry.trim())
                .filter(Boolean),
              followUpActions: content.followUpActions
                .map((entry) => entry.trim())
                .filter(Boolean),
            })
          }
          type="button"
        >
          {isSaving ? "Saving..." : "Save postmortem"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function PostmortemDetailView({
  incidentId,
}: PostmortemDetailViewProps) {
  const auth = useAuth();
  const queryClient = useQueryClient();

  const postmortemQuery = useQuery({
    queryKey: ["postmortems", "detail", incidentId],
    queryFn: () => getPostmortemDetails(incidentId),
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const incident = postmortemQuery.data?.incident;
  const postmortem = postmortemQuery.data?.postmortem;
  const preferredContent = useMemo(
    () =>
      normalizeContent(
        (postmortem?.finalContent ?? postmortem?.aiDraft) as PostmortemContent | null
      ),
    [postmortem?.aiDraft, postmortem?.finalContent]
  );

  async function refreshData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["postmortems"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["postmortems", "detail", incidentId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["incidents", "detail", incidentId],
      }),
    ]);
  }

  const generateDraftMutation = useMutation({
    mutationFn: () => generatePostmortemDraft(incidentId),
    onSuccess: async () => {
      toast.success("Draft generated from the incident timeline.");
      await refreshData();
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to generate draft."
          : "Unable to generate draft.";

      toast.error(message);
    },
  });

  const savePostmortemMutation = useMutation({
    mutationFn: (nextContent: PostmortemContent) =>
      savePostmortem(incidentId, nextContent),
    onSuccess: async () => {
      toast.success("Postmortem saved.");
      await refreshData();
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to save postmortem."
          : "Unable to save postmortem.";

      toast.error(message);
    },
  });

  if (postmortemQuery.isLoading || auth.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!incident) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Postmortem unavailable</CardTitle>
          <CardDescription>
            We could not load this incident postmortem right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            className="text-sm font-medium underline underline-offset-4"
            href="/postmortems"
          >
            Back to postmortems
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          className="text-sm font-medium text-muted-foreground underline underline-offset-4"
          href="/postmortems"
        >
          Back to postmortems
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Incident postmortem
        </h1>
        <p className="text-sm text-muted-foreground">
          Turn the resolved incident timeline into a reviewable operational record.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle>{incident.title}</CardTitle>
            <CardDescription>
              {incident.service?.name ?? "Unknown service"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{incident.severity}</Badge>
              <Badge variant="outline">{incident.status}</Badge>
              <Badge variant={postmortem?.finalContent ? "secondary" : "outline"}>
                {postmortem?.finalContent ? "Saved" : "Drafting"}
              </Badge>
            </div>

            <div className="grid gap-3">
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(incident.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Resolved</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(incident.resolvedAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Resolver</p>
                <p className="text-sm text-muted-foreground">
                  {incident.resolvedBy?.name ?? "Unknown"}
                </p>
              </div>
            </div>

            {incident.description ? (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Incident description</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {incident.description}
                  </p>
                </div>
              </>
            ) : null}

            <Button
              className="w-full"
              disabled={generateDraftMutation.isPending}
              onClick={() => generateDraftMutation.mutate()}
              type="button"
              variant="outline"
            >
              {generateDraftMutation.isPending
                ? "Generating..."
                : postmortem?.aiDraft
                  ? "Regenerate draft"
                  : "Generate draft"}
            </Button>
          </CardContent>
        </Card>

        <PostmortemEditor
          initialContent={preferredContent}
          isSaving={savePostmortemMutation.isPending}
          key={`${incidentId}:${postmortem?.updatedAt ?? "empty"}`}
          onSave={(nextContent) => savePostmortemMutation.mutate(nextContent)}
        />
      </div>
    </section>
  );
}
