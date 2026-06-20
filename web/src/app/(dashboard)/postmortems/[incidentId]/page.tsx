import { PostmortemDetailView } from "@/features/postmortems/postmortem-detail-view";

interface PostmortemDetailPageProps {
  params: Promise<{
    incidentId: string;
  }>;
}

export default async function PostmortemDetailPage({
  params,
}: PostmortemDetailPageProps) {
  const { incidentId } = await params;

  return <PostmortemDetailView incidentId={incidentId} />;
}
