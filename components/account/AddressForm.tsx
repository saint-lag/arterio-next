'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, type AddressFormValues } from '@/utils/schemas/addressSchema';
import type { WCAddress } from '@/app/types/account';

interface AddressFormProps {
  title: string;
  defaultValues: Partial<WCAddress>;
  onSubmit: (values: AddressFormValues) => Promise<void>;
}

export function AddressForm({ title, defaultValues, onSubmit }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      first_name: defaultValues.first_name ?? '',
      last_name:  defaultValues.last_name ?? '',
      address_1:  defaultValues.address_1 ?? '',
      address_2:  defaultValues.address_2 ?? '',
      city:       defaultValues.city ?? '',
      state:      defaultValues.state ?? '',
      postcode:   defaultValues.postcode ?? '',
      country:    defaultValues.country ?? 'BR',
      phone:      defaultValues.phone ?? '',
    },
  });

  // Autocomplete de CEP via ViaCEP (Brasil)
  const handlePostcodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setValue('address_1', data.logradouro);
        setValue('city',      data.localidade);
        setValue('state',     data.uf);
      }
    } catch { /* silencioso — campo continua editável */ }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="text-sm uppercase tracking-widest mb-4">{title}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <input
            {...register('first_name')}
            placeholder="Nome"
            className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
          />
          {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
        </div>
        <div>
          <input
            {...register('last_name')}
            placeholder="Apelido"
            className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
          />
          {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
        </div>
      </div>

      <div>
        <input
          {...register('postcode')}
          placeholder="CEP (ex: 01310-100)"
          onBlur={handlePostcodeBlur}
          className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
        />
        {errors.postcode && <p className="text-xs text-red-500 mt-1">{errors.postcode.message}</p>}
      </div>

      <div>
        <input
          {...register('address_1')}
          placeholder="Rua / Avenida"
          className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
        />
        {errors.address_1 && <p className="text-xs text-red-500 mt-1">{errors.address_1.message}</p>}
      </div>

      <div>
        <input
          {...register('address_2')}
          placeholder="Complemento (opcional)"
          className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <input
            {...register('city')}
            placeholder="Cidade"
            className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
          />
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
        </div>
        <div>
          <input
            {...register('state')}
            placeholder="Estado (ex: SP)"
            className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
          />
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
        </div>
      </div>

      <div>
        <input
          {...register('phone')}
          placeholder="Telefone (opcional)"
          className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-black text-white text-sm px-8 py-3 hover:bg-black/80 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'A guardar...' : 'Guardar Endereço'}
      </button>
    </form>
  );
}
