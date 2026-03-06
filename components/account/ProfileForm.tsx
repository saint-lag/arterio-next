'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileFormValues } from '@/utils/schemas/profileSchema';
import type { WCCustomer, UpdateProfilePayload } from '@/app/types/account';

interface ProfileFormProps {
  customer: WCCustomer;
  onSubmit: (payload: UpdateProfilePayload) => Promise<void>;
}

export function ProfileForm({ customer, onSubmit }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: customer.first_name,
      last_name:  customer.last_name,
      email:      customer.email,
      password:   '',
      password_confirm: '',
    },
  });

  const handleFormSubmit = async (values: ProfileFormValues) => {
    const payload: UpdateProfilePayload = {
      first_name: values.first_name,
      last_name:  values.last_name,
      email:      values.email,
    };
    // Só enviar password se o utilizador a preencheu
    if (values.password) {
      payload.password = values.password;
    }
    await onSubmit(payload);
    // Limpa os campos de password após sucesso
    reset({ ...values, password: '', password_confirm: '' });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <h2 className="text-sm uppercase tracking-widest mb-4">Dados Pessoais</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-black/50 mb-1">Nome</label>
          <input
            {...register('first_name')}
            className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
          />
          {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
        </div>
        <div>
          <label className="block text-xs text-black/50 mb-1">Apelido</label>
          <input
            {...register('last_name')}
            className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
          />
          {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs text-black/50 mb-1">Email</label>
        <input
          {...register('email')}
          type="email"
          className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div className="pt-6 border-t border-black/10">
        <h3 className="text-sm uppercase tracking-widest mb-4">Alterar Password</h3>
        <p className="text-xs text-black/40 mb-4">Deixe em branco se não quiser alterar.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-black/50 mb-1">Nova Password</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="new-password"
              className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-black/50 mb-1">Confirmar Password</label>
            <input
              {...register('password_confirm')}
              type="password"
              autoComplete="new-password"
              className="w-full border border-black/20 px-4 py-3 text-sm focus:outline-none focus:border-black"
            />
            {errors.password_confirm && <p className="text-xs text-red-500 mt-1">{errors.password_confirm.message}</p>}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="bg-black text-white text-sm px-8 py-3 hover:bg-black/80 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
      </button>
    </form>
  );
}
