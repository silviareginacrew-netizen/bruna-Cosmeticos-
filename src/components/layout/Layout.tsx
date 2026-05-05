import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Users, ShoppingCart, Wallet, CreditCard, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import Logo from '../ui/Logo';
import { motion } from 'framer-motion';

const NavItems = [
  { path: '/home', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/estoque', icon: Package, label: 'Estoque' },
  { path: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/consorcio', icon: CreditCard, label: 'Consórcio' },
  { path: '/caixa', icon: Wallet, label: 'Caixa' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col md:flex-row pb-24 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-dark-surface p-8 sticky top-0 h-screen">
        <Logo size="sm" className="mb-12 !items-start" />
        
        <nav className="flex-1 space-y-3">
          {NavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 font-bold uppercase tracking-[0.2em] text-[9px] relative group",
                isActive 
                  ? "bg-premium-pink text-white shadow-xl shadow-premium-pink/20" 
                  : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
              )}
            >
              <item.icon className={cn("w-4 h-4 transition-transform duration-500", "group-hover:scale-110")} />
              <span>{item.label}</span>
              {location.pathname === item.path && (
                <motion.div 
                  layoutId="sidebar-active"
                  className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                />
              )}
            </NavLink>
          ))}
        </nav>

        <button 
          onClick={() => auth.signOut()}
          className="mt-auto flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500/50 hover:text-red-500 hover:bg-red-500/5 transition-all text-[9px] font-black uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair do Sistema</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-premium-pink/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-premium-gold/5 blur-[100px] rounded-full -z-10 pointer-events-none" />
        
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="p-6 md:p-12 max-w-7xl mx-auto"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Bottom Nav - Premium Design */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-dark-surface/80 backdrop-blur-2xl border border-white/5 flex items-center justify-around px-4 z-50 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {NavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-2 flex-1 transition-all relative py-2",
              isActive ? "text-premium-pink" : "text-white/20"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-2.5 rounded-2xl transition-all duration-500",
                  isActive ? "bg-premium-pink/10 shadow-inner shadow-premium-pink/20" : ""
                )}>
                  <item.icon className={cn("w-5 h-5 transition-all text-current", isActive && "scale-110")} />
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="nav-glow-mobile" 
                    className="absolute bottom-1 w-1 h-1 bg-premium-pink rounded-full shadow-[0_0_12px_#E91E63]" 
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
