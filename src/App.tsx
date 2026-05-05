import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Clients from './pages/Clients';
import Sales from './pages/Sales';
import Consortium from './pages/Consortium';
import Cashier from './pages/Cashier';
import Catalog from './pages/Catalog';
import Layout from './components/layout/Layout';
import { Loader2 } from 'lucide-react';

import Logo from './components/ui/Logo';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      // Simulate/Ensure minimum splash screen time for impact
      const timer = setTimeout(() => {
        setUser(u);
        setLoadingAuth(false);
      }, 2000);
      return () => clearTimeout(timer);
    });
    return () => unsubscribe();
  }, []);

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-premium-pink/5 blur-[100px] rounded-full animate-pulse" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10 text-center space-y-8"
        >
          <Logo size="lg" />
          <div className="space-y-4">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-[10px] uppercase font-black tracking-[0.8em] text-white"
            >
              Elite Experience
            </motion.p>
            <div className="w-48 h-[1px] bg-white/5 mx-auto relative overflow-hidden">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-premium-pink/40 to-transparent"
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        {/* Private Routes */}
        <Route element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<Dashboard />} />
          <Route path="/estoque" element={<Inventory />} />
          <Route path="/adicionar-produto" element={<Inventory />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/vendas" element={<Sales />} />
          <Route path="/consorcio" element={<Consortium />} />
          <Route path="/caixa" element={<Cashier />} />
          <Route path="/catalogo" element={<Catalog />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
