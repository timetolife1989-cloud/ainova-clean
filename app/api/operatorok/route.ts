import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { checkSession, apiSuccess, apiError, ApiErrors, getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';

// =====================================================
// Types - OperatorOrvosi (használva van típusdefinícióban)
// =====================================================
interface OperatorOrvosi {
  id: number;
  pozicio_id: number;
  pozicio_nev: string;
  kezdete: string;
  lejarat: string;
  megjegyzes: string | null;
}

// Operator típus (API response struktúra dokumentációja)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _OperatorResponse = {
  id: number;
  torzsszam: string;
  nev: string;
  muszak: string;
  pozicio: string;
  telefon: string | null;
  targonca_jogsi: boolean;
  daru_jogsi: boolean;
  egyeb_jogsi: string | null;
  megjegyzes: string | null;
  aktiv: boolean;
  orvosik?: OperatorOrvosi[];
};

// =====================================================
// GET - Operátorok listázása
// =====================================================
export async function GET(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const muszak = searchParams.get('muszak') || '';
    const pozicio = searchParams.get('pozicio') || '';
    const aktiv = searchParams.get('aktiv');
    
    const pool = await getPool();
    
    // WHERE feltételek
    const conditions: string[] = [];
    if (search) {
      conditions.push(`(o.torzsszam LIKE @search OR o.nev LIKE @search)`);
    }
    if (muszak) {
      conditions.push(`o.muszak = @muszak`);
    }
    if (pozicio) {
      conditions.push(`o.pozicio = @pozicio`);
    }
    if (aktiv !== null && aktiv !== '') {
      conditions.push(`o.aktiv = @aktiv`);
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';
    
    // Count query
    const countRequest = pool.request();
    if (search) countRequest.input('search', `%${search}%`);
    if (muszak) countRequest.input('muszak', muszak);
    if (pozicio) countRequest.input('pozicio', pozicio);
    if (aktiv !== null && aktiv !== '') countRequest.input('aktiv', aktiv === '1' ? 1 : 0);
    
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total FROM ainova_operatorok o ${whereClause}
    `);
    const total = countResult.recordset[0].total;
    
    // Data query - dinamikus oszlopok (ha nincs id, torzsszam-ot használjuk)
    const dataRequest = pool.request();
    if (search) dataRequest.input('search', `%${search}%`);
    if (muszak) dataRequest.input('muszak', muszak);
    if (pozicio) dataRequest.input('pozicio', pozicio);
    if (aktiv !== null && aktiv !== '') dataRequest.input('aktiv', aktiv === '1' ? 1 : 0);
    dataRequest.input('offset', (page - 1) * pageSize);
    dataRequest.input('pageSize', pageSize);
    
    // Ellenőrizzük mely oszlopok léteznek
    const colCheck = await pool.request().query(`
      SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok')
    `);
    const existingCols = colCheck.recordset.map((r: { name: string }) => r.name);
    const hasId = existingCols.includes('id');
    const hasTelefon = existingCols.includes('telefon');
    const hasJogsiGyalog = existingCols.includes('jogsi_gyalog_targonca');
    const hasMegjegyzes = existingCols.includes('megjegyzes');
    
    // Orvosi tábla létezik-e
    const orvosiExists = await pool.request().query(`
      SELECT 1 FROM sys.tables WHERE name = 'ainova_operator_orvosi'
    `);
    const hasOrvosi = orvosiExists.recordset.length > 0;
    
    // Egyszerűbb query OFFSET nélkül (TOP-ot használunk)
    const selectFields = [
      hasId ? 'o.id' : '0 as id',
      'o.torzsszam',
      'o.nev',
      'o.muszak',
      'o.pozicio',
      hasTelefon ? 'o.telefon' : 'NULL as telefon',
      hasJogsiGyalog ? 'o.jogsi_gyalog_targonca' : '0 as jogsi_gyalog_targonca',
      hasJogsiGyalog ? 'o.jogsi_forgo_daru' : '0 as jogsi_forgo_daru',
      hasJogsiGyalog ? 'o.jogsi_futo_daru' : '0 as jogsi_futo_daru',
      hasJogsiGyalog ? 'o.jogsi_newton_emelo' : '0 as jogsi_newton_emelo',
      hasMegjegyzes ? 'o.megjegyzes' : 'NULL as megjegyzes',
      'o.aktiv',
      'o.created_at',
      'o.updated_at',
      hasOrvosi ? '(SELECT COUNT(*) FROM ainova_operator_orvosi orv WHERE orv.operator_torzsszam = o.torzsszam) as orvosi_count' : '0 as orvosi_count',
      hasOrvosi ? '(SELECT MIN(lejarat) FROM ainova_operator_orvosi orv WHERE orv.operator_torzsszam = o.torzsszam AND orv.lejarat >= GETDATE()) as legkozelebb_lejaro' : 'NULL as legkozelebb_lejaro'
    ];
    
    const result = await dataRequest.query(`
      SELECT ${selectFields.join(', ')}
      FROM ainova_operatorok o
      ${whereClause}
      ORDER BY o.nev
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);
    
    // Közvetlen JSON válasz (nem apiSuccess wrapper)
    return NextResponse.json({
      data: result.recordset,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
    
  } catch (error) {
    console.error('[Operatorok] List error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}

// =====================================================
// POST - Új operátor (opcionális, ha kézzel kell felvenni)
// =====================================================
export async function POST(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    return ApiErrors.forbidden();
  }
  
  try {
    const body = await request.json();
    const { 
      torzsszam, nev, muszak, pozicio, telefon, 
      jogsi_gyalog_targonca, jogsi_forgo_daru, jogsi_futo_daru, jogsi_newton_emelo,
      megjegyzes 
    } = body;
    
    if (!torzsszam || !nev || !muszak) {
      return apiError('Törzsszám, név és műszak kötelező', HTTP_STATUS.BAD_REQUEST);
    }
    
    const pool = await getPool();
    
    // Check if exists
    const existing = await pool.request()
      .input('torzsszam', torzsszam)
      .query(`SELECT id FROM ainova_operatorok WHERE torzsszam = @torzsszam`);
    
    if (existing.recordset.length > 0) {
      return apiError('Ez a törzsszám már létezik', HTTP_STATUS.CONFLICT);
    }
    
    const result = await pool.request()
      .input('torzsszam', torzsszam)
      .input('nev', nev)
      .input('muszak', muszak)
      .input('pozicio', pozicio || '')
      .input('telefon', telefon || null)
      .input('jogsi_gyalog_targonca', jogsi_gyalog_targonca ? 1 : 0)
      .input('jogsi_forgo_daru', jogsi_forgo_daru ? 1 : 0)
      .input('jogsi_futo_daru', jogsi_futo_daru ? 1 : 0)
      .input('jogsi_newton_emelo', jogsi_newton_emelo ? 1 : 0)
      .input('megjegyzes', megjegyzes || null)
      .query(`
        INSERT INTO ainova_operatorok 
          (torzsszam, nev, muszak, pozicio, telefon, jogsi_gyalog_targonca, jogsi_forgo_daru, jogsi_futo_daru, jogsi_newton_emelo, megjegyzes, aktiv)
        OUTPUT INSERTED.id
        VALUES 
          (@torzsszam, @nev, @muszak, @pozicio, @telefon, @jogsi_gyalog_targonca, @jogsi_forgo_daru, @jogsi_futo_daru, @jogsi_newton_emelo, @megjegyzes, 1)
      `);
    
    console.log(`[Operatorok] Created: ${torzsszam} - ${nev}`);
    
    return apiSuccess({ id: result.recordset[0].id }, { status: HTTP_STATUS.CREATED });
    
  } catch (error) {
    console.error('[Operatorok] Create error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}
