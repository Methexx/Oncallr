interface ServiceDetailsPageProps {
  params: Promise<{
    serviceId: string;
  }>;
}

export default async function ServiceDetailsPage({
  params,
}: ServiceDetailsPageProps) {
  const { serviceId } = await params;

  return (
    <section className="text-sm text-muted-foreground">
      Service details page for {serviceId}
    </section>
  );
}
