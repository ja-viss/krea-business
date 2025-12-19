
'use client';

import { PageHeader } from "@/components/page-header";

export default function EditSalePage() {
    // TODO: Implement sale editing logic
    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Editar Venta" 
                    description="Esta funcionalidad estará disponible próximamente." 
                />
                 <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
                    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                        <h3 className="mt-4 text-lg font-semibold">En Construcción</h3>
                        <p className="mb-4 mt-2 text-sm text-muted-foreground">
                            Estamos trabajando para permitirte editar ventas existentes. ¡Vuelve pronto!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
