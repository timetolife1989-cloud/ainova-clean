import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { checkSession, ApiErrors } from '@/lib/api-utils';

const OPERATIV_POZICIOK = [
  'Huzalos tekercselő', 'Fóliás tekercselő', 'Előkészítő',
  'LaC szerelő', 'Lézervágó', 'Maró-ónozó', 'DC szerelő',
  'Mérő', 'Impregnáló', 'Végszerelő', 'Csomagoló'
];

const NEM_OPERATIV_POZICIOK = [
  'Műszakvezető', 'Előmunkás', 'Gyártásszervező', 'Minőségellenőr'
];

const KRITIKUS_POZICIOK = ['Mérő', 'Csomagoló', 'Minőségellenőr'];

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

export async function GET(request: NextRequest) {
  let pool: sql.ConnectionPool | null = null;

  try {
    // Session ellenőrzés
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const { searchParams } = new URL(request.url);
    const datum = searchParams.get('datum');
    const muszak = searchParams.get('muszak');

    if (!datum || !muszak) {
      return ApiErrors.badRequest('Hiányzó dátum vagy műszak paraméter');
    }

    if (!['A', 'B', 'C'].includes(muszak)) {
      return ApiErrors.badRequest('Érvénytelen műszak (A, B vagy C lehet)');
    }

    pool = await getPool();

    const result = await pool.request()
      .input('datum', sql.Date, datum)
      .input('muszak', sql.Char(1), muszak)
      .query(`
        SELECT 
          l.id,
          l.datum,
          l.muszak,
          l.pozicio,
          l.pozicio_tipus,
          l.is_kritikus,
          l.megjelent,
          l.tappenz,
          l.szabadsag,
          l.brutto_letszam,
          l.netto_letszam,
          l.hianyzas_fo,
          l.hianyzas_percent,
          l.leadasi_cel_perc,
          l.indoklas_miert,
          l.indoklas_meddig,
          l.indoklas_terv,
          l.rogzitette_user,
          l.rogzitette_datum,
          u.FullName AS rogzitette_fullname,
          u.Role AS rogzitette_role,
          u.Shift AS rogzitette_shift,
          u.Email AS rogzitette_email
        FROM ainova_letszam l
        LEFT JOIN AinovaUsers u ON l.rogzitette_user = u.Username
        WHERE l.datum = @datum AND l.muszak = @muszak
        ORDER BY 
          CASE l.pozicio_tipus WHEN 'operativ' THEN 1 ELSE 2 END,
          l.pozicio
      `);

      if (result.recordset.length === 0) {
      return NextResponse.json({
        success: true,
        isEmpty: true,
        data: [],
        message: 'No data found for this date/shift'
      });
    }

    return NextResponse.json({
      success: true,
      isEmpty: false,
      data: result.recordset
    });

  } catch (error) {
    return ApiErrors.internal(error, 'Létszám GET');
  }
}

export async function POST(request: NextRequest) {
  let pool: sql.ConnectionPool | null = null;
  let transaction: sql.Transaction | null = null;

  try {
    // Session ellenőrzés
    const sessionCheck = await checkSession(request);
    if (!sessionCheck.valid) return sessionCheck.response;

    const body = await request.json();
    const { datum, muszak, operativ, nemOperativ, indoklasok, riportKoteles } = body;

    if (!datum || !muszak) {
      return ApiErrors.badRequest('Hiányzó dátum vagy műszak');
    }

    if (!['A', 'B', 'C'].includes(muszak)) {
      return ApiErrors.badRequest('Érvénytelen műszak (A, B vagy C lehet)');
    }

    if (!Array.isArray(operativ) || !Array.isArray(nemOperativ)) {
      return ApiErrors.badRequest('operativ és nemOperativ tömbök szükségesek');
    }

    pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const clientIP = getClientIP(request);
    const username = sessionCheck.username;

    const existingResult = await new sql.Request(transaction)
      .input('datum', sql.Date, datum)
      .input('muszak', sql.Char(1), muszak)
      .query(`
        SELECT pozicio, megjelent, tappenz, szabadsag
        FROM ainova_letszam
        WHERE datum = @datum AND muszak = @muszak
      `);

    const existingMap = new Map(
      existingResult.recordset.map(row => [
        row.pozicio,
        { megjelent: row.megjelent, tappenz: row.tappenz, szabadsag: row.szabadsag }
      ])
    );

    await new sql.Request(transaction)
      .input('datum', sql.Date, datum)
      .input('muszak', sql.Char(1), muszak)
      .query(`
        DELETE FROM ainova_letszam
        WHERE datum = @datum AND muszak = @muszak
      `);

    const allRows = [
      ...operativ.map((row: any) => ({ ...row, pozicio_tipus: 'operativ' })),
      ...nemOperativ.map((row: any) => ({ ...row, pozicio_tipus: 'nem_operativ' }))
    ];

    for (const row of allRows) {
      const { pozicio, megjelent, tappenz, szabadsag, pozicio_tipus } = row;

      if (typeof megjelent !== 'number' || typeof tappenz !== 'number' || typeof szabadsag !== 'number') {
        throw new Error(`Invalid data types for pozicio: ${pozicio}`);
      }

      if (megjelent < 0 || tappenz < 0 || szabadsag < 0) {
        throw new Error(`Negative values not allowed for pozicio: ${pozicio}`);
      }

      const isKritikus = KRITIKUS_POZICIOK.includes(pozicio);
      const leadasiCel = pozicio_tipus === 'operativ' ? megjelent * 480 : null;

      const indoklas = indoklasok?.[pozicio] || {};
      const indoklasMiert = indoklas.miert || null;
      const indoklasMeddig = indoklas.meddig || null;
      const indoklasTerv = indoklas.terv || null;

      await new sql.Request(transaction)
        .input('datum', sql.Date, datum)
        .input('muszak', sql.Char(1), muszak)
        .input('pozicio', sql.NVarChar(50), pozicio)
        .input('pozicio_tipus', sql.NVarChar(20), pozicio_tipus)
        .input('is_kritikus', sql.Bit, isKritikus ? 1 : 0)
        .input('megjelent', sql.Int, megjelent)
        .input('tappenz', sql.Int, tappenz)
        .input('szabadsag', sql.Int, szabadsag)
        .input('leadasi_cel_perc', sql.Int, leadasiCel)
        .input('indoklas_miert', sql.NVarChar(500), indoklasMiert)
        .input('indoklas_meddig', sql.NVarChar(200), indoklasMeddig)
        .input('indoklas_terv', sql.NVarChar(500), indoklasTerv)
        .input('rogzitette_user', sql.NVarChar(50), username)
        .query(`
          INSERT INTO ainova_letszam (
            datum, muszak, pozicio, pozicio_tipus, is_kritikus,
            megjelent, tappenz, szabadsag, leadasi_cel_perc,
            indoklas_miert, indoklas_meddig, indoklas_terv,
            rogzitette_user, rogzitette_datum
          ) VALUES (
            @datum, @muszak, @pozicio, @pozicio_tipus, @is_kritikus,
            @megjelent, @tappenz, @szabadsag, @leadasi_cel_perc,
            @indoklas_miert, @indoklas_meddig, @indoklas_terv,
            @rogzitette_user, GETDATE()
          )
        `);

      const oldData = existingMap.get(pozicio);
      const actionType = oldData ? 'UPDATE' : 'INSERT';

      await new sql.Request(transaction)
        .input('action_type', sql.NVarChar(10), actionType)
        .input('datum', sql.Date, datum)
        .input('muszak', sql.Char(1), muszak)
        .input('pozicio', sql.NVarChar(50), pozicio)
        .input('old_megjelent', sql.Int, oldData?.megjelent || null)
        .input('old_tappenz', sql.Int, oldData?.tappenz || null)
        .input('old_szabadsag', sql.Int, oldData?.szabadsag || null)
        .input('new_megjelent', sql.Int, megjelent)
        .input('new_tappenz', sql.Int, tappenz)
        .input('new_szabadsag', sql.Int, szabadsag)
        .input('action_user', sql.NVarChar(50), username)
        .input('action_ip', sql.NVarChar(45), clientIP)
        .input('full_data_json', sql.NVarChar(sql.MAX), JSON.stringify(row))
        .query(`
          INSERT INTO ainova_letszam_audit_log (
            action_type, datum, muszak, pozicio,
            old_megjelent, old_tappenz, old_szabadsag,
            new_megjelent, new_tappenz, new_szabadsag,
            action_user, action_datum, action_ip, full_data_json
          ) VALUES (
            @action_type, @datum, @muszak, @pozicio,
            @old_megjelent, @old_tappenz, @old_szabadsag,
            @new_megjelent, @new_tappenz, @new_szabadsag,
            @action_user, GETDATE(), @action_ip, @full_data_json
          )
        `);
    }

    // Ha riport köteles módosítás, naplózni az admin értesítéshez
    if (riportKoteles && riportKoteles.indoklas) {
      console.log(`[Létszám] RIPORT KÖTELES módosítás: ${username} - ${datum} ${muszak} műszak`);
      console.log(`[Létszám] Indoklás: ${riportKoteles.indoklas}`);
      
      // Admin értesítés naplózása külön táblába
      try {
        await new sql.Request(transaction)
          .input('datum', sql.Date, datum)
          .input('muszak', sql.Char(1), muszak)
          .input('action_user', sql.NVarChar(50), username)
          .input('action_ip', sql.NVarChar(45), clientIP)
          .input('indoklas', sql.NVarChar(500), riportKoteles.indoklas)
          .input('is_overwrite', sql.Bit, riportKoteles.isOverwrite ? 1 : 0)
          .query(`
            INSERT INTO ainova_riport_koteles_log (
              datum, muszak, action_user, action_datum, action_ip,
              indoklas, is_overwrite, admin_notified
            ) VALUES (
              @datum, @muszak, @action_user, GETDATE(), @action_ip,
              @indoklas, @is_overwrite, 0
            )
          `);
      } catch (riportError) {
        // Ha a tábla nem létezik, csak logoljuk
        console.warn('[Létszám] Riport köteles log table may not exist:', riportError);
      }
    }

    const summaryResult = await new sql.Request(transaction)
      .input('datum', sql.Date, datum)
      .input('muszak', sql.Char(1), muszak)
      .query(`
        SELECT 
          pozicio_tipus,
          osszesen_megjelent,
          osszesen_tappenz,
          osszesen_szabadsag,
          brutto_osszesen,
          hianyzas_percent_atlag,
          leadasi_cel_perc
        FROM v_ainova_letszam_osszegzes
        WHERE datum = @datum AND muszak = @muszak
      `);

    await transaction.commit();

    const riportMessage = riportKoteles ? ' (RIPORT KÖTELES - admin értesítve)' : '';
    return NextResponse.json({
      success: true,
      message: `Létszám adatok sikeresen mentve (${allRows.length} pozíció)${riportMessage}`,
      summary: summaryResult.recordset,
      riportKoteles: !!riportKoteles
    });

  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[Létszám POST] Rollback error:', rollbackError);
      }
    }

    return ApiErrors.internal(error, 'Létszám POST');
  }
}
