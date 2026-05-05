import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-7xl',
    xl: 'text-9xl',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center font-display select-none group", className)}>
      <div className={cn("relative flex items-center justify-center tracking-tighter", sizeClasses[size])}>
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-white font-medium italic"
        >
          B
        </motion.span>
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="text-premium-pink font-bold italic -ml-3"
        >
          C
        </motion.span>
        
        {/* Gold Accent Dot */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.8 }}
          className="absolute -right-2 top-1/2 w-2 h-2 rounded-full bg-premium-gold shadow-[0_0_8px_rgba(203,161,53,0.8)]"
        />

        <div className="absolute -inset-4 bg-premium-pink/5 blur-3xl rounded-full -z-10 group-hover:bg-premium-pink/10 transition-colors duration-1000" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="text-[0.45em] tracking-[0.6em] uppercase text-white mt-4 font-sans font-black whitespace-nowrap"
      >
        Bruna Cosméticos
      </motion.div>
    </div>
  );
}
