'use client';

import { useCustomer } from '@/hooks/useCustomer';
import { ProfileForm } from '@/components/account/ProfileForm';

export default function DetalhesPage() {
  const { customer, isLoading, updateProfile } = useCustomer();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-48 bg-black/5 rounded mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-12 bg-black/5 rounded" />
          <div className="h-12 bg-black/5 rounded" />
        </div>
        <div className="h-12 bg-black/5 rounded" />
        <div className="h-12 bg-black/5 rounded" />
        <div className="h-12 bg-black/5 rounded" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div>
      <h1 className="text-xl tracking-tight mb-8">Dados Pessoais</h1>
      <ProfileForm customer={customer} onSubmit={updateProfile} />
    </div>
  );
}
