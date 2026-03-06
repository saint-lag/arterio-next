import { z } from 'zod';

export const addressSchema = z.object({
  first_name: z.string().min(2, 'Nome obrigatório'),
  last_name:  z.string().min(2, 'Apelido obrigatório'),
  address_1:  z.string().min(5, 'Morada obrigatória'),
  address_2:  z.string().optional(),
  city:       z.string().min(2, 'Cidade obrigatória'),
  state:      z.string().min(2, 'Estado obrigatório'),
  postcode:   z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido (ex: 01310-100)'),
  country:    z.string().min(2, 'País obrigatório'),
  phone:      z.string().optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
