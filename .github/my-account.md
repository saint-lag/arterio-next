# Secção "Minha Conta" — Documentação da Implementação

> **Estado:** ✅ Implementado  
> **Data:** 6 de março de 2026

## Índice
1. [Resumo e Decisões de Desenho](#1-resumo-e-decisões-de-desenho)
2. [Estrutura de Ficheiros](#2-estrutura-de-ficheiros)
3. [Dependências Adicionadas](#3-dependências-adicionadas)
4. [Proxies Next.js (`app/api/account/`)](#4-proxies-nextjs)
5. [Hooks SWR](#5-hooks-swr)
6. [Tipos](#6-tipos)
7. [Layout e Roteamento](#7-layout-e-roteamento)
8. [Páginas](#8-páginas)
9. [Componentes](#9-componentes)
10. [Validação de Formulários](#10-validação-de-formulários)
11. [Alterações a Ficheiros Existentes](#11-alterações-a-ficheiros-existentes)
12. [Regras Críticas](#12-regras-críticas)

---

## 1. Resumo e Decisões de Desenho

### O que foi implementado
Secção completa de "Minha Conta" com 4 sub-páginas:
- **Dashboard** (`/conta`) — boas-vindas + pedidos recentes
- **Pedidos** (`/conta/pedidos`) — lista paginada + detalhe individual (`/conta/pedidos/[id]`)
- **Endereços** (`/conta/enderecos`) — formulários de faturação + entrega com autocomplete CEP
- **Dados Pessoais** (`/conta/detalhes`) — editar nome, email, password

### Decisões de desenho importantes

| Decisão | Justificação |
|---|---|
| **Proxies usam `WC_AUTH` (Basic Auth)** para `wc/v3/*` | O JWT do plugin `jwt-auth` não tem permissão para endpoints WC REST API v3. O JWT só é usado para identificar o utilizador via `/wp/v2/users/me`. Este é o mesmo padrão do register route existente. |
| **SWR keys condicionais** (`isAuthenticated ? key : null`) | Evita 401 desnecessários quando o utilizador não está autenticado. SWR não faz fetch quando a key é `null`. |
| **Tipos em `app/types/account.ts`** (ficheiro separado) | Domínio diferente do carrinho/produtos. Mantém separação clara. Não polui `app/types/woocommerce.ts`. |
| **Layout inclui shell completo** (Header, Footer, Cart, Toast) | Segue o padrão existente onde cada página renderiza o shell completo. O layout da `/conta` encapsula tudo para evitar duplicação nas sub-páginas. |
| **`react-hook-form` + `zod`** para formulários | O LoginModal existente usa `useState` manual, mas formulários de endereço/perfil são complexos o suficiente para justificar validação estruturada. Não alteramos o LoginModal. |
| **`formatCurrency` / `formatDate`** adicionados a `utils/formatters.ts` | Não existiam no projecto. Adicionados ao ficheiro existente em vez de criar um novo. |

### Autenticação existente (não alterada)
- `POST /api/auth/login` → JWT → cookie `HttpOnly` `wp_auth_token`
- `GET /api/auth/me` → verifica cookie → devolve `{ user }` ou `{ user: null }`
- `AuthProvider` expõe `{ user, isAuthenticated, isLoading, login, logout, register }`
- `user.id` é o `customer_id` do WooCommerce

---

## 2. Estrutura de Ficheiros

```
app/
├── conta/
│   ├── layout.tsx                  # Layout com shell + sidebar + proteção de rota
│   ├── page.tsx                    # Dashboard / boas-vindas
│   ├── pedidos/
│   │   ├── page.tsx                # Lista de pedidos (paginada)
│   │   └── [id]/
│   │       └── page.tsx            # Detalhe de um pedido
│   ├── enderecos/
│   │   └── page.tsx                # Formulários de billing + shipping
│   └── detalhes/
│       └── page.tsx                # Editar nome, email, password
│
├── api/
│   └── account/
│       ├── profile/
│       │   └── route.ts            # GET + PUT (Basic Auth → wc/v3/customers)
│       └── orders/
│           ├── route.ts            # GET lista (Basic Auth → wc/v3/orders)
│           └── [id]/
│               └── route.ts        # GET detalhe (Basic Auth + verificação IDOR)
│
├── types/
│   └── account.ts                  # WCCustomer, WCOrder, WCAddress, etc.

hooks/
├── useCustomer.ts                  # SWR: perfil + endereços + mutações
└── useOrders.ts                    # SWR: lista de pedidos + pedido individual

components/
└── account/
    ├── AccountSidebar.tsx           # Navegação lateral da conta
    ├── AddressForm.tsx              # Formulário de endereço (react-hook-form + zod)
    ├── AddressSkeleton.tsx          # Loading state para endereços
    ├── OrderCard.tsx                # Card resumo de pedido
    ├── OrderSkeleton.tsx            # Loading state para pedidos
    └── ProfileForm.tsx              # Formulário de dados pessoais + password

utils/
├── formatters.ts                   # + formatCurrency(), formatDate() (adicionados)
└── schemas/
    ├── addressSchema.ts            # Zod schema para endereço
    └── profileSchema.ts            # Zod schema para perfil + password
```

---

## 3. Dependências Adicionadas

```bash
npm install react-hook-form zod @hookform/resolvers
```

---

## 4. Proxies Next.js

Todos os proxies seguem o mesmo padrão:
1. Leem o cookie `wp_auth_token` (HttpOnly)
2. Usam o JWT **apenas** para obter o `user_id` via `GET /wp/v2/users/me`
3. Usam **`WC_AUTH` (Basic Auth com Consumer Key/Secret)** para chamar `wc/v3/*`
4. O cliente nunca vê o JWT nem as credenciais WC

### `app/api/account/profile/route.ts`

| Método | Rota WC | Auth |
|---|---|---|
| GET | `wc/v3/customers/{user_id}` | `WC_AUTH` Basic |
| PUT | `wc/v3/customers/{user_id}` | `WC_AUTH` Basic |

Helper `getUserId(token)` centraliza a chamada a `/wp/v2/users/me` e devolve `number | null`.

### `app/api/account/orders/route.ts`

| Método | Rota WC | Auth |
|---|---|---|
| GET | `wc/v3/orders?customer={user_id}&page=X&per_page=10` | `WC_AUTH` Basic |

Repassa o header `X-WP-TotalPages` para o cliente (paginação).

### `app/api/account/orders/[id]/route.ts`

| Método | Rota WC | Auth |
|---|---|---|
| GET | `wc/v3/orders/{id}` | `WC_AUTH` Basic |

**Protecção IDOR:** verifica que `data.customer_id === me.id` antes de devolver. Retorna 403 se não corresponder.

---

## 5. Hooks SWR

Ambos os hooks seguem o padrão de `useCart.ts`: `mutate(data, { revalidate: false })` após sucesso, `mutate()` forçado + toast em caso de erro.

### `hooks/useCustomer.ts`

```typescript
// SWR key condicional — só faz fetch se autenticado
const key = isAuthenticated ? 'account/profile' : null;

// Retorna:
{ customer: WCCustomer | undefined, isLoading: boolean, updateProfile: (payload) => Promise<void> }
```

- `updateProfile()` faz PUT, injeta resposta no cache SWR, mostra toast de sucesso
- Em erro: re-fetch forçado + toast de erro + re-throw (para o formulário reagir)

### `hooks/useOrders.ts`

```typescript
// useOrders(page) — lista paginada
{ orders: WCOrder[], isLoading: boolean, error }

// useOrder(id) — pedido individual (key = null se id é null)
{ order: WCOrder | undefined, isLoading: boolean, error }
```

- Ambos condicionais em `isAuthenticated`

---

## 6. Tipos

Ficheiro: `app/types/account.ts`

| Tipo | Campos chave |
|---|---|
| `WCAddress` | `first_name`, `last_name`, `address_1`, `city`, `state`, `postcode`, `country`, `email?`, `phone?` |
| `WCCustomer` | `id`, `email`, `first_name`, `last_name`, `username`, `billing: WCAddress`, `shipping: WCAddress` |
| `WCOrderItem` | `id`, `name`, `quantity`, `price`, `total`, `image?` |
| `WCOrder` | `id`, `number`, `status`, `date_created`, `total`, `currency_symbol`, `line_items`, `billing`, `shipping`, `payment_method_title` |
| `UpdateProfilePayload` | `Partial<{ first_name, last_name, email, password, billing, shipping }>` |

---

## 7. Layout e Roteamento

### `app/conta/layout.tsx`

- `'use client'` — usa `useAuth()` e `useCart()` hooks
- **Proteção de rota:** `useEffect` verifica `isAuthenticated` e redireciona para `/` se não autenticado
- **Shell completo:** inclui `Header`, `Footer`, `Cart` (sidebar), `WhatsAppButton`, `ToastContainer`
- **Sidebar:** `AccountSidebar` com links para as 4 sub-páginas
- Layout responsivo: `flex-col` em mobile, `flex-row` com `gap-12` em desktop

**Nota:** O redirect acontece no `useEffect` (não no render síncrono) para evitar erros de hidratação.

---

## 8. Páginas

### `/conta` — Dashboard
- Saudação com primeiro nome do utilizador
- Grid com contadores (pedidos, endereços)
- Últimos 3 pedidos recentes usando `OrderCard`

### `/conta/pedidos` — Lista de Pedidos
- `useState(page)` para paginação
- Componente `Pagination` existente reutilizado
- Estado vazio com link para a loja
- Loading state com `OrderSkeleton`

### `/conta/pedidos/[id]` — Detalhe do Pedido
- `useParams()` para obter o ID
- Lista de itens com imagem, nome, quantidade, preço
- Resumo: método de pagamento, nota, total
- Endereços de faturação e entrega
- Botão "Voltar aos Pedidos"

### `/conta/enderecos` — Endereços
- Dois `AddressForm` independentes (billing + shipping)
- Cada um chama `updateProfile({ billing: values })` ou `updateProfile({ shipping: values })`

### `/conta/detalhes` — Dados Pessoais
- `ProfileForm` com nome, apelido, email
- Secção separada para alterar password (opcional — campos vazios = não alterar)
- Botão desativado se o formulário não foi modificado (`isDirty`)

---

## 9. Componentes

### `AccountSidebar`
- 4 links: Resumo, Pedidos, Endereços, Dados Pessoais
- Estado ativo via `usePathname()` com `border-l-2 border-black`
- Botão "Terminar Sessão" que chama `logout()` e redireciona para `/`

### `OrderCard`
- Link para `/conta/pedidos/{id}`
- Mostra número, data, total, status traduzido
- Status labels em PT-BR: `pending` → "Aguardando Pagamento", `processing` → "Em Processamento", etc.

### `AddressForm`
- `react-hook-form` + `zodResolver(addressSchema)`
- Autocomplete CEP via ViaCEP API (no `onBlur` do campo CEP)
- Campos: nome, apelido, CEP, morada, complemento, cidade, estado, telefone
- Default `country: 'BR'` quando não preenchido

### `ProfileForm`
- `react-hook-form` + `zodResolver(profileSchema)`
- Validação: passwords devem coincidir (`refine`)
- Limpa campos de password após submit com sucesso
- Só envia `password` no payload se preenchida

### Skeletons
- `OrderSkeleton({ count })` — cards com `animate-pulse`
- `AddressSkeleton` — 2 formulários com placeholders animados

---

## 10. Validação de Formulários

### `utils/schemas/addressSchema.ts`
```typescript
z.object({
  first_name: z.string().min(2),
  last_name:  z.string().min(2),
  address_1:  z.string().min(5),
  address_2:  z.string().optional(),
  city:       z.string().min(2),
  state:      z.string().min(2),
  postcode:   z.string().regex(/^\d{5}-?\d{3}$/),  // CEP brasileiro
  country:    z.string().min(2),
  phone:      z.string().optional(),
})
```

### `utils/schemas/profileSchema.ts`
```typescript
z.object({
  first_name: z.string().min(2),
  last_name:  z.string().min(2),
  email:      z.string().email(),
  password:   z.string().min(8).optional().or(z.literal('')),
  password_confirm: z.string().optional().or(z.literal('')),
}).refine(/* passwords devem coincidir */)
```

---

## 11. Alterações a Ficheiros Existentes

### `utils/formatters.ts`
- **Adicionado:** `formatCurrency(value: number): string` — formata como `R$ 129,90`
- **Adicionado:** `formatDate(isoDate: string): string` — formata como `01 de dezembro de 2025`

### `components/Header.tsx`
- **Adicionado:** import de `Link` do Next.js
- **Desktop:** link "MINHA CONTA" visível quando `user` está autenticado, ao lado do nome
- **Mobile:** link "MINHA CONTA" com ícone `User` no menu mobile, acima do botão "SAIR"

---

## 12. Regras Críticas

| Regra | Razão |
|---|---|
| Nunca expor `wp_auth_token` ao cliente | É `HttpOnly` por design — os proxies lêem-no server-side via `request.cookies` |
| Nunca chamar `wp-json/wc/v3/*` directamente do browser | Os endpoints REST do WC exigem Consumer Key/Secret — ambos não devem estar no cliente |
| Usar `WC_AUTH` (Basic Auth) para `wc/v3/*`, não JWT | O JWT do plugin não tem permissão para WC REST API v3. JWT só serve para identificar o utilizador via `/wp/v2/users/me` |
| Usar `mutate(data, { revalidate: false })` após sucesso | Mesmo padrão do `useCart` — a resposta da API já é a fonte de verdade |
| Usar `mutate()` (sem args) após erro | Força re-fetch para recuperar estado real do servidor |
| `re-throw` de erros no `updateProfile` | Permite que formulários saibam que o submit falhou e mantenham o estado |
| Validar `data.customer_id === me.id` no proxy de orders/[id] | Evita IDOR — um utilizador autenticado não pode ver pedidos de outro |
| SWR keys condicionais em `isAuthenticated` | Evita 401 desnecessários para utilizadores não autenticados |
| Proteger rotas no `layout.tsx` com `useEffect` + `router.replace` | A verificação de auth é assíncrona — nunca redirecionar no render síncrono |
| Todos os componentes com `'use client'` | Hooks de estado não funcionam em Server Components |
| Layout inclui Header/Footer/Cart/Toast | Segue o padrão existente do projecto — cada "raiz de página" renderiza o shell completo |
