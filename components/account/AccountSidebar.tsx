'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const links = [
  { href: '/conta',           label: 'Resumo' },
  { href: '/conta/pedidos',   label: 'Pedidos' },
  { href: '/conta/enderecos', label: 'Endereços' },
  { href: '/conta/detalhes',  label: 'Dados Pessoais' },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="w-48 flex-shrink-0">
      <ul className="space-y-1">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`block text-sm py-2 border-l-2 pl-3 transition-colors ${
                  active
                    ? 'border-black text-black'
                    : 'border-transparent text-black/40 hover:text-black hover:border-black/20'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
        <li className="pt-4">
          <button
            onClick={handleLogout}
            className="text-sm text-black/40 hover:text-black transition-colors pl-3"
          >
            Terminar Sessão
          </button>
        </li>
      </ul>
    </nav>
  );
}
