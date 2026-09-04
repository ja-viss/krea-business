import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center scale-110">
          <Logo />
        </div>
        <Card className="shadow-2xl border-none">
          {children}
        </Card>
      </div>
    </div>
  );
}
