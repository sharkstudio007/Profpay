import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-[#050505] flex items-center justify-center overflow-hidden font-sans selection:bg-white selection:text-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Subtle animated background glow */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="absolute top-1/3 left-1/3 w-96 h-96 bg-white/5 rounded-full filter blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-white/5 rounded-full filter blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.8,
          ease: 'easeOut',
        }}
      >
        {/* Logo container matching app style */}
        <motion.div
          className="mb-8 flex justify-center"
          animate={{ y: [0, -12, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.div
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Calculator size={32} />
          </motion.div>
        </motion.div>

        {/* App name */}
        <motion.h1
          className="text-5xl font-display font-bold text-white mb-2 tracking-tighter"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          ProfPay
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-slate-500 text-sm mb-12 tracking-widest font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Gestion simplifiée pour professeurs
        </motion.p>

        {/* Loading dots - subtle */}
        <motion.div className="flex justify-center gap-3 mb-12">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-1.5 h-1.5 bg-white/40 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            />
          ))}
        </motion.div>

        {/* Watermark */}
        <motion.div
          className="text-slate-600 text-sm font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Created by <span className="text-slate-400">Mohamed Redissi</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
