'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Droplets, Coins, Shield, Vault } from 'lucide-react';

const navigation = [
  { name: 'Liquidity Pool', href: '/', icon: Droplets },
  { name: 'Staking', href: '/staking', icon: Coins },
  { name: 'Liquid Staking', href: '/liquid-staking', icon: Shield },
  { name: 'Vault', href: '/vault', icon: Vault },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-blue-400">
              BLX DeFi
            </Link>
            <div className="hidden md:flex space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </div>
    </nav>
  );
}
