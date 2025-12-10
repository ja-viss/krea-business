import { PageHeader } from "@/components/page-header";
import { MobileHeader } from "../layout";

export default function InventoryPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader title="Inventario" description="Gestiona tus productos y stock." />
        {/* Inventory content goes here */}
      </main>
    </div>
  );
}
