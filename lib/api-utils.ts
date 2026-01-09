// =====================================================
// AINOVA - API Utility Functions
// =====================================================
// Központi API segédfüggvények: error handling, response formázás
// =====================================================

import { NextResponse } from 'next/server';

// =====================================================
// Típusok
// =====================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// HTTP státusz kódok
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// =====================================================
// Error Handling
// =====================================================

/**
 * Biztonságos error message kinyerés
 * Kerüli az `error: any` típust
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Ismeretlen hiba történt';
}

/**
 * API hiba response létrehozása
 */
export function apiError(
  message: string,
  status: number = HTTP_STATUS.INTERNAL_ERROR,
  options?: { code?: string; details?: string }
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      ...(options?.code && { code: options.code }),
      ...(options?.details && { details: options.details }),
    },
    { status }
  );
}

/**
 * API sikeres response létrehozása
 */
export function apiSuccess<T>(
  data?: T,
  options?: { message?: string; status?: number }
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      ...(data !== undefined && { data }),
      ...(options?.message && { message: options.message }),
    },
    { status: options?.status ?? HTTP_STATUS.OK }
  );
}

// =====================================================
// Gyakori hibák
// =====================================================

export const ApiErrors = {
  unauthorized: () => apiError('Nincs bejelentkezve', HTTP_STATUS.UNAUTHORIZED),
  invalidSession: () => apiError('Érvénytelen munkamenet', HTTP_STATUS.UNAUTHORIZED),
  forbidden: () => apiError('Nincs jogosultság', HTTP_STATUS.FORBIDDEN),
  notFound: (resource = 'Erőforrás') => apiError(`${resource} nem található`, HTTP_STATUS.NOT_FOUND),
  badRequest: (message: string) => apiError(message, HTTP_STATUS.BAD_REQUEST),
  conflict: (message: string) => apiError(message, HTTP_STATUS.CONFLICT),
  internal: (error: unknown, context?: string) => {
    const message = getErrorMessage(error);
    console.error(`[API Error]${context ? ` ${context}:` : ''}`, error);
    return apiError('Szerver hiba történt', HTTP_STATUS.INTERNAL_ERROR, { details: message });
  },
} as const;

// =====================================================
// Session ellenőrzés helper
// =====================================================

import { validateSession } from './auth';
import { NextRequest } from 'next/server';

export interface SessionCheckResult {
  valid: true;
  userId: number;
  username: string;
  fullName: string;
  role: string;
}

export interface SessionCheckError {
  valid: false;
  response: NextResponse<ApiErrorResponse>;
}

/**
 * Session ellenőrzés egyszerűsítve
 * Használat: 
 * const session = await checkSession(request);
 * if (!session.valid) return session.response;
 */
export async function checkSession(
  request: NextRequest
): Promise<SessionCheckResult | SessionCheckError> {
  const sessionId = request.cookies.get('sessionId')?.value;
  
  if (!sessionId) {
    return { valid: false, response: ApiErrors.unauthorized() };
  }

  const session = await validateSession(sessionId);
  
  if (!session) {
    return { valid: false, response: ApiErrors.invalidSession() };
  }

  return {
    valid: true,
    userId: session.userId,
    username: session.username,
    fullName: session.fullName,
    role: session.role,
  };
}
