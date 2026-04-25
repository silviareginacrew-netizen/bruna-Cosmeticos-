import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Users, ShoppingCart, Wallet, CreditCard, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import Logo from '../ui/Logo';
import { motion } from 'motion/react';

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
    <div className="min-h-screen bg-black flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-dark-surface p-6 sticky top-0 h-screen">
        <Logo size="sm" className="mb-12" />
        
        <nav className="flex-1 space-y-2">
          {NavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-display uppercase tracking-widest text-[10px]",
                isActive 
                  ? "bg-premium-pink text-black font-black shadow-lg shadow-premium-pink/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button 
          onClick={() => auth.signOut()}
          className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-4 md:p-10"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-dark-surface/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 z-50">
        {NavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1.5 flex-1 transition-all",
              isActive ? "text-premium-pink" : "text-white/20"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5 transition-all", isActive && "scale-110")} />
                <span className="text-[8px] uppercase font-black tracking-widest">{item.label}</span>
                {isActive && <motion.div layoutId="nav-glow" className="w-1 h-1 bg-premium-pink rounded-full shadow-[0_0_8px_rgba(255,182,193,0.8)]" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
