'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Tag, X, Check, Loader2, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/hooks/useCart';
import {
  checkoutApi,
  type CheckoutAddress,
  type CheckoutState,
  type ShippingPackage,
  type PaymentMethod,
} from '@/app/services/checkout';
import { decodeHTMLEntities } from '@/utils/formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCurrency(raw: string | number | undefined, minor: number = 2): number {
  if (raw === undefined || raw === null) return 0;
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  return isNaN(n) ? 0 : n / Math.pow(10, minor);
}

function fmt(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

const EMPTY_ADDRESS: CheckoutAddress = {
  first_name: '', last_name: '', company:   '',
  address_1:  '', address_2: '', city:      '',
  state:      '', postcode:  '', country:   'BR',
  email:      '', phone:     '',
};

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', required = false,
  className = '', placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; className?: string; placeholder?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-[10px] tracking-[0.12em] text-black/50">
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-black/20 px-3 py-2.5 text-sm text-black placeholder:text-black/30 focus:border-black focus:outline-none transition-colors"
      />
    </div>
  );
}

// ─── Address form ─────────────────────────────────────────────────────────────

function AddressForm({
  address, onChange, showEmail = false,
}: {
  address: CheckoutAddress;
  onChange: (field: keyof CheckoutAddress, value: string) => void;
  showEmail?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nome"      value={address.first_name} onChange={v => onChange('first_name', v)} required />
      <Field label="Sobrenome" value={address.last_name}  onChange={v => onChange('last_name', v)}  required />
      <Field label="Empresa (opcional)" value={address.company ?? ''} onChange={v => onChange('company', v)} className="sm:col-span-2" />
      <Field label="Endereço" value={address.address_1}   onChange={v => onChange('address_1', v)} required className="sm:col-span-2" />
      <Field label="Complemento" value={address.address_2 ?? ''} onChange={v => onChange('address_2', v)} className="sm:col-span-2" />
      <Field label="Cidade" value={address.city}     onChange={v => onChange('city', v)}     required />
      <Field label="Estado" value={address.state}    onChange={v => onChange('state', v)}    required placeholder="SP" />
      <Field label="CEP"    value={address.postcode} onChange={v => onChange('postcode', v)} required placeholder="00000-000" />
      <div className="space-y-1">
        <label className="text-[10px] tracking-[0.12em] text-black/50">País *</label>
        <select
          value={address.country}
          onChange={e => onChange('country', e.target.value)}
          className="w-full border border-black/20 px-3 py-2.5 text-sm text-black focus:border-black focus:outline-none bg-white"
        >
          <option value="BR">Brasil</option>
          <option value="PT">Portugal</option>
          <option value="US">Estados Unidos</option>
        </select>
      </div>
      {showEmail && (
        <>
          <Field label="Email"    value={address.email ?? ''} onChange={v => onChange('email', v)} type="email" required className="sm:col-span-2" />
          <Field label="Telefone" value={address.phone ?? ''} onChange={v => onChange('phone', v)} type="tel" />
        </>
      )}
    </div>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-black text-xs tracking-wide">
        {step}
      </span>
      <h2 className="text-sm tracking-[0.15em] text-black">{title}</h2>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, total, itemCount, isLoading: cartLoading } = useCart();

  const [checkoutData,     setCheckoutData]     = useState<CheckoutState | null>(null);
  const [shippingPackages, setShippingPackages] = useState<ShippingPackage[]>([]);
  const [paymentMethods,   setPaymentMethods]   = useState<PaymentMethod[]>([]);
  const [isInitializing,   setIsInitializing]   = useState(true);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [orderResult,      setOrderResult]      = useState<CheckoutState | null>(null);
  const [globalError,      setGlobalError]      = useState<string | null>(null);

  const [billing,      setBilling]      = useState<CheckoutAddress>(EMPTY_ADDRESS);
  const [shipping,     setShipping]     = useState<CheckoutAddress>(EMPTY_ADDRESS);
  const [sameAddress,  setSameAddress]  = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [showNote,     setShowNote]     = useState(false);

  const [couponCode,     setCouponCode]     = useState('');
  const [couponError,    setCouponError]    = useState<string | null>(null);
  const [couponLoading,  setCouponLoading]  = useState(false);
  const [appliedCoupons, setAppliedCoupons] = useState<string[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);

  // ── Inicializar checkout ───────────────────────────────────────────────────

  const initCheckout = useCallback(async () => {
    try {
      setIsInitializing(true);
      setGlobalError(null);

      // GET /api/checkout → WooCommerce devolve estado + nonce no header
      const data = await checkoutApi.getCheckout();
      setCheckoutData(data);

      if (data.billing_address?.email)     setBilling(data.billing_address);
      if (data.shipping_address?.address_1) setShipping(data.shipping_address);

      if (data.payment_methods?.length) {
        setPaymentMethods(data.payment_methods);
        setPaymentMethod(data.payment_methods[0].id);
      }

      if (data.coupons?.length) {
        setAppliedCoupons(data.coupons.map(c => c.code));
      }

      if (data.shipping_rates?.length) {
        setShippingPackages(data.shipping_rates);
      } else {
        try {
          const rates = await checkoutApi.getShippingRates();
          setShippingPackages(rates ?? []);
        } catch {
          // Envio opcional — não bloquear se falhar
        }
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Erro ao carregar checkout.');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    // Aguarda o carrinho estar carregado antes de inicializar
    if (!cartLoading) initCheckout();
  }, [cartLoading, initCheckout]);

  // ── Address helpers ────────────────────────────────────────────────────────

  const updateBilling  = (f: keyof CheckoutAddress, v: string) => setBilling(p  => ({ ...p, [f]: v }));
  const updateShipping = (f: keyof CheckoutAddress, v: string) => setShipping(p => ({ ...p, [f]: v }));

  // ── Shipping ───────────────────────────────────────────────────────────────

  const selectShippingRate = async (packageId: number, rateId: string) => {
    setShippingLoading(true);
    try {
      await checkoutApi.selectShippingRate(packageId, rateId);
      const [rates, data] = await Promise.all([
        checkoutApi.getShippingRates(),
        checkoutApi.getCheckout(),
      ]);
      setShippingPackages(rates ?? []);
      setCheckoutData(data);
    } catch { /* silent */ } finally {
      setShippingLoading(false);
    }
  };

  // ── Coupons ────────────────────────────────────────────────────────────────

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      await checkoutApi.applyCoupon(couponCode.trim());
      setAppliedCoupons(prev => [...prev, couponCode.trim()]);
      setCouponCode('');
      const data = await checkoutApi.getCheckout();
      setCheckoutData(data);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Cupão inválido.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = async (code: string) => {
    try {
      await checkoutApi.removeCoupon(code);
      setAppliedCoupons(prev => prev.filter(c => c !== code));
      const data = await checkoutApi.getCheckout();
      setCheckoutData(data);
    } catch { /* silent */ }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const result = await checkoutApi.placeOrder({
        billing_address:  { ...billing },
        shipping_address: sameAddress ? { ...billing } : { ...shipping },
        payment_method:   paymentMethod,
        customer_note:    customerNote || undefined,
      });

      setOrderResult(result);

      if (result.payment_result?.redirect_url) {
        window.location.href = result.payment_result.redirect_url;
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Erro ao processar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Totals ─────────────────────────────────────────────────────────────────

  const minor         = checkoutData?.totals?.currency_minor_unit ?? 2;
  const shippingTotal = toCurrency(checkoutData?.totals?.total_shipping, minor);
  const discount      = toCurrency(checkoutData?.totals?.total_discount, minor);
  const grand         = toCurrency(checkoutData?.totals?.total_price, minor) || (total + shippingTotal - discount);

  // ── Order success ──────────────────────────────────────────────────────────

  if (orderResult && !orderResult.payment_result?.redirect_url) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header onNavigate={p => router.push(`/${p}`)} />
        <div className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="max-w-md w-full text-center space-y-8">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center border-2 border-black">
                <Check size={28} strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl tracking-tight text-black mb-3">Pedido Confirmado</h1>
              {orderResult.order_id && (
                <p className="text-sm text-black/60">Pedido #{orderResult.order_id}</p>
              )}
              <p className="mt-4 text-sm text-black/60 leading-relaxed">
                Receberá um email de confirmação em breve.<br />Obrigado pela sua compra.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-black text-white py-4 text-sm tracking-[0.12em] hover:bg-black/90 transition-colors"
            >
              CONTINUAR A COMPRAR
            </button>
          </div>
        </div>
        <Footer onNavigate={p => router.push(`/${p}`)} />
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isInitializing || cartLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-black/40" />
      </div>
    );
  }

  // ── Empty cart ─────────────────────────────────────────────────────────────

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header onNavigate={p => router.push(`/${p}`)} />
        <div className="flex-1 flex items-center justify-center px-6 py-24 text-center">
          <div className="space-y-6">
            <p className="text-sm text-black/60">O seu carrinho está vazio.</p>
            <button onClick={() => router.push('/products')} className="bg-black text-white px-8 py-4 text-sm tracking-[0.12em] hover:bg-black/90 transition-colors">
              VER PRODUTOS
            </button>
          </div>
        </div>
        <Footer onNavigate={p => router.push(`/${p}`)} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header onNavigate={p => router.push(`/${p}`)} cartItemCount={itemCount} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 lg:py-16">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs tracking-wide text-black/50 hover:text-black transition-colors mb-10"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          VOLTAR
        </button>

        {globalError && (
          <div className="mb-8 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">

            {/* ── LEFT ─────────────────────────────────────────────────── */}
            <div className="space-y-12">

              {/* 1. Faturação */}
              <section>
                <SectionTitle step={1} title="DADOS DE FATURAÇÃO" />
                <AddressForm address={billing} onChange={updateBilling} showEmail />
              </section>

              {/* 2. Entrega */}
              <section>
                <SectionTitle step={2} title="MORADA DE ENTREGA" />
                <label className="flex items-center gap-3 cursor-pointer mb-6">
                  <div
                    role="checkbox"
                    aria-checked={sameAddress}
                    onClick={() => setSameAddress(v => !v)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors cursor-pointer ${
                      sameAddress ? 'border-black bg-black' : 'border-black/30 hover:border-black'
                    }`}
                  >
                    {sameAddress && <Check size={12} strokeWidth={2.5} className="text-white" />}
                  </div>
                  <span className="text-sm text-black/70 select-none">Igual à morada de faturação</span>
                </label>
                {!sameAddress && <AddressForm address={shipping} onChange={updateShipping} />}
              </section>

              {/* 3. Envio */}
              {shippingPackages.length > 0 && (
                <section>
                  <SectionTitle step={3} title="MÉTODO DE ENVIO" />
                  <div className="space-y-4">
                    {shippingPackages.map(pkg => (
                      <div key={pkg.package_id}>
                        {shippingPackages.length > 1 && (
                          <p className="text-xs tracking-wide text-black/40 mb-3">{pkg.name}</p>
                        )}
                        <div className="space-y-2">
                          {pkg.shipping_rates.map(rate => {
                            const price = toCurrency(rate.price, rate.currency_minor_unit);
                            return (
                              <div
                                key={rate.rate_id}
                                onClick={() => !rate.selected && selectShippingRate(pkg.package_id, rate.rate_id)}
                                className={`flex items-center justify-between gap-4 border px-4 py-3 cursor-pointer transition-colors ${
                                  rate.selected ? 'border-black bg-black/[0.02]' : 'border-black/15 hover:border-black/40'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${rate.selected ? 'border-black' : 'border-black/30'}`}>
                                    {rate.selected && <div className="h-2 w-2 rounded-full bg-black" />}
                                  </div>
                                  <span className="text-sm text-black">{rate.name}</span>
                                </div>
                                <span className="text-sm text-black shrink-0">
                                  {price === 0 ? 'Grátis' : `R$ ${fmt(price)}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {shippingLoading && (
                      <div className="flex items-center gap-2 text-xs text-black/40">
                        <Loader2 size={12} className="animate-spin" /> A actualizar...
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 4. Pagamento */}
              <section>
                <SectionTitle step={shippingPackages.length > 0 ? 4 : 3} title="MÉTODO DE PAGAMENTO" />
                {paymentMethods.length > 0 ? (
                  <div className="space-y-2">
                    {paymentMethods.map(method => (
                      <div
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex items-start gap-4 border px-4 py-4 cursor-pointer transition-colors ${
                          paymentMethod === method.id ? 'border-black bg-black/[0.02]' : 'border-black/15 hover:border-black/40'
                        }`}
                      >
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${paymentMethod === method.id ? 'border-black' : 'border-black/30'}`}>
                          {paymentMethod === method.id && <div className="h-2 w-2 rounded-full bg-black" />}
                        </div>
                        <div>
                          <p className="text-sm text-black">{method.title}</p>
                          {method.description && (
                            <p className="mt-1 text-xs text-black/50 leading-relaxed" dangerouslySetInnerHTML={{ __html: method.description }} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-black/50">Nenhum método de pagamento disponível.</p>
                )}
              </section>

              {/* Nota */}
              <section>
                <button
                  type="button"
                  onClick={() => setShowNote(v => !v)}
                  className="flex items-center gap-2 text-xs tracking-wide text-black/50 hover:text-black transition-colors"
                >
                  {showNote ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  ADICIONAR NOTA AO PEDIDO
                </button>
                {showNote && (
                  <textarea
                    value={customerNote}
                    onChange={e => setCustomerNote(e.target.value)}
                    rows={3}
                    placeholder="Instruções especiais, referências de entrega..."
                    className="mt-4 w-full border border-black/20 px-3 py-2.5 text-sm placeholder:text-black/30 focus:border-black focus:outline-none resize-none"
                  />
                )}
              </section>
            </div>

            {/* ── RIGHT — Resumo ────────────────────────────────────────── */}
            <div className="lg:sticky lg:top-28 h-fit space-y-6">
              <div className="border border-black/10 p-6 space-y-5">
                <h3 className="text-xs tracking-[0.15em] text-black/40">RESUMO DO PEDIDO</h3>

                {/* Itens */}
                <div className="space-y-4 divide-y divide-black/5">
                  {cart.map(item => (
                    <div key={item.key} className="flex gap-4 pt-4 first:pt-0">
                      <div className="h-14 w-14 shrink-0 border border-black/10 bg-neutral-50 overflow-hidden">
                        {(item.product as any).image
                          ? <img src={(item.product as any).image} alt={item.product.name} className="h-full w-full object-cover" />
                          : <div className="h-full w-full bg-black/5" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-black leading-tight line-clamp-2">
                          {decodeHTMLEntities(item.product.name)}
                        </p>
                        <p className="text-xs text-black/40 mt-0.5">Qtd: {item.quantity}</p>
                      </div>
                      <p className="text-xs text-black shrink-0">
                        R$ {fmt(parseFloat(String(item.total)))}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Cupão */}
                <div className="pt-2 border-t border-black/10">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                        placeholder="CUPÃO"
                        className="w-full border border-black/20 pl-8 pr-3 py-2 text-xs placeholder:text-black/30 focus:border-black focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="border border-black px-4 py-2 text-xs tracking-wide hover:bg-black hover:text-white transition-colors disabled:opacity-40"
                    >
                      {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'APLICAR'}
                    </button>
                  </div>
                  {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
                  {appliedCoupons.map(code => (
                    <div key={code} className="flex items-center justify-between mt-2">
                      <span className="text-xs text-green-700 flex items-center gap-1.5">
                        <Check size={12} strokeWidth={2} />{code}
                      </span>
                      <button type="button" onClick={() => removeCoupon(code)} className="text-black/30 hover:text-black">
                        <X size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totais */}
                <div className="pt-2 border-t border-black/10 space-y-2">
                  <div className="flex justify-between text-xs text-black/60">
                    <span>Subtotal</span>
                    <span>R$ {fmt(total)}</span>
                  </div>
                  {shippingTotal > 0 && (
                    <div className="flex justify-between text-xs text-black/60">
                      <span>Envio</span>
                      <span>R$ {fmt(shippingTotal)}</span>
                    </div>
                  )}
                  {shippingTotal === 0 && shippingPackages.length > 0 && (
                    <div className="flex justify-between text-xs text-black/60">
                      <span>Envio</span>
                      <span className="text-green-700">Grátis</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-green-700">
                      <span>Desconto</span>
                      <span>−R$ {fmt(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium text-black pt-2 border-t border-black/10">
                    <span>Total</span>
                    <span>R$ {fmt(grand)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !paymentMethod}
                className="w-full bg-black text-white py-4 text-sm tracking-[0.15em] hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isSubmitting
                  ? <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> A PROCESSAR...</>
                  : 'CONFIRMAR PEDIDO'
                }
              </button>

              <p className="text-center text-[10px] text-black/30 tracking-wide">
                Os seus dados são processados de forma segura
              </p>
            </div>

          </div>
        </form>
      </main>

      <Footer onNavigate={p => router.push(`/${p}`)} />
    </div>
  );
}