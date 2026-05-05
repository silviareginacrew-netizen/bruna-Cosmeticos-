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
import Layout from './components/layout/Layout';
import { Loader2 } from 'lucide-react';

import Logo from './components/ui/Logo';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    console.log("Iniciando monitoramento de autenticação...");
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("Mudança de estado Auth:", u ? `Usuário ${u.uid} logado` : "Nenhum usuário logado");
      setUser(u);
      setLoadingAuth(false);
    }, (error) => {
      console.error("Erro na autenticação:", error);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg relative overflow-hidden" style={{ minHeight: '100vh' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-premium-pink/5 blur-[100px] rounded-full animate-pulse" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center space-y-10"
        >
          <Logo size="lg" />
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-premium-pink/10 border-t-premium-pink rounded-full animate-spin" />
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="text-[10px] uppercase font-black tracking-[0.8em] text-white ml-[0.8em]"
              >
                Iniciando Acervo
              </motion.p>
            </div>
            <p className="text-[9px] text-white/10 uppercase font-bold tracking-widest italic font-display">Conectando ao sistema de luxo...</p>
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
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
