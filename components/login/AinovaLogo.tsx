'use client';
import { motion } from 'framer-motion';
import React from 'react';

export default function AinovaLogo() {
  return (
    <div className="text-center mb-8">
      {/* AINOVA logo - gradient + pulzálás */}
      <motion.h1
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="text-5xl font-bold tracking-wider bg-gradient-to-r from-blue-300 via-white to-blue-300 bg-clip-text text-transparent"
      >
        AINOVA
      </motion.h1>
      
      {/* Mozaikszó - egy sorban, nagyobb betű */}
      <p className="text-sm text-gray-400 mt-2">
        Advanced Intelligent Network Operations Versatile Analytics
      </p>
    </div>
  );
}
