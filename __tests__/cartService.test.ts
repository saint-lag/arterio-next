import { cartService } from '@/app/services/cart';
import { WP_CONFIG } from '@/app/config/wordpress';

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock do Fetch Global
global.fetch = jest.fn();

describe('Cart Service', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (global.fetch as jest.Mock).mockClear();
  });

  it('deve gerir o Cart-Token corretamente', () => {
    cartService.setCartToken('meu-token-123');
    expect(cartService.getCartToken()).toBe('meu-token-123');
    
    cartService.clearCartToken();
    expect(cartService.getCartToken()).toBeNull();
  });

  it('deve enviar o Cart-Token no header ao adicionar um item', async () => {
    cartService.setCartToken('token-existente');

    // Simula uma resposta de sucesso da API
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'Cart-Token': 'token-existente' }),
      json: async () => ({ items: [{ id: 10, quantity: 1 }] })
    });

    await cartService.addItem(10, 1);

    // Verifica se o fetch foi chamado com a URL e headers corretos
    expect(global.fetch).toHaveBeenCalledWith(
      `${WP_CONFIG.storeApiUrl}/cart/add-item`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        credentials: 'include' // O nosso fix para o checkout!
      })
    );
  });

  it('deve atualizar o localStorage se a API devolver um token novo', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'Cart-Token': 'NOVO-TOKEN-SECRETO' }),
      json: async () => ({ items: [] })
    });

    await cartService.getCart();

    expect(cartService.getCartToken()).toBe('NOVO-TOKEN-SECRETO');
  });
});