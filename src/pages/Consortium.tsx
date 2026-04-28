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
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const userId = auth.currentUser.uid;

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
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-semibold text-pink-gradient mb-1">Consórcio</h1>
            <p className="text-white/40 text-sm italic font-light tracking-wide italic">Gestão de parcelas e sonhos.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="w-14 h-14 bg-premium-pink text-white rounded-full shadow-[0_10px_30px_rgba(212,175,55,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
          >
            <Plus className="w-8 h-8 stroke-[3]" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-premium-pink" />
          <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">Carregando consórcios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {consortiums.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
              <CreditCard className="w-12 h-12 text-white/5" />
              <p className="text-white/20 font-display text-xl uppercase tracking-widest italic">Acervo vazio</p>
            </div>
          ) : (
            consortiums.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((con) => {
              const installments = installmentsMap[con.id] || [];
              const paidCount = installments.filter(i => i.status === 'paid').length;
              const isExpanded = expandedId === con.id;

              return (
                <motion.div 
                  layout
                  key={con.id} 
                  className="card-premium group border-white/5 hover:border-premium-pink/20 transition-all duration-500 overflow-hidden"
                >
                  <div 
                    className="flex justify-between items-start mb-6 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : con.id)}
                  >
                    <div>
                      <h3 className="font-display text-2xl text-white group-hover:text-premium-pink transition-colors">{con.clientName}</h3>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mt-1 italic">
                        Início em {new Date(con.startDate || con.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1">Valor Total</p>
                      <p className="font-display text-2xl text-white">R$ {con.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div className="bg-white/[0.03] rounded-2xl p-5 mb-6 border border-white/5">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-black mb-3">
                      <span className="text-white/20">Pagamentos Concluídos</span>
                      <span className="text-premium-pink">
                        {paidCount} de {con.installmentsCount}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-premium-pink transition-all duration-1000" 
                        style={{ width: `${(paidCount / con.installmentsCount) * 100}%` }} 
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-hide py-2"
                      >
                        {installments.map((inst, idx) => (
                          <div key={inst.id} className="flex justify-between items-center p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black text-white/10">{idx + 1}º</span>
                              <div>
                                <p className="text-xs font-bold text-white/80">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</p>
                                <p className="text-[9px] uppercase font-black tracking-widest text-white/20">Vencimento</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-sm font-bold text-white font-display">R$ {inst.value.toFixed(2)}</p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsPaid(con.id, inst.id, inst.value);
                                }}
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                  inst.status === 'paid' 
                                    ? "bg-green-500 text-black shadow-lg shadow-green-500/20" 
                                    : inst.status === 'overdue' || new Date(inst.dueDate) < new Date() ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-white/5 text-white/20 hover:bg-white/10 border border-white/5"
                                )}
                              >
                                <Check className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 pt-6">
                    <button 
                      onClick={() => openEditModal(con)}
                      className="w-12 h-12 flex items-center justify-center bg-white/5 text-white/40 border border-white/5 rounded-xl hover:bg-premium-pink hover:text-black transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => generateConsortiumPDF(con, installments)}
                      className="flex-1 btn-outline py-3 text-[10px] uppercase tracking-widest px-0"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Documento PDF
                    </button>
                    <button 
                       onClick={() => {
                        const text = encodeURIComponent(`Olá ${con.clientName}! Passando para lembrar da sua parcela BC que está próxima do vencimento. Valor: R$ ${(installments.find(i => i.status === 'pending')?.value || 0).toFixed(2)}`);
                        const clientPhone = clients.find(cl => cl.id === con.clientId)?.phone.replace(/\D/g, '');
                        window.open(`https://wa.me/55${clientPhone}?text=${text}`, '_blank');
                      }}
                      className="w-12 h-12 flex items-center justify-center bg-green-500/5 text-green-500 border border-green-500/10 rounded-xl hover:bg-green-500/20 transition-all"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : con.id)} className="w-12 h-12 flex items-center justify-center bg-white/5 text-white/20 border border-white/5 rounded-xl">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Novo Consórcio */}
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

              <h2 className="text-2xl font-semibold mb-6 text-pink-gradient">
                {editingConsortium ? 'Editar Consórcio' : 'Criar Novo Consórcio'}
              </h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs text-white/60 mb-2 block tracking-widest uppercase">Selecionar Cliente</label>
                  <select 
                    className="input-premium"
                    required
                    value={selectedClient?.id || ''}
                    onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                  >
                    <option value="">Selecione o titular...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/60 mb-2 block tracking-widest uppercase">Valor Total (R$)</label>
                    <input 
                      type="number" 
                      className="input-premium" 
                      required 
                      value={totalValue}
                      onChange={(e) => setTotalValue(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-2 block tracking-widest uppercase">Entrada / Pago (R$)</label>
                    <input 
                      type="number" 
                      className="input-premium" 
                      value={entryValue}
                      onChange={(e) => setEntryValue(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/60 mb-2 block tracking-widest uppercase">Núm. Parcelas</label>
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
                  <div>
                    <label className="text-xs text-white/60 mb-2 block tracking-widest uppercase">Dia Vencimento</label>
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

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-white/60">Valor por Parcela:</span>
                    <span className="font-bold text-gold">
                      {totalValue > 0 ? formatCurrency((totalValue - entryValue) / installmentsCount) : 'R$ 0,00'}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 italic">As parcelas serão geradas automaticamente para os próximos meses.</p>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || !selectedClient}
                  className="btn-premium w-full mt-4"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar e Gerar Carnê'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
