import { useState, useEffect, FormEvent } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  collectionGroup,
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Consortium, Installment, Client } from '../types';
import { 
  CreditCard, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  FileText,
  Printer,
  Check,
  Trash2,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { generateConsortiumPDF } from '../services/pdfService';

export default function ConsortiumPage() {
  const [consortiums, setConsortiums] = useState<Consortium[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [installmentsMap, setInstallmentsMap] = useState<Record<string, Installment[]>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConsortium, setEditingConsortium] = useState<Consortium | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [entryValue, setEntryValue] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(5);
  const [dueDay, setDueDay] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    setLoading(true);

    const unsubCons = onSnapshot(query(collection(db, 'users', userId, 'consortiums')), async (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consortium));
      setConsortiums(data);
      setLoading(false);
      
      // Clear old installment listeners if we were using them
      // Alternatively, just do a one-time fetch or a more controlled sync
      for (const con of data) {
         const insSnap = await getDocs(query(collection(db, 'users', userId, 'consortiums', con.id, 'installments')));
         const insData = insSnap.docs.map(d => ({ id: d.id, ...d.data() } as Installment));
         setInstallmentsMap(prev => ({ ...prev, [con.id]: insData.sort((a,b) => a.number - b.number) }));
      }
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    onSnapshot(query(collection(db, 'users', userId, 'clients')), (snap) => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });

    return () => unsubCons();
  }, [auth.currentUser]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedClient) return;
    setIsSubmitting(true);

    try {
      const userId = auth.currentUser.uid;
      const consortiumData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        totalValue,
        entryValue,
        installmentsCount,
        dueDay,
      };

      if (editingConsortium) {
         await updateDoc(doc(db, 'users', userId, 'consortiums', editingConsortium.id), {
           ...consortiumData,
           updatedAt: serverTimestamp()
         });
         alert('Consórcio atualizado com sucesso!');
      } else {
        const conRef = await addDoc(collection(db, 'users', userId, 'consortiums'), {
          ...consortiumData,
          status: 'active',
          createdAt: new Date().toISOString()
        });
        
        // Generate installments
        const installmentValue = (totalValue - entryValue) / installmentsCount;
        const today = new Date();
        
        for (let i = 1; i <= installmentsCount; i++) {
          const dueDate = new Date(today.getFullYear(), today.getMonth() + i, dueDay);
          await addDoc(collection(db, 'users', userId, 'consortiums', conRef.id, 'installments'), {
            consortiumId: conRef.id,
            number: i,
            dueDate: dueDate.toISOString(),
            value: installmentValue,
            status: 'pending'
          });
        }
        alert('Consórcio criado com sucesso!');
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (con: Consortium) => {
    setEditingConsortium(con);
    setSelectedClient(clients.find(c => c.id === con.clientId) || null);
    setTotalValue(con.totalValue);
    setEntryValue(con.entryValue || 0);
    setInstallmentsCount(con.installmentsCount);
    setDueDay(con.dueDay);
    setIsModalOpen(true);
  };

  const markAsPaid = async (consortiumId: string, installmentId: string, value: number) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    try {
      await updateDoc(doc(db, 'users', userId, 'consortiums', consortiumId, 'installments', installmentId), {
        status: 'paid',
        paidAt: new Date().toISOString()
      });

      // Add to transaction log
      await addDoc(collection(db, 'users', userId, 'transactions'), {
        type: 'entry',
        brand: 'Geral',
        value,
        description: `Parcela paga - Consórcio #${consortiumId.slice(0,5)}`,
        date: new Date().toISOString()
      });
      alert('Parcela marcada como paga!');
    } catch (err) {
      console.error(err);
      alert('Erro ao processar pagamento.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!auth.currentUser || !confirm('Deseja excluir este consórcio e todas as suas parcelas?')) return;
    try {
      const userId = auth.currentUser.uid;
      await deleteDoc(doc(db, 'users', userId, 'consortiums', id));
      alert('Consórcio excluído com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir consórcio.');
    }
  };

  const resetForm = () => {
    setEditingConsortium(null);
    setSelectedClient(null);
    setTotalValue(0);
    setEntryValue(0);
    setInstallmentsCount(5);
    setDueDay(10);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getInstallmentStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'overdue': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium text-white italic">Consórcio</h1>
          <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.3em] mt-1">Gestão de Sonhos Parcelados</p>
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
          <p className="text-[10px] text-white/10 uppercase font-black tracking-[0.4em]">Sincronizando parcelas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {consortiums.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center gap-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem]">
              <CreditCard className="w-16 h-16 text-white/[0.02]" />
              <p className="text-white/10 font-black tracking-widest uppercase text-[10px]">Nenhum consórcio localizado</p>
            </div>
          ) : (
            consortiums.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((con, idx) => {
              const installments = installmentsMap[con.id] || [];
              const paidCount = installments.filter(i => i.status === 'paid').length;
              const isExpanded = expandedId === con.id;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  layout
                  key={con.id} 
                  className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 space-y-6 group hover:border-premium-pink/10 transition-all duration-500"
                >
                  <div 
                    className="flex justify-between items-start cursor-pointer group/header"
                    onClick={() => setExpandedId(isExpanded ? null : con.id)}
                  >
                    <div className="space-y-1">
                      <h3 className="font-display text-2xl font-medium text-white italic group-hover/header:text-premium-pink transition-colors">{con.clientName}</h3>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-black italic">
                        Iniciado em {new Date(con.startDate || con.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Cota Consolidada</p>
                      <p className="text-2xl font-bold text-white tracking-tighter">{formatCurrency(con.totalValue)}</p>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 relative overflow-hidden group/progress">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-premium-pink/[0.01] rounded-full -mr-16 -mt-16 group-hover/progress:scale-110 transition-transform duration-700" />
                    <div className="flex justify-between text-[9px] uppercase tracking-[0.3em] font-black mb-4">
                      <span className="text-white/20">Progresso da Realização</span>
                      <span className="text-premium-pink">
                        {paidCount} / {con.installmentsCount} <span className="text-[8px] text-white/10 ml-1">parcelas</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(paidCount / con.installmentsCount) * 100}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-premium-gradient shadow-[0_0_15px_rgba(233,30,99,0.3)]" 
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3 max-h-96 overflow-y-auto pr-3 no-scrollbar py-2 border-t border-white/5 mt-4 pt-6"
                      >
                        {installments.map((inst, idx) => {
                          const isOverdue = inst.status !== 'paid' && new Date(inst.dueDate) < new Date();
                          return (
                            <div key={inst.id} className="flex justify-between items-center p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all duration-300">
                              <div className="flex items-center gap-5">
                                <span className="text-[9px] font-black text-white/10 italic">#{idx + 1}</span>
                                <div>
                                  <p className="text-sm font-bold text-white/70">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</p>
                                  <p className={cn(
                                    "text-[9px] uppercase font-black tracking-widest",
                                    isOverdue ? "text-red-500" : inst.status === 'paid' ? "text-green-500/40" : "text-white/10"
                                  )}>
                                    {inst.status === 'paid' ? 'Liquidada' : isOverdue ? 'Em atraso' : 'Vencimento'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-5">
                                <p className="text-base font-bold text-white tracking-tight">{formatCurrency(inst.value)}</p>
                                <motion.button 
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsPaid(con.id, inst.id, inst.value);
                                  }}
                                  className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                    inst.status === 'paid' 
                                      ? "bg-green-500 text-black shadow-lg shadow-green-500/20" 
                                      : isOverdue ? "bg-red-500/10 text-red-500 border border-red-500/10" : "bg-white/5 text-white/20 border border-white/5 hover:text-white"
                                  )}
                                >
                                  {inst.status === 'paid' ? <Check className="w-6 h-6 stroke-[3]" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                                </motion.button>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => openEditModal(con)}
                      className="w-14 h-14 flex items-center justify-center bg-white/5 text-white/20 hover:text-white rounded-[1.2rem] transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => generateConsortiumPDF(con, installments)}
                      className="flex-1 bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] uppercase font-black tracking-[0.3em] text-white/40 hover:text-white rounded-[1.2rem] transition-all flex items-center justify-center gap-3"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Carnê
                    </button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                       onClick={() => {
                        const text = encodeURIComponent(`Olá ${con.clientName}! Passando para lembrar da sua parcela BC que está próxima do vencimento. Valor: R$ ${(installments.find(i => i.status === 'pending')?.value || 0).toFixed(2)}`);
                        const clientPhone = clients.find(cl => cl.id === con.clientId)?.phone.replace(/\D/g, '');
                        window.open(`https://wa.me/55${clientPhone}?text=${text}`, '_blank');
                      }}
                      className="w-14 h-14 bg-green-500/10 text-green-500 border border-green-500/10 rounded-[1.2rem] flex items-center justify-center hover:bg-green-500 hover:text-black transition-all"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </motion.button>
                    <button onClick={() => handleDelete(con.id)} className="w-14 h-14 flex items-center justify-center bg-white/5 text-white/10 hover:text-red-500 rounded-[1.2rem] transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Modern Modal Design */}
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
                  {editingConsortium ? 'Ajustar' : 'Novo'} Consórcio
                </h2>
                <p className="text-[9px] uppercase font-black tracking-widest text-premium-pink mt-1">Planejamento e Conquista</p>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Titular da Cota</label>
                  <select 
                    className="input-premium appearance-none"
                    required
                    value={selectedClient?.id || ''}
                    onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                  >
                    <option value="">Selecione o perfil...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Cota Total (R$)</label>
                    <input 
                      type="number" 
                      className="input-premium" 
                      placeholder="0,00"
                      required 
                      value={totalValue || ''}
                      onChange={(e) => setTotalValue(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Entrada / Amortização</label>
                    <input 
                      type="number" 
                      className="input-premium" 
                      placeholder="0,00"
                      value={entryValue || ''}
                      onChange={(e) => setEntryValue(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Periodicidade (Meses)</label>
                    <input 
                      type="number" 
                      className="input-premium" 
                      min="1"
                      max="24"
                      required
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Dia de Compromisso</label>
                    <input 
                      type="number" 
                      className="input-premium" 
                      min="1"
                      max="31"
                      required
                      value={dueDay}
                      onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div className="p-6 bg-premium-pink/[0.02] rounded-[1.5rem] border border-premium-pink/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-black text-white/20 tracking-widest">Valor da Parcela Elite:</span>
                    <span className="text-xl font-bold text-premium-pink">
                      {totalValue > 0 ? formatCurrency((totalValue - entryValue) / installmentsCount) : 'R$ 0,00'}
                    </span>
                  </div>
                  <p className="text-[8px] text-white/10 uppercase font-black tracking-widest text-center mt-2">Cronograma Gerado Automaticamente</p>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || !selectedClient}
                  className="btn-premium w-full !py-6 shadow-2xl shadow-premium-pink/20"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar e Iniciar Ciclo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
