import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { validateSession } from '@/lib/auth';

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
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datum = searchParams.get('datum');
    const muszak = searchParams.get('muszak');

    if (!datum || !muszak) {
      return NextResponse.json(
        { error: 'Missing datum or muszak parameter' }, 
        { status: 400 }
      );
    }

    if (!['A', 'B', 'C'].includes(muszak)) {
      return NextResponse.json(
        { error: 'Invalid muszak (must be A, B, or C)' }, 
        { status: 400 }
      );
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

  } catch (error: any) {
    console.error('[Létszám GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch létszám data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let pool: sql.ConnectionPool | null = null;
  let transaction: sql.Transaction | null = null;

  try {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { datum, muszak, operativ, nemOperativ, indoklasok } = body;

    if (!datum || !muszak) {
      return NextResponse.json(
        { error: 'Missing datum or muszak' },
        { status: 400 }
      );
    }

    if (!['A', 'B', 'C'].includes(muszak)) {
      return NextResponse.json(
        { error: 'Invalid muszak (must be A, B, or C)' },
        { status: 400 }
      );
    }

    if (!Array.isArray(operativ) || !Array.isArray(nemOperativ)) {
      return NextResponse.json(
        { error: 'operativ and nemOperativ must be arrays' },
        { status: 400 }
      );
    }

    pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const clientIP = getClientIP(request);
    const username = session.username;

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

    return NextResponse.json({
      success: true,
      message: `Létszám adatok sikeresen mentve (${allRows.length} pozíció)`,
      summary: summaryResult.recordset
    });

  } catch (error: any) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[Létszám POST] Rollback error:', rollbackError);
      }
    }

    console.error('[Létszám POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save létszám data', details: error.message },
      { status: 500 }
    );
  }
}
