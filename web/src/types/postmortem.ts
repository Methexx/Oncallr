export interface PostmortemContent {
  summary: string;
  impact: string;
  rootCause: string;
  resolution: string;
  timelineHighlights: string[];
  followUpActions: string[];
}

export interface Postmortem {
  id: string;
  incidentId: string;
  aiDraft?: PostmortemContent | null;
  finalContent?: PostmortemContent | null;
  createdAt: string;
  updatedAt: string;
}
