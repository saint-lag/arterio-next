import { z } from 'zod';

export const profileSchema = z.object({
  first_name: z.string().min(2, 'Nome obrigatório'),
  last_name:  z.string().min(2, 'Apelido obrigatório'),
  email:      z.string().email('Email inválido'),
  password:   z.string().min(8, 'Mínimo 8 caracteres').optional().or(z.literal('')),
  password_confirm: z.string().optional().or(z.literal('')),
}).refine(
  (data) => !data.password || data.password === data.password_confirm,
  { message: 'As passwords não coincidem', path: ['password_confirm'] },
);

export type ProfileFormValues = z.infer<typeof profileSchema>;
