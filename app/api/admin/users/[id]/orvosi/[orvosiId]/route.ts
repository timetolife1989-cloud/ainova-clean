// =====================================================
// AINOVA - User Orvosi Detail API
// =====================================================
// Purpose: Egyedi orvosi bejegyzés kezelése
// DELETE: Törlés
// =====================================================

import { NextRequest } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { checkSession, apiSuccess, apiError, ApiErrors, getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';

type RouteParams = { params: Promise<{ id: string; orvosiId: string }> };

// =====================================================
// DELETE - Orvosi bejegyzés törlése
// =====================================================
export async function DELETE(request: NextRequest, context: RouteParams) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    return ApiErrors.forbidden();
  }
  
  try {
    const { id, orvosiId } = await context.params;
    const userId = parseInt(id);
    const orvId = parseInt(orvosiId);
    
    if (isNaN(userId) || isNaN(orvId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.Int, orvId)
      .input('user_id', sql.Int, userId)
      .query(`
        DELETE FROM ainova_user_orvosi 
        WHERE id = @id AND user_id = @user_id
      `);
    
    if (result.rowsAffected[0] === 0) {
      return apiError('Orvosi bejegyzés nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    console.log(`[User Orvosi] Deleted: ${orvId}`);
    
    return apiSuccess({ deleted: true });
    
  } catch (error) {
    console.error('[User Orvosi] Delete error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}
