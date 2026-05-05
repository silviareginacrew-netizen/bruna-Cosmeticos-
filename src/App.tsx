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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4">
        <Loader2 className="w-10 h-10 text-premium-pink animate-spin" />
        <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/20">Carregando sistema...</p>
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
