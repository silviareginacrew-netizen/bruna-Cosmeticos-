import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  Settings, 
  Cloud,
  Minimize2
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ImageUploadControllerProps {
  onUploadComplete: (url: string) => void;
  onClose: () => void;
}

type UploadStatus = 'idle' | 'preparing' | 'uploading' | 'optimizing' | 'saving' | 'completed' | 'error';

export default function ImageUploadController({ onUploadComplete, onClose }: ImageUploadControllerProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const statusMessages: Record<UploadStatus, string> = {
    idle: '📷 Selecione uma imagem',
    preparing: '⏳ Preparando imagem...',
    uploading: '🚀 Enviando para nuvem...',
    optimizing: '☁️ Otimizando imagem...',
    saving: '📦 Finalizando upload...',
    completed: '✔ Upload concluído com sucesso',
    error: '❌ Erro no upload'
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('preparing');
      setProgress(10);

      // 1. Get Auth Parameters from our backend
      const authResponse = await fetch('/api/image-auth');
      if (!authResponse.ok) throw new Error('Falha na autenticação do ImageKit');
      const authData = await authResponse.json();

      setStatus('uploading');
      setProgress(30);

      // 2. Prepare FormData for ImageKit
      const formData = new FormData();
      formData.append('file', file);
      formData.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_z105SGDbqJHY6O2e/RIw7viRVpo=');
      formData.append('signature', authData.signature);
      formData.append('expire', authData.expire.toString());
      formData.append('token', authData.token);
      formData.append('fileName', `bc_product_${Date.now()}`);
      formData.append('folder', '/inventory');

      // 3. Perform Upload
      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Erro ao enviar para ImageKit');
      }

      const result = await uploadResponse.json();

      setStatus('optimizing');
      setProgress(70);
      
      setTimeout(() => {
        setStatus('saving');
        setProgress(90);
        
        setTimeout(() => {
          setStatus('completed');
          setProgress(100);
          
          setTimeout(() => {
            onUploadComplete(result.url);
          }, 1000);
        }, 800);
      }, 800);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Erro desconhecido');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-dark-surface w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-white/10 overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8">
           <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
             <Minimize2 className="w-5 h-5" />
           </button>
        </div>

        <div className="flex flex-col items-center text-center gap-8 py-10 mt-4">
          {/* Animated Icon Container */}
          <div className="relative">
            <div className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center relative z-10 transition-all duration-700",
              status === 'completed' ? "bg-green-500/20 text-green-500" : 
              status === 'error' ? "bg-red-500/20 text-red-500" :
              "bg-premium-pink/10 text-premium-pink"
            )}>
              {status === 'idle' && <Camera className="w-10 h-10" />}
              {status === 'preparing' && <Settings className="w-10 h-10 animate-spin" />}
              {status === 'uploading' && <Upload className="w-10 h-10 animate-bounce" />}
              {status === 'optimizing' && <Cloud className="w-10 h-10 animate-pulse" />}
              {status === 'saving' && <Loader2 className="w-10 h-10 animate-spin" />}
              {status === 'completed' && <CheckCircle2 className="w-10 h-10" />}
              {status === 'error' && <X className="w-10 h-10" />}
            </div>
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full bg-premium-pink/5 animate-ping" />
            <div className="absolute -inset-4 rounded-full bg-premium-pink/5 blur-2xl" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-display font-semibold text-white">
              {statusMessages[status]}
            </h3>
            <p className="text-white/40 text-xs tracking-[0.2em] font-black uppercase">
              {status === 'error' ? errorMessage : 'Processamento Seguro BC'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-4">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={cn(
                  "h-full transition-all duration-500",
                  status === 'error' ? "bg-red-500" : "bg-premium-pink"
                )}
                style={{ 
                  boxShadow: status === 'error' ? '0 0 15px rgba(239, 68, 68, 0.5)' : '0 0 15px rgba(236, 72, 153, 0.5)'
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-white/20">
              <span>Status</span>
              <span>{progress}%</span>
            </div>
          </div>

          {status === 'idle' && (
            <div className="relative w-full">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFile}
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
              />
              <button className="btn-premium w-full flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" />
                Selecionar Foto
              </button>
            </div>
          )}

          {status === 'error' && (
            <button onClick={() => setStatus('idle')} className="btn-outline w-full py-4 text-xs font-bold uppercase tracking-widest">
              Tentar Novamente
            </button>
          )}

          {status === 'completed' && (
             <p className="text-green-500 text-xs font-bold uppercase tracking-widest animate-bounce">
               Perfeito! Imagem otimizada.
             </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function X(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
