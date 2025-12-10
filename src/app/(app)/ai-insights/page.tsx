import { PageHeader } from "@/components/page-header";

export default function AiInsightsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader title="AI Insights" description="Obtén análisis inteligentes para tu negocio." />
        {/* AI Insights content goes here */}
      </main>
    </div>
  );
}
