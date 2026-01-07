'use client';
import { useState } from 'react';

interface UserFormProps {
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
}

export interface UserFormData {
  username: string;       // Törzsszám
  name: string;           // Teljes név
  password: string;
  role: 'Admin' | 'Manager' | 'Műszakvezető' | 'Műszakvezető helyettes' | 'NPI Technikus' | 'Operátor';
  shift: 'A' | 'B' | 'C' | null;  // Műszak
  email?: string;
}

const SHIFTS = [
  { value: 'A', label: 'A műszak', color: 'bg-blue-600' },
  { value: 'B', label: 'B műszak', color: 'bg-green-600' },
  { value: 'C', label: 'C műszak', color: 'bg-orange-600' },
  { value: null, label: 'Nincs műszakbeosztás', color: 'bg-gray-600' },
];

// Pozíciók (SQL constraint-nek megfelelően)
const ROLES = [
  { value: 'Admin', label: 'Admin', color: 'bg-purple-600' },
  { value: 'Manager', label: 'Manager', color: 'bg-indigo-600' },
  { value: 'Műszakvezető', label: 'Műszakvezető', color: 'bg-blue-600' },
  { value: 'Műszakvezető helyettes', label: 'Műszakvezető helyettes', color: 'bg-cyan-600' },
  { value: 'NPI Technikus', label: 'NPI Technikus', color: 'bg-orange-600' },
  { value: 'Operátor', label: 'Operátor', color: 'bg-green-600' },
];

export default function UserForm({ onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    name: '',
    password: '',
    role: 'Operátor',
    shift: null,
    email: '',
  });

  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time validation
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'username':
        if (!value) return 'Törzsszám kötelező';
        if (value.length < 3) return 'Minimum 3 karakter szükséges';
        return '';
      case 'name':
        if (!value) return 'Teljes név kötelező';
        return '';
      case 'password':
        if (!value) return 'Jelszó kötelező';
        if (value.length < 8) return 'Minimum 8 karakter szükséges';
        return '';
      case 'passwordConfirm':
        if (!value) return 'Jelszó megerősítés kötelező';
        if (value !== formData.password) return 'A jelszavak nem egyeznek';
        return '';
      case 'role':
        if (!value) return 'Pozíció kötelező';
        return '';
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Érvénytelen email cím';
        }
        return '';
      default:
        return '';
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (name: string, value: string) => {
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handlePasswordConfirmChange = (value: string) => {
    setPasswordConfirm(value);
    if (errors.passwordConfirm) {
      setErrors(prev => ({ ...prev, passwordConfirm: '' }));
    }
  };

  const handlePasswordConfirmBlur = () => {
    const error = validateField('passwordConfirm', passwordConfirm);
    if (error) {
      setErrors(prev => ({ ...prev, passwordConfirm: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    newErrors.username = validateField('username', formData.username);
    newErrors.name = validateField('name', formData.name);
    newErrors.password = validateField('password', formData.password);
    newErrors.passwordConfirm = validateField('passwordConfirm', passwordConfirm);
    newErrors.email = validateField('email', formData.email || '');

    // Remove empty errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Törzsszám */}
      <div>
        <label className="block text-sm text-gray-300 font-medium mb-2">
          Törzsszám *
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
          onBlur={(e) => handleBlur('username', e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          placeholder="pl. 30008047"
        />
        {errors.username && (
          <p className="text-red-400 text-xs mt-1">{errors.username}</p>
        )}
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm text-gray-300 font-medium mb-2">
          Teljes név *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={(e) => handleBlur('name', e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          placeholder="pl. Kovács János"
        />
        {errors.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm text-gray-300 font-medium mb-2">
          Jelszó *
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={(e) => handleBlur('password', e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent pr-12"
            placeholder="Minimum 8 karakter"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {showPassword ? '👁️' : '👁️'}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-400 text-xs mt-1">{errors.password}</p>
        )}
      </div>

      {/* Password Confirm */}
      <div>
        <label className="block text-sm text-gray-300 font-medium mb-2">
          Jelszó megerősítése *
        </label>
        <div className="relative">
          <input
            type={showPasswordConfirm ? 'text' : 'password'}
            value={passwordConfirm}
            onChange={(e) => handlePasswordConfirmChange(e.target.value)}
            onBlur={handlePasswordConfirmBlur}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent pr-12"
            placeholder="Írd be újra a jelszót"
          />
          <button
            type="button"
            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {showPasswordConfirm ? '👁️' : '👁️'}
          </button>
        </div>
        {errors.passwordConfirm && (
          <p className="text-red-400 text-xs mt-1">{errors.passwordConfirm}</p>
        )}
      </div>

      {/* Pozíció */}
      <div>
        <label className="block text-sm text-gray-300 font-medium mb-2">
          Pozíció *
        </label>
        <select
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        >
          {ROLES.map(role => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {/* Shift */}
      <div>
        <label className="block text-sm text-gray-300 font-medium mb-2">
          Műszak
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SHIFTS.map(shift => (
            <button
              key={shift.value ?? 'none'}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, shift: shift.value as 'A' | 'B' | 'C' | null }))}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                formData.shift === shift.value
                  ? `${shift.color} text-white ring-2 ring-white/30`
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              {shift.label}
            </button>
          ))}
        </div>
      </div>

      {/* Email (optional) */}
      <div>
        <label className="block text-sm text-gray-300 font-medium mb-2">
          Email cím (opcionális)
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={(e) => handleBlur('email', e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          placeholder="pl. jkovacs@ainova.hu"
        />
        {errors.email && (
          <p className="text-red-400 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Mentés...' : 'Mentés'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Mégse
        </button>
      </div>
    </form>
  );
}
