import { ServiceDetailView } from "@/features/services/service-detail-view";

interface ServiceDetailsPageProps {
  params: Promise<{
    serviceId: string;
  }>;
}

export default async function ServiceDetailsPage({
  params,
}: ServiceDetailsPageProps) {
  const { serviceId } = await params;

  return <ServiceDetailView serviceId={serviceId} />;
}
