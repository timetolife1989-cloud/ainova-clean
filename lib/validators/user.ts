// =====================================================
// AINOVA - User Validators
// =====================================================
// Újrafelhasználható validációs logika kliens és szerver oldalon
// =====================================================

import { PASSWORD_MIN_LENGTH, USERNAME_MIN_LENGTH, POSITIONS, SHIFTS } from '@/lib/constants';
import type { CreateUserPayload, UpdateUserPayload, UserRole, Shift } from '@/lib/types/admin';

// Validációs eredmény típus
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// =====================================================
// EGYEDI MEZŐ VALIDÁTOROK
// =====================================================

/**
 * Törzsszám (username) validáció
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Törzsszám megadása kötelező' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { isValid: false, error: `Törzsszám minimum ${USERNAME_MIN_LENGTH} karakter` };
  }
  
  // Csak alfanumerikus és kötőjel
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Törzsszám csak betűt, számot és kötőjelet tartalmazhat' };
  }
  
  return { isValid: true };
}

/**
 * Teljes név validáció
 */
export function validateFullName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Név megadása kötelező' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Név minimum 2 karakter' };
  }
  
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Név maximum 200 karakter' };
  }
  
  return { isValid: true };
}

/**
 * Jelszó validáció
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Jelszó megadása kötelező' };
  }
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { isValid: false, error: `Jelszó minimum ${PASSWORD_MIN_LENGTH} karakter` };
  }
  
  // Legalább 1 nagybetű, 1 kisbetű, 1 szám
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Jelszó tartalmazzon nagy-, kisbetűt és számot' };
  }
  
  return { isValid: true };
}

/**
 * Szerepkör (pozíció) validáció
 */
export function validateRole(role: string): { isValid: boolean; error?: string } {
  if (!role || typeof role !== 'string') {
    return { isValid: false, error: 'Pozíció megadása kötelező' };
  }
  
  const validRoles = POSITIONS.map(p => p.value);
  if (!validRoles.includes(role as UserRole)) {
    return { isValid: false, error: 'Érvénytelen pozíció' };
  }
  
  return { isValid: true };
}

/**
 * Műszak validáció
 */
export function validateShift(shift: Shift): { isValid: boolean; error?: string } {
  // null érték megengedett (nincs műszak)
  if (shift === null || shift === undefined) {
    return { isValid: true };
  }
  
  const validShifts = SHIFTS.map(s => s.value).filter(v => v !== null);
  if (!validShifts.includes(shift)) {
    return { isValid: false, error: 'Érvénytelen műszak' };
  }
  
  return { isValid: true };
}

/**
 * Email validáció (opcionális mező)
 */
export function validateEmail(email: string | null | undefined): { isValid: boolean; error?: string } {
  // Üres érték megengedett
  if (!email || email.trim() === '') {
    return { isValid: true };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Érvénytelen email formátum' };
  }
  
  return { isValid: true };
}

// =====================================================
// KOMPLEX VALIDÁTOROK (Payload szintű)
// =====================================================

/**
 * Új felhasználó létrehozás validáció
 */
export function validateCreateUser(data: Partial<CreateUserPayload>): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Username
  const usernameResult = validateUsername(data.username || '');
  if (!usernameResult.isValid) {
    errors.username = usernameResult.error!;
  }
  
  // Name
  const nameResult = validateFullName(data.name || '');
  if (!nameResult.isValid) {
    errors.name = nameResult.error!;
  }
  
  // Password
  const passwordResult = validatePassword(data.password || '');
  if (!passwordResult.isValid) {
    errors.password = passwordResult.error!;
  }
  
  // Role
  const roleResult = validateRole(data.role || '');
  if (!roleResult.isValid) {
    errors.role = roleResult.error!;
  }
  
  // Shift (opcionális)
  const shiftResult = validateShift(data.shift as Shift);
  if (!shiftResult.isValid) {
    errors.shift = shiftResult.error!;
  }
  
  // Email (opcionális)
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error!;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Felhasználó módosítás validáció
 * Csak a megadott mezőket validáljuk
 */
export function validateUpdateUser(data: Partial<UpdateUserPayload>): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Username (ha megadva)
  if (data.username !== undefined) {
    const usernameResult = validateUsername(data.username);
    if (!usernameResult.isValid) {
      errors.username = usernameResult.error!;
    }
  }
  
  // Name (ha megadva)
  if (data.name !== undefined) {
    const nameResult = validateFullName(data.name);
    if (!nameResult.isValid) {
      errors.name = nameResult.error!;
    }
  }
  
  // Role (ha megadva)
  if (data.role !== undefined) {
    const roleResult = validateRole(data.role);
    if (!roleResult.isValid) {
      errors.role = roleResult.error!;
    }
  }
  
  // Shift (ha megadva)
  if (data.shift !== undefined) {
    const shiftResult = validateShift(data.shift as Shift);
    if (!shiftResult.isValid) {
      errors.shift = shiftResult.error!;
    }
  }
  
  // Email (ha megadva)
  if (data.email !== undefined) {
    const emailResult = validateEmail(data.email);
    if (!emailResult.isValid) {
      errors.email = emailResult.error!;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// =====================================================
// HELPER FÜGGVÉNYEK
// =====================================================

/**
 * Validációs hibák olvasható formátumba
 */
export function formatValidationErrors(errors: Record<string, string>): string {
  return Object.values(errors).join('. ');
}
