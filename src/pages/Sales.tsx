import { useState, useEffect, FormEvent } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Sale, Product, Client, Brand } from '../types';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Trash2, 
  X,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  FileText,
  Package,
  User,
  Download,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { generateReceipt } from '../services/pdfService';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Sale form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    try {
      const unsubSales = onSnapshot(query(collection(db, 'users', userId, 'sales')), (snap) => {
        console.log("Sales Snap:", snap.size);
        setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
        setLoading(false);
        clearTimeout(timeoutId);
      }, (err) => {
        console.error("Erro Sales Listener:", err);
        setLoading(false);
        clearTimeout(timeoutId);
      });

      const unsubProducts = onSnapshot(query(collection(db, 'users', userId, 'inventory')), (snap) => {
        setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      }, (err) => console.error("Erro Sales-Product Listener:", err));

      const unsubClients = onSnapshot(query(collection(db, 'users', userId, 'clients')), (snap) => {
        setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
      }, (err) => console.error("Erro Sales-Client Listener:", err));

      return () => {
        unsubSales();
        unsubProducts();
        unsubClients();
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error("Erro setup Sales:", error);
      setLoading(false);
      clearTimeout(timeoutId);
    }
  }, [auth.currentUser]);

  const handleSale = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedProduct) return;
    setIsSubmitting(true);

    try {
      if (!selectedProduct) throw new Error('Selecione um produto');
      if (quantity <= 0) throw new Error('A quantidade deve ser maior que zero');
      
      const userId = auth.currentUser.uid;
      const totalValue = selectedProduct.sellPrice * quantity;
      const totalCost = (selectedProduct.buyPrice || 0) * quantity;
      const profit = totalValue - totalCost;
      const status = 'entregue';

      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'users', userId, 'inventory', selectedProduct.id);
        const productSnap = await transaction.get(productRef);
        
        if (!productSnap.exists()) throw new Error("Produto não encontrado!");
        
        const currentStock = productSnap.data().quantity;

        // 1. Handle Sales Record
        if (editingSale) {
          const stockDiff = editingSale.quantity - quantity;
          const newStock = currentStock + stockDiff;
          
          if (newStock < 0) throw new Error("Estoque insuficiente após alteração!");

          const saleRef = doc(db, 'users', userId, 'sales', editingSale.id);
          transaction.update(saleRef, {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            clientId: selectedClient?.id || null,
            clientName: selectedClient?.name || 'Venda Avulsa',
            quantity,
            totalValue,
            totalCost,
            profit,
            paymentMethod,
            brand: selectedProduct.brand,
            updatedAt: serverTimestamp()
          });

          transaction.update(productRef, { quantity: newStock, updatedAt: serverTimestamp() });
        } else {
          if (currentStock < quantity) throw new Error("Estoque insuficiente!");

          const salesColRef = collection(db, 'users', userId, 'sales');
          const newSaleRef = doc(salesColRef);
          
          transaction.set(newSaleRef, {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            clientId: selectedClient?.id || null,
            clientName: selectedClient?.name || 'Venda Avulsa',
            quantity,
            totalValue,
            totalCost,
            profit,
            paymentMethod,
            brand: selectedProduct.brand,
            status, 
            date: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // 2. Update Inventory
          transaction.update(productRef, { quantity: currentStock - quantity, updatedAt: serverTimestamp() });

          // 3. Update Transaction (Cashier)
          const transColRef = collection(db, 'users', userId, 'transactions');
          const newTransRef = doc(transColRef);
          transaction.set(newTransRef, {
            type: 'entry',
            brand: selectedProduct.brand,
            value: totalValue,
            cost: totalCost,
            profit: profit,
            description: `Venda: ${selectedProduct.name} x${quantity}`,
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
          });
        }
      });

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao registrar venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!auth.currentUser || !confirm('Deseja excluir este registro de venda? O estoque será devolvido.')) return;
    try {
      const userId = auth.currentUser.uid;
      
      await runTransaction(db, async (transaction) => {
        const saleRef = doc(db, 'users', userId, 'sales', sale.id);
        const productRef = doc(db, 'users', userId, 'inventory', sale.productId);
        
        const productSnap = await transaction.get(productRef);
        
        if (productSnap.exists()) {
          const currentStock = productSnap.data().quantity;
          transaction.update(productRef, { 
            quantity: currentStock + sale.quantity,
            updatedAt: serverTimestamp()
          });
        }
        
        transaction.delete(saleRef);
      });

    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir venda.');
    }
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setSelectedProduct(products.find(p => p.id === sale.productId) || null);
    setSelectedClient(clients.find(c => c.id === sale.clientId) || null);
    setQuantity(sale.quantity);
    setPaymentMethod(sale.paymentMethod);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingSale(null);
    setSelectedProduct(null);
    setSelectedClient(null);
    setQuantity(1);
    setPaymentMethod('Dinheiro');
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium text-white italic">Vendas</h1>
          <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.3em] mt-1">Gestão de Faturamento</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)} 
          className="w-14 h-14 bg-premium-pink text-white rounded-full flex items-center justify-center shadow-xl shadow-premium-pink/20"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-12 h-12 border-2 border-premium-pink/10 border-t-premium-pink rounded-full animate-spin" />
          <p className="text-[10px] text-white/10 uppercase font-black tracking-[0.4em]">Sincronizando faturamento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center gap-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem]">
              <ShoppingCart className="w-16 h-16 text-white/[0.02]" />
              <p className="text-white/10 font-black tracking-widest uppercase text-[10px]">Nenhuma venda localizada</p>
            </div>
          ) : (
            sales.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={sale.id} 
                className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 space-y-6 group hover:translate-y-[-4px] transition-all duration-500"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center group-hover:bg-premium-pink/10 transition-all duration-500">
                    <Package className="w-8 h-8 text-white/20 group-hover:text-premium-pink transition-colors" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <h3 className="font-display text-xl font-medium text-white italic group-hover:text-premium-pink transition-colors truncate">{sale.productName}</h3>
                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest flex items-center gap-2">
                          <User className="w-3 h-3" /> {sale.clientName || 'Venda Avulsa'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-premium-pink tracking-tighter">{formatCurrency(sale.totalValue)}</p>
                        <span className={cn(
                          "text-[8px] uppercase tracking-widest px-2 py-1 rounded font-black",
                          sale.status === 'entregue' ? "bg-green-500/10 text-green-500" : 
                          sale.status === 'pendente' ? "bg-premium-pink/10 text-premium-pink" : 
                          "bg-red-500/10 text-red-500"
                        )}>
                          {sale.status || 'entregue'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openEditModal(sale)}
                          className="w-10 h-10 flex items-center justify-center bg-white/5 text-white/20 hover:text-white rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => generateReceipt(sale)}
                          className="w-10 h-10 flex items-center justify-center bg-white/5 text-white/20 hover:text-white rounded-xl transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(sale)}
                          className="w-10 h-10 flex items-center justify-center bg-white/5 text-white/20 hover:text-red-500 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-[9px] text-white/10 uppercase font-black tracking-widest italic font-display">
                          {new Date(sale.date).toLocaleDateString('pt-BR')} • {sale.paymentMethod}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Premium Sale Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-dark-bg/95 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              className="bg-dark-surface w-full max-w-xl rounded-[3rem] p-8 shadow-2xl relative border border-white/5 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 text-white/20 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-10">
                <h2 className="text-3xl font-display font-medium text-white italic">
                  {editingSale ? 'Ajustar' : 'Nova'} Venda
                </h2>
                <p className="text-[9px] uppercase font-black tracking-widest text-premium-pink mt-1">Concretize um Momento de Luxo</p>
              </div>

              <form onSubmit={handleSale} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Seleção de Produto</label>
                  <div className="relative">
                    <select 
                      className="input-premium appearance-none"
                      required
                      value={selectedProduct?.id || ''}
                      onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}
                    >
                      <option value="">Buscar no acervo...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                          {p.name} - R$ {p.sellPrice.toLocaleString('pt-BR')} ({p.brand} - {p.quantity} un)
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/10">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Destinatário</label>
                  <select 
                    className="input-premium appearance-none"
                    value={selectedClient?.id || ''}
                    onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                  >
                    <option value="">Consumidor Final (Venda Avulsa)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Volume</label>
                    <div className="flex items-center justify-between input-premium !py-2">
                      <button 
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 text-white/40"
                      >
                        <MinusCircle className="w-5 h-5" />
                      </button>
                      <span className="text-xl font-bold text-white">{quantity}</span>
                      <button 
                        type="button"
                        onClick={() => setQuantity(Math.min(selectedProduct?.quantity || 100, quantity + 1))}
                        className="w-10 h-10 flex items-center justify-center bg-premium-pink/10 rounded-xl hover:bg-premium-pink/20 text-premium-pink"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Forma de Recebimento</label>
                    <select 
                      className="input-premium appearance-none"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Dinheiro">Espécie</option>
                      <option value="Cartão de Crédito">Crédito</option>
                      <option value="Cartão de Débito">Débito</option>
                      <option value="Pix">TED / Pix</option>
                      <option value="Fiado / Pendente">Pendente / Fiado</option>
                    </select>
                  </div>
                </div>

                {selectedProduct && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 bg-premium-pink/[0.02] border border-premium-pink/10 rounded-[2rem] flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[10px] uppercase text-premium-pink font-black tracking-[0.2em] mb-1">Total Consolidado</p>
                      <p className="text-4xl font-bold text-white tracking-tighter">
                        {formatCurrency(selectedProduct.sellPrice * quantity)}
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-premium-pink/10 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-premium-pink" />
                    </div>
                  </motion.div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting || !selectedProduct}
                  className="btn-premium w-full !py-6 flex items-center justify-center gap-3 shadow-2xl shadow-premium-pink/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Finalizar Venda de Luxo
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
