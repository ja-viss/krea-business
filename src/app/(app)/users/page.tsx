import { PageHeader } from "@/components/page-header";
import { MobileHeader } from "../layout";

export default function UsersPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader title="Usuarios" description="Gestiona los usuarios y roles del sistema." />
        {/* Users content goes here */}
      </main>
    </div>
  );
}
