// =====================================================
// AINOVA - Admin Types
// =====================================================
// Központosított típusdefiníciók az admin modulhoz
// =====================================================

/**
 * Felhasználó szerepkörök (pozíciók)
 * Sync: AinovaUsers.Role SQL constraint
 */
export type UserRole = 
  | 'Admin'
  | 'Manager'
  | 'Műszakvezető'
  | 'Műszakvezető helyettes'
  | 'NPI Technikus'
  | 'Operátor';

/**
 * Műszak típusok
 */
export type Shift = 'A' | 'B' | 'C' | null;

/**
 * Felhasználó adatbázis rekord
 */
export interface User {
  id: number;
  username: string;      // Törzsszám
  fullName: string;
  role: UserRole;
  shift: Shift;
  email: string | null;
  telefon: string | null;
  torzsszam: string | null;  // Ha van operátor törzsszám is
  // Jogosítványok
  jogsi_gyalog_targonca: boolean;
  jogsi_forgo_daru: boolean;
  jogsi_futo_daru: boolean;
  jogsi_newton_emelo: boolean;
  // Orvosi
  orvosi_kezdete: string | null;
  orvosi_lejarat: string | null;
  orvosi_poziciok: string | null;
  // Státusz
  isActive: boolean;
  firstLogin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Felhasználó lista elem (táblázathoz)
 */
export interface UserListItem {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  shift: Shift;
  email: string | null;
  telefon: string | null;
  // Jogosítványok
  jogsi_gyalog_targonca: boolean;
  jogsi_forgo_daru: boolean;
  jogsi_futo_daru: boolean;
  jogsi_newton_emelo: boolean;
  // Orvosi
  orvosi_lejarat: string | null;
  orvosi_poziciok: string | null;
  // Státusz
  isActive: boolean;
  createdAt: string;
}

/**
 * Felhasználó létrehozás payload
 */
export interface CreateUserPayload {
  username: string;
  name: string;
  password: string;
  role: UserRole;
  shift: Shift;
  email?: string;
}

/**
 * Felhasználó módosítás payload
 */
export interface UpdateUserPayload {
  username?: string;
  name?: string;
  role?: UserRole;
  shift?: Shift;
  email?: string;
  telefon?: string;
  // Jogosítványok
  jogsi_gyalog_targonca?: boolean;
  jogsi_forgo_daru?: boolean;
  jogsi_futo_daru?: boolean;
  jogsi_newton_emelo?: boolean;
  // Orvosi
  orvosi_kezdete?: string;
  orvosi_lejarat?: string;
  orvosi_poziciok?: string;
  isActive?: boolean;
}

/**
 * Jelszó reset payload
 */
export interface ResetPasswordPayload {
  newPassword: string;
}

/**
 * API válasz típusok
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  validationErrors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Szűrő opciók a felhasználó listához
 */
export interface UserFilters {
  search?: string;       // Törzsszám vagy név keresés
  role?: UserRole | '';
  shift?: Shift | '';
  isActive?: boolean | '';
  page?: number;
  pageSize?: number;
}
