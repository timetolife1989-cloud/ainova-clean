// =====================================================================
// AINOVA - Card Component
// =====================================================================
// Purpose: Reusable card wrapper with consistent styling
// Usage: <Card>Content here</Card>
// =====================================================================

import React from 'react';

interface CardProps {
  children:  React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`
        bg-gray-900/50 
        border border-gray-800 
        rounded-lg 
        p-6 
        backdrop-blur-sm
        ${className}
      `}
    >
      {children}
    </div>
  );
}