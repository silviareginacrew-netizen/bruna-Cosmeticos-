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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-center px-10">
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 text-premium-pink animate-spin mx-auto" />
          <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/20">Bruna Cosméticos</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        {/* Public Catalog */}
        <Route path="/app/:businessSlug" element={<Catalog />} />

        {/* Private Routes */}
        <Route element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/consortium" element={<Consortium />} />
          <Route path="/cashier" element={<Cashier />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
