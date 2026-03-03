import { renderHook, act } from '@testing-library/react';
import { useCart } from '@/hooks/useCart';
import { cartService } from '@/app/services/cart';

// Mockamos o serviço inteiro
jest.mock('@/app/services/cart', () => ({
  cartService: {
    getCart: jest.fn(),
    addItem: jest.fn(),
  }
}));

describe('useCart Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve carregar o carrinho inicial e gerir o estado de loading', async () => {
    // Simulamos o servidor devolvendo 1 item
    (cartService.getCart as jest.Mock).mockResolvedValueOnce({
      items: [{
        key: 'item-key-1',
        id: 99,
        quantity: 2,
        prices: { price: 2000, currency_minor_unit: 2 }, // 20.00
        totals: { line_subtotal: 4000, line_total: 4000 } // 40.00
      }]
    });

    const { result } = renderHook(() => useCart());

    // Estado inicial antes da promise resolver
    expect(result.current.isLoading).toBe(true);
    expect(result.current.cart).toEqual([]);

    // Esperamos o useEffect terminar
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Verificamos o estado após o load
    expect(result.current.isLoading).toBe(false);
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].product_id).toBe(99);
    expect(result.current.itemCount).toBe(2); // Calculado via reduce
  });

  it('deve definir isUpdating para true durante a adição de um item', async () => {
    // Simulamos uma demora de rede
    (cartService.addItem as jest.Mock).mockImplementationOnce(() => {
      return new Promise(resolve => setTimeout(() => resolve({ items: [] }), 100));
    });

    const { result } = renderHook(() => useCart());

    await act(async () => {
      // Disparamos a ação, mas não damos await logo de cara para ver o "meio do caminho"
      const addPromise = result.current.addToCart({ id: '99', price: 20 } as any, 1);
      
      // O estado deve estar atualizando
      expect(result.current.isUpdating).toBe(true);
      
      await addPromise;
    });

    // Após resolver, volta para false
    expect(result.current.isUpdating).toBe(false);
  });
});