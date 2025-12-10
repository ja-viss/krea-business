import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader title="Configuración" description="Gestiona la configuración de tu cuenta y negocio." />
        {/* Settings content goes here */}
      </main>
    </div>
  );
}
