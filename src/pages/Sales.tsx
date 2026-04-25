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
  serverTimestamp 
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
import { motion, AnimatePresence } from 'motion/react';
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

    const unsubSales = onSnapshot(query(collection(db, 'users', userId, 'sales')), (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });

    const unsubProducts = onSnapshot(query(collection(db, 'users', userId, 'inventory')), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const unsubClients = onSnapshot(query(collection(db, 'users', userId, 'clients')), (snap) => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });

    setLoading(false);
    return () => {
      unsubSales();
      unsubProducts();
      unsubClients();
    };
  }, []);

  const handleSale = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedProduct) return;
    setIsSubmitting(true);

    try {
      const totalValue = selectedProduct.sellPrice * quantity;
      const userId = auth.currentUser.uid;

      // 1. Create/Update Sale Record
      if (editingSale) {
        await updateDoc(doc(db, 'users', userId, 'sales', editingSale.id), {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          clientId: selectedClient?.id || null,
          clientName: selectedClient?.name || 'Venda Avulsa',
          quantity,
          totalValue,
          paymentMethod,
          brand: selectedProduct.brand
        });
      } else {
        await addDoc(collection(db, 'users', userId, 'sales'), {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          clientId: selectedClient?.id || null,
          clientName: selectedClient?.name || 'Venda Avulsa',
          quantity,
          totalValue,
          paymentMethod,
          brand: selectedProduct.brand,
          date: new Date().toISOString()
        });

        // 2. Update Inventory (only on new sale for simplicity, or we should handle diff)
        await updateDoc(doc(db, 'users', userId, 'inventory', selectedProduct.id), {
          quantity: selectedProduct.quantity - quantity,
          updatedAt: serverTimestamp()
        });

        // 3. Update Transaction (Cashier)
        await addDoc(collection(db, 'users', userId, 'transactions'), {
          type: 'entry',
          brand: selectedProduct.brand,
          value: totalValue,
          description: `Venda: ${selectedProduct.name} x${quantity} (${selectedClient?.name || 'Avulsa'})`,
          date: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!auth.currentUser || !confirm('Deseja excluir este registro de venda?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'sales', id));
    } catch (err) {
      console.error(err);
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
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-semibold text-pink-gradient mb-1">Vendas</h1>
            <p className="text-white/40 text-sm italic font-light tracking-wide italic">Registro de faturamento.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="w-14 h-14 btn-premium rounded-2xl shadow-xl">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-premium-pink" />
        </div>
      ) : (
        <div className="space-y-4">
          {sales.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <ShoppingCart className="w-12 h-12 text-white/5" />
              <p className="text-white/20 font-display text-xl uppercase tracking-widest italic">Sem vendas registradas</p>
            </div>
          ) : (
            sales.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale) => (
              <motion.div 
                key={sale.id} 
                className="card-premium group hover:border-premium-pink/20 transition-all duration-500 overflow-hidden relative"
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="w-14 sm:w-16 h-14 sm:h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-premium-pink/5 transition-colors shrink-0">
                    <Package className="w-6 sm:w-8 h-6 sm:h-8 text-white/20 group-hover:text-premium-pink transition-colors" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-display text-lg sm:text-xl text-white truncate italic">{sale.productName}</h3>
                      <p className="font-display text-xl text-premium-pink shrink-0">R$ {sale.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-white/30 font-bold">
                      <span className="flex items-center gap-1 truncate max-w-[120px]"><User className="w-3 h-3" /> {sale.clientName || 'Consumidor'}</span>
                      <span className="h-3 w-px bg-white/10" />
                      <span className="flex items-center gap-1 font-display tracking-normal"><Calendar className="w-3 h-3" /> {new Date(sale.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(sale)}
                      className="w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center bg-white/5 text-white/40 border border-white/5 rounded-xl hover:bg-premium-pink hover:text-black transition-all"
                    >
                      <Edit2 className="w-4 sm:w-5 h-4 sm:h-5" />
                    </button>
                    <button 
                      onClick={() => generateReceipt(sale)}
                      className="w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center bg-white/5 text-white/40 border border-white/5 rounded-xl hover:bg-premium-pink hover:text-black transition-all"
                    >
                      <Download className="w-4 sm:w-5 h-4 sm:h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(sale.id)}
                      className="w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center bg-red-500/5 text-red-500 border border-red-500/10 rounded-xl hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modal Nova Venda */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-dark-surface w-full max-w-xl rounded-3xl p-6 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-pink-gradient">
                <ShoppingCart className="w-6 h-6" />
                {editingSale ? 'Editar Venda' : 'Registrar Venda'}
              </h2>

              <form onSubmit={handleSale} className="space-y-6">
                {/* Product Selection */}
                <div>
                  <label className="text-xs text-white/60 mb-2 block uppercase tracking-widest">Produto</label>
                  <div className="relative">
                    <select 
                      className="input-premium appearance-none"
                      required
                      value={selectedProduct?.id || ''}
                      onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}
                    >
                      <option value="">Selecione um produto</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                          {p.name} - R$ {p.sellPrice.toLocaleString('pt-BR')} ({p.brand} - {p.quantity} em estoque)
                        </option>
                      ))}
                    </select>
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                  </div>
                </div>

                {/* Client Selection */}
                <div>
                  <label className="text-xs text-white/60 mb-2 block uppercase tracking-widest">Cliente (Opcional)</label>
                  <select 
                    className="input-premium"
                    value={selectedClient?.id || ''}
                    onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                  >
                    <option value="">Venda Avulsa</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="text-xs text-white/60 mb-2 block uppercase tracking-widest">Quantidade</label>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10"
                      >
                        <MinusCircle className="w-5 h-5 text-gold" />
                      </button>
                      <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                      <button 
                        type="button"
                        onClick={() => setQuantity(Math.min(selectedProduct?.quantity || 100, quantity + 1))}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10"
                      >
                        <PlusCircle className="w-5 h-5 text-gold" />
                      </button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-xs text-white/60 mb-2 block uppercase tracking-widest">Pagamento</label>
                    <select 
                      className="input-premium"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Pix">Pix</option>
                      <option value="Fiado / Pendente">Fiado / Pendente</option>
                    </select>
                  </div>
                </div>

                {/* Total Summary */}
                {selectedProduct && (
                  <div className="p-4 bg-gold/5 rounded-2xl border border-gold/10 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase text-gold/60 font-bold">Total a receber</p>
                      <p className="text-2xl font-bold text-gold">
                        {formatCurrency(selectedProduct.sellPrice * quantity)}
                      </p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-gold mt-1" />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting || !selectedProduct}
                  className="btn-premium w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar Venda'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
