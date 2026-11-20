'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UtensilsCrossed, PlusCircle, ShoppingBag, LogOut, User, Menu, X } from 'lucide-react';

export function FriendNav({ friendName }: { friendName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/friend" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Campus<span className="text-brand-600">Bite</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
                Collector Portal
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/friend"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === '/friend'
                  ? 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>My Orders</span>
            </Link>

            <Link
              href="/friend/order"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === '/friend/order'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-brand-700 bg-brand-50 hover:bg-brand-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Take New Order</span>
            </Link>
          </nav>

          {/* User Info & Logout */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {friendName || 'Friend'}
              </p>
              <p className="text-[10px] text-slate-400">Order Collector</p>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? 'Exiting...' : 'Sign Out'}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center gap-2">
            <Link
              href="/friend/order"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-5 space-y-2 shadow-xl animate-in slide-in-from-top">
          <div className="py-2 px-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-800">{friendName || 'Friend'}</span>
            </div>
            <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
              Collector
            </span>
          </div>

          <Link
            href="/friend"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold ${
              pathname === '/friend' ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>My Submitted Orders</span>
          </Link>

          <Link
            href="/friend/order"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-brand-700 bg-brand-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Take New Order / Register Team</span>
          </Link>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
