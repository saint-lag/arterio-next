// app/types/account.ts
// Tipos da secção "Minha Conta" — Customer, Orders, Addresses

export interface WCAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;   // billing apenas
  phone?: string;   // billing apenas
}

export interface WCCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  billing: WCAddress;
  shipping: WCAddress;
}

export interface WCOrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  total: string;
  image?: { src: string };
}

export interface WCOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  currency_symbol: string;
  line_items: WCOrderItem[];
  billing: WCAddress;
  shipping: WCAddress;
  payment_method_title: string;
  customer_note?: string;
  tracking_number?: string;
}

// Payload para PUT /api/account/profile
export type UpdateProfilePayload = Partial<{
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  billing: Partial<WCAddress>;
  shipping: Partial<WCAddress>;
}>;
