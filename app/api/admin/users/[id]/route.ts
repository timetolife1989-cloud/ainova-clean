// =====================================================
// AINOVA - Admin User [id] API
// =====================================================
// GET    - Egy felhasználó adatainak lekérése
// PATCH  - Felhasználó módosítása
// DELETE - Felhasználó törlése/deaktiválása
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { validateUpdateUser, formatValidationErrors } from '@/lib/validators/user';
import { getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';

export const runtime = 'nodejs';

// Route paraméter típus
interface RouteParams {
  params: Promise<{ id: string }>;
}

// =====================================================
// GET - Egy felhasználó adatainak lekérése
// =====================================================
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Érvénytelen felhasználó azonosító',
      }, { status: 400 });
    }

    const pool = await getPool();
    
    // Ellenőrizzük mely oszlopok léteznek
    const colCheck = await pool.request().query(`
      SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers')
    `);
    const existingCols = colCheck.recordset.map((r: { name: string }) => r.name.toLowerCase());
    const hasTelefon = existingCols.includes('telefon');
    const hasTorzsszam = existingCols.includes('torzsszam');
    const hasJogsi = existingCols.includes('jogsi_gyalog_targonca');
    const hasOrvosi = existingCols.includes('orvosi_kezdete');
    
    const selectFields = [
      'UserId as id',
      'Username as username',
      'FullName as fullName',
      'Role as role',
      'Shift as shift',
      'Email as email',
      hasTelefon ? 'telefon' : 'NULL as telefon',
      hasTorzsszam ? 'torzsszam' : 'NULL as torzsszam',
      hasJogsi ? 'jogsi_gyalog_targonca' : '0 as jogsi_gyalog_targonca',
      hasJogsi ? 'jogsi_forgo_daru' : '0 as jogsi_forgo_daru',
      hasJogsi ? 'jogsi_futo_daru' : '0 as jogsi_futo_daru',
      hasJogsi ? 'jogsi_newton_emelo' : '0 as jogsi_newton_emelo',
      hasOrvosi ? 'orvosi_kezdete' : 'NULL as orvosi_kezdete',
      hasOrvosi ? 'orvosi_lejarat' : 'NULL as orvosi_lejarat',
      hasOrvosi ? 'orvosi_poziciok' : 'NULL as orvosi_poziciok',
      'IsActive as isActive',
      'FirstLogin as firstLogin',
      'CreatedAt as createdAt',
      'UpdatedAt as updatedAt'
    ];
    
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT ${selectFields.join(', ')}
        FROM dbo.AinovaUsers
        WHERE UserId = @userId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Felhasználó nem található',
      }, { status: 404 });
    }

    const user = result.recordset[0];

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        shift: user.shift,
        email: user.email,
        telefon: user.telefon,
        torzsszam: user.torzsszam,
        jogsi_gyalog_targonca: !!user.jogsi_gyalog_targonca,
        jogsi_forgo_daru: !!user.jogsi_forgo_daru,
        jogsi_futo_daru: !!user.jogsi_futo_daru,
        jogsi_newton_emelo: !!user.jogsi_newton_emelo,
        orvosi_kezdete: user.orvosi_kezdete,
        orvosi_lejarat: user.orvosi_lejarat,
        orvosi_poziciok: user.orvosi_poziciok,
        isActive: user.isActive,
        firstLogin: user.firstLogin,
        createdAt: user.createdAt?.toISOString(),
        updatedAt: user.updatedAt?.toISOString(),
      },
    });

  } catch (error) {
    console.error('[Admin User] GET error:', getErrorMessage(error));
    return NextResponse.json({
      success: false,
      error: 'Hiba történt a felhasználó lekérésekor',
    }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}

// =====================================================
// PATCH - Felhasználó módosítása
// =====================================================
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Érvénytelen felhasználó azonosító',
      }, { status: 400 });
    }

    const data = await request.json();
    const pool = await getPool();

    // Ellenőrizzük, hogy létezik-e a felhasználó
    const existingResult = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`SELECT UserId, Username FROM dbo.AinovaUsers WHERE UserId = @userId`);

    if (existingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Felhasználó nem található',
      }, { status: 404 });
    }

    const existingUser = existingResult.recordset[0];
    const oldUsername = existingUser.Username;

    // Validáció
    const validation = validateUpdateUser(data);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: formatValidationErrors(validation.errors),
        validationErrors: validation.errors,
      }, { status: 400 });
    }

    // Ha username változik, ellenőrizzük a duplikációt
    if (data.username && data.username.trim() !== oldUsername) {
      const duplicateCheck = await pool
        .request()
        .input('username', sql.NVarChar(100), data.username.trim())
        .input('userId', sql.Int, userId)
        .query(`SELECT UserId FROM dbo.AinovaUsers WHERE Username = @username AND UserId != @userId`);

      if (duplicateCheck.recordset.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Ez a törzsszám már foglalt',
        }, { status: 409 });
      }
    }

    // Ha email változik, ellenőrizzük a duplikációt
    if (data.email?.trim()) {
      const emailCheck = await pool
        .request()
        .input('email', sql.NVarChar(255), data.email.trim())
        .input('userId', sql.Int, userId)
        .query(`SELECT UserId FROM dbo.AinovaUsers WHERE Email = @email AND UserId != @userId`);

      if (emailCheck.recordset.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Ez az email cím már használatban van',
        }, { status: 409 });
      }
    }

    // Dinamikus UPDATE építése
    const updates: string[] = ['UpdatedAt = SYSDATETIME()'];
    const updateRequest = pool.request().input('userId', sql.Int, userId);

    if (data.username !== undefined) {
      updates.push('Username = @username');
      updateRequest.input('username', sql.NVarChar(100), data.username.trim());
    }

    if (data.name !== undefined) {
      updates.push('FullName = @fullName');
      updateRequest.input('fullName', sql.NVarChar(200), data.name.trim());
    }

    if (data.role !== undefined) {
      updates.push('Role = @role');
      updateRequest.input('role', sql.NVarChar(50), data.role);
    }

    if (data.shift !== undefined) {
      updates.push('Shift = @shift');
      updateRequest.input('shift', sql.NVarChar(10), data.shift || null);
    }

    if (data.email !== undefined) {
      updates.push('Email = @email');
      updateRequest.input('email', sql.NVarChar(255), data.email?.trim() || null);
    }

    if (data.isActive !== undefined) {
      updates.push('IsActive = @isActive');
      updateRequest.input('isActive', sql.Bit, data.isActive ? 1 : 0);
    }

    // Ellenőrizzük mely oszlopok léteznek
    const colCheck = await pool.request().query(`
      SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers')
    `);
    const existingCols = colCheck.recordset.map((r: { name: string }) => r.name.toLowerCase());
    
    // Új mezők - telefon (csak ha létezik)
    if (data.telefon !== undefined && existingCols.includes('telefon')) {
      updates.push('telefon = @telefon');
      updateRequest.input('telefon', sql.NVarChar(20), data.telefon?.trim() || null);
    }

    // Jogosítványok (csak ha léteznek)
    if (data.jogsi_gyalog_targonca !== undefined && existingCols.includes('jogsi_gyalog_targonca')) {
      updates.push('jogsi_gyalog_targonca = @jogsi_gyalog_targonca');
      updateRequest.input('jogsi_gyalog_targonca', sql.Bit, data.jogsi_gyalog_targonca ? 1 : 0);
    }
    if (data.jogsi_forgo_daru !== undefined && existingCols.includes('jogsi_forgo_daru')) {
      updates.push('jogsi_forgo_daru = @jogsi_forgo_daru');
      updateRequest.input('jogsi_forgo_daru', sql.Bit, data.jogsi_forgo_daru ? 1 : 0);
    }
    if (data.jogsi_futo_daru !== undefined && existingCols.includes('jogsi_futo_daru')) {
      updates.push('jogsi_futo_daru = @jogsi_futo_daru');
      updateRequest.input('jogsi_futo_daru', sql.Bit, data.jogsi_futo_daru ? 1 : 0);
    }
    if (data.jogsi_newton_emelo !== undefined && existingCols.includes('jogsi_newton_emelo')) {
      updates.push('jogsi_newton_emelo = @jogsi_newton_emelo');
      updateRequest.input('jogsi_newton_emelo', sql.Bit, data.jogsi_newton_emelo ? 1 : 0);
    }

    // Orvosi (csak ha léteznek)
    if (data.orvosi_kezdete !== undefined && existingCols.includes('orvosi_kezdete')) {
      updates.push('orvosi_kezdete = @orvosi_kezdete');
      updateRequest.input('orvosi_kezdete', sql.Date, data.orvosi_kezdete || null);
    }
    if (data.orvosi_lejarat !== undefined && existingCols.includes('orvosi_lejarat')) {
      updates.push('orvosi_lejarat = @orvosi_lejarat');
      updateRequest.input('orvosi_lejarat', sql.Date, data.orvosi_lejarat || null);
    }
    if (data.orvosi_poziciok !== undefined && existingCols.includes('orvosi_poziciok')) {
      updates.push('orvosi_poziciok = @orvosi_poziciok');
      updateRequest.input('orvosi_poziciok', sql.NVarChar(500), data.orvosi_poziciok || null);
    }

    // Update végrehajtása
    const updateResult = await updateRequest.query(`
      UPDATE dbo.AinovaUsers
      SET ${updates.join(', ')}
      OUTPUT 
        INSERTED.UserId as id,
        INSERTED.Username as username,
        INSERTED.FullName as fullName,
        INSERTED.Role as role,
        INSERTED.Shift as shift,
        INSERTED.Email as email,
        INSERTED.IsActive as isActive
      WHERE UserId = @userId
    `);

    const updatedUser = updateResult.recordset[0];

    // Ha törzsszám változott, frissítjük a teljesítmény táblában is
    if (data.username && data.username.trim() !== oldUsername) {
      await pool
        .request()
        .input('oldUsername', sql.NVarChar(100), oldUsername)
        .input('newUsername', sql.NVarChar(100), data.username.trim())
        .query(`
          UPDATE dbo.ainova_teljesitmeny 
          SET torzsszam = @newUsername 
          WHERE torzsszam = @oldUsername
        `);

      console.log(`[Admin] Username cascade update: ${oldUsername} -> ${data.username.trim()}`);
    }

    console.log(`[Admin] User updated: ${updatedUser.username} (ID: ${userId})`);

    return NextResponse.json({
      success: true,
      message: 'Felhasználó sikeresen módosítva!',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        shift: updatedUser.shift,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      },
    });

  } catch (error) {
    console.error('[Admin User] PATCH error:', getErrorMessage(error));
    return NextResponse.json({
      success: false,
      error: 'Hiba történt a felhasználó módosításakor',
    }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}

// =====================================================
// DELETE - Felhasználó törlése
// =====================================================
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Érvénytelen felhasználó azonosító',
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    const pool = await getPool();

    // Ellenőrizzük, hogy létezik-e a felhasználó
    const existingResult = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`SELECT UserId, Username, Role FROM dbo.AinovaUsers WHERE UserId = @userId`);

    if (existingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Felhasználó nem található',
      }, { status: 404 });
    }

    const user = existingResult.recordset[0];

    // Admin felhasználó nem törölhető (biztonsági ellenőrzés)
    if (user.Role === 'Admin') {
      // Ellenőrizzük, hány admin van
      const adminCount = await pool.request().query(`
        SELECT COUNT(*) as cnt FROM dbo.AinovaUsers WHERE Role = 'Admin' AND IsActive = 1
      `);

      if (adminCount.recordset[0].cnt <= 1) {
        return NextResponse.json({
          success: false,
          error: 'Az utolsó admin felhasználó nem törölhető',
        }, { status: 403 });
      }
    }

    if (hardDelete) {
      // Hard delete - véglegesen töröljük
      // Először ellenőrizzük, van-e kapcsolódó adat
      const relatedData = await pool
        .request()
        .input('username', sql.NVarChar(100), user.Username)
        .query(`SELECT COUNT(*) as cnt FROM dbo.ainova_teljesitmeny WHERE torzsszam = @username`);

      if (relatedData.recordset[0].cnt > 0) {
        return NextResponse.json({
          success: false,
          error: `A felhasználóhoz ${relatedData.recordset[0].cnt} teljesítmény rekord tartozik. Használj soft delete-et (deaktiválás).`,
        }, { status: 400 });
      }

      await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`DELETE FROM dbo.AinovaUsers WHERE UserId = @userId`);

      console.log(`[Admin] User hard deleted: ${user.Username} (ID: ${userId})`);

      return NextResponse.json({
        success: true,
        message: 'Felhasználó véglegesen törölve!',
      });

    } else {
      // Soft delete - deaktiválás
      await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
          UPDATE dbo.AinovaUsers 
          SET IsActive = 0, UpdatedAt = SYSDATETIME() 
          WHERE UserId = @userId
        `);

      console.log(`[Admin] User deactivated: ${user.Username} (ID: ${userId})`);

      return NextResponse.json({
        success: true,
        message: 'Felhasználó deaktiválva!',
      });
    }

  } catch (error) {
    console.error('[Admin User] DELETE error:', getErrorMessage(error));
    return NextResponse.json({
      success: false,
      error: 'Hiba történt a felhasználó törlésekor',
    }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}
