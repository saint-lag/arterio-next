'use client';

import { useCustomer } from '@/hooks/useCustomer';
import { AddressForm } from '@/components/account/AddressForm';
import { AddressSkeleton } from '@/components/account/AddressSkeleton';

export default function EnderecosPage() {
  const { customer, isLoading, updateProfile } = useCustomer();

  if (isLoading) return <AddressSkeleton />;

  return (
    <div>
      <h1 className="text-xl tracking-tight mb-8">Endereços</h1>
      <div className="space-y-12">
        <AddressForm
          title="Endereço de Faturação"
          defaultValues={customer?.billing ?? {}}
          onSubmit={(values) => updateProfile({ billing: values })}
        />
        <AddressForm
          title="Endereço de Entrega"
          defaultValues={customer?.shipping ?? {}}
          onSubmit={(values) => updateProfile({ shipping: values })}
        />
      </div>
    </div>
  );
}
