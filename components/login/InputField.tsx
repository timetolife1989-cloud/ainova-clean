'use client';
import React from 'react';

interface InputFieldProps {
  label: string;
  type: 'text' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function InputField({ label, type, value, onChange, placeholder }: InputFieldProps) {
  return (
    <div className="mb-5">
      {/* Label - JAVÍTOTT olvashatóság (text-sm, text-gray-300, font-medium) */}
      <label className="block text-sm text-gray-300 font-medium mb-2">
        {label}
      </label>
      
      {/* Input field */}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
      />
    </div>
  );
}
