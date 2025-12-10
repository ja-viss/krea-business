import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm">
        <div className="mb-12 flex justify-center">
          <Logo />
        </div>
        <Card className="shadow-lg">
          {children}
        </Card>
      </div>
    </div>
  );
}

    