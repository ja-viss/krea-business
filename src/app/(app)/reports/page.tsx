import { PageHeader } from "@/components/page-header";
import { MobileHeader } from "../layout";

export default function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader title="Reportes" description="Visualiza el rendimiento de tu negocio." />
        {/* Reports content goes here */}
      </main>
    </div>
  );
}
