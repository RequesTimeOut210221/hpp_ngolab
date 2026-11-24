import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  UtensilsCrossed, 
  Package, 
  BarChart3,
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Building2,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { AuthUser } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

const navItems = [
  { 
    id: 'cashflow', 
    label: 'Buku Kas Belanja', 
    icon: Wallet, 
    section: 'Finansial & Kas', 
    badge: 'Real-time'
  },
  { 
    id: 'variance', 
    label: 'Varians & Laba Kotor', 
    icon: BarChart3, 
    section: 'Finansial & Kas', 
    badge: 'POS Rekonsiliasi'
  },
  { 
    id: 'pricing', 
    label: 'Simulator Margin & POS', 
    icon: TrendingUp, 
    section: 'HPP & Pricing Engine',
    badge: 'POS Sync'
  },
  { 
    id: 'recipes', 
    label: 'Resep Bertingkat (3-Tier)', 
    icon: UtensilsCrossed, 
    section: 'Resep & Manufaktur',
    badge: '41 Resep'
  },
  { 
    id: 'ingredients', 
    label: 'Master Bahan & Konversi', 
    icon: Package, 
    section: 'Inventori & Logistik',
    badge: 'AVCO / Mkt'
  },
];

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sections = Array.from(new Set(navItems.map(item => item.section)));

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? '80px' : '260px' }}
      className="h-screen bg-slate-50 border-r border-slate-200/80 flex flex-col relative z-20 shadow-premium select-none shrink-0"
    >
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 overflow-hidden border-b border-slate-200/70 bg-white/50 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
          <img 
            src="/geasture-x-ngolab.svg" 
            alt="Geasture X Ngolab" 
            className="w-full h-full object-contain"
            onError={(e) => {
              // fallback if svg fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-sm tracking-tight whitespace-nowrap text-slate-900 flex flex-col min-w-0"
          >
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black truncate">
              GEASTEATS &bull; NGOLAB
            </span>
            <span className="leading-none mt-0.5 text-slate-800 font-bold text-xs truncate">
              Finansial &amp; HPP <span className="text-orange-500 font-black">Admin</span>
            </span>
          </motion.div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-5 space-y-6 custom-scrollbar">
        {sections.map(section => (
          <div key={section} className="space-y-1.5">
            {!isCollapsed && (
              <h3 className="px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                {section}
              </h3>
            )}
            <div className="px-3 space-y-1">
              {navItems
                .filter(item => item.section === section)
                .map(item => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative text-xs font-semibold text-left",
                        isActive 
                          ? "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20" 
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={cn(
                        "w-4 h-4 shrink-0 transition-colors", 
                        isActive 
                          ? "text-white" 
                          : "text-slate-400 group-hover:text-slate-700"
                      )} />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0 pr-1">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className={cn(
                              "text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ml-1.5 shrink-0",
                              isActive
                                ? "bg-orange-600/80 text-orange-100"
                                : "bg-slate-100 text-slate-500 border border-slate-200/60"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="active-pill"
                          className="absolute right-0 w-1.5 h-6 bg-white rounded-l-full"
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}

        {/* External Portal Links */}
        {!isCollapsed && (() => {
          const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          const posUrl = isLocal ? 'http://localhost:3000' : 'https://geasteats.ngolab.online';
          const logistikUrl = isLocal ? 'http://localhost:5174' : 'https://logistik.ngolab.online';

          return (
            <div className="px-4 pt-4 border-t border-slate-200/60">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2">
                Ekosistem Terintegrasi
              </h3>
              <div className="space-y-1">
                <a 
                  href={posUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 text-xs font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-orange-500" />
                    Portal Admin POS
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <a 
                  href={logistikUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 text-xs font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    Kolab Logistik
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Footer / Profile */}
      <div className="p-4 border-t border-slate-200/70 bg-white/50">
        <div className={cn("flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200/70 mb-2", isCollapsed ? "justify-center" : "")}>
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center font-bold text-xs text-orange-600 uppercase shadow-sm">
              {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'ST'}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-200" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentUser?.name || 'Staff Ngolab'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {currentUser?.role || 'Staff'} &bull; Ngolab HQ
              </p>
            </div>
          )}
        </div>
        
        {onLogout && (
          <button 
            onClick={onLogout}
            className={cn(
              "w-full flex items-center justify-center gap-2 p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors text-xs font-bold cursor-pointer",
              isCollapsed ? "px-0" : ""
            )}
            title="Keluar dari Sesi HPP"
          >
            <LogOut size={14} className="text-rose-500" />
            {!isCollapsed && <span>Keluar / Logout</span>}
          </button>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-orange-500 transition-colors z-30 shadow-premium"
        title={isCollapsed ? 'Perluas Menu' : 'Sembunyikan Menu'}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
