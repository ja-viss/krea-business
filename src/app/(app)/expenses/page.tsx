import { PageHeader } from "@/components/page-header";
import { MobileHeader } from "../layout";

export default function ExpensesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader title="Gastos" description="Registra y categoriza tus gastos." />
        {/* Expenses content goes here */}
      </main>
    </div>
  );
}
