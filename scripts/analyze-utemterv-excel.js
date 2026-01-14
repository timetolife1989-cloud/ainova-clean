const XLSX = require('xlsx');
const path = require('path');

// Excel fájl az O: meghajtón
const excelPath = 'O:\\!Production\\LAC\\!War Room adatok\\LaC erőforrás kalkulátor,allokáció.2026.xlsm';

console.log('=== LaC Erőforrás Kalkulátor Excel Elemzése ===\n');
console.log('Fájl:', excelPath);

try {
    const workbook = XLSX.readFile(excelPath);
    
    console.log('\n--- ÖSSZES SHEET ---');
    workbook.SheetNames.forEach((name, idx) => {
        console.log(`${idx + 1}. "${name}"`);
    });

    // CW sheetek keresése (ütemtervek)
    console.log('\n--- CW ÜTEMTERV SHEETEK ---');
    const cwSheets = workbook.SheetNames.filter(name => {
        const lower = name.toLowerCase();
        return lower.includes('cw') || lower.includes('ütemterv') || lower.includes('utemterv');
    });
    
    cwSheets.forEach(sheetName => {
        console.log(`\n📅 Sheet: "${sheetName}"`);
        
        // Hét szám kinyerése
        const weekMatch = sheetName.match(/cw\s*0?(\d+)/i) || sheetName.match(/(\d+)\s*ütemterv/i);
        if (weekMatch) {
            console.log(`   Hét száma: CW${weekMatch[1]}`);
        }
        
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        console.log(`   Tartomány: ${sheet['!ref']}`);
        console.log(`   Sorok: ${range.e.r + 1}, Oszlopok: ${range.e.c + 1}`);
        
        // Első 5 sor kiírása a struktúra megértéséhez
        console.log('\n   Első sorok (struktúra):');
        for (let r = 0; r <= Math.min(5, range.e.r); r++) {
            let rowData = [];
            for (let c = 0; c <= Math.min(15, range.e.c); c++) {
                const cellAddr = XLSX.utils.encode_cell({r, c});
                const cell = sheet[cellAddr];
                if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
                    rowData.push(`[${String.fromCharCode(65+c)}${r+1}]=${String(cell.v).substring(0, 20)}`);
                }
            }
            if (rowData.length > 0) {
                console.log(`   R${r+1}: ${rowData.join(' | ')}`);
            }
        }
        
        // Típusok keresése (B86... kezdetű cellák)
        console.log('\n   Termék típusok a sheetben:');
        let tipusok = new Set();
        for (let r = 0; r <= range.e.r && tipusok.size < 20; r++) {
            for (let c = 0; c <= 2; c++) {
                const cellAddr = XLSX.utils.encode_cell({r, c});
                const cell = sheet[cellAddr];
                if (cell && typeof cell.v === 'string' && cell.v.match(/^B8[0-9]/i)) {
                    tipusok.add(cell.v);
                }
            }
        }
        tipusok.forEach(t => console.log(`   - ${t}`));
    });

    // CW02 sheet részletes elemzése (ha létezik)
    console.log('\n\n=== CW02 SHEET RÉSZLETES ELEMZÉSE ===');
    
    // Keressük meg a CW02-t bármilyen formátumban
    const cw02Sheet = workbook.SheetNames.find(name => {
        const lower = name.toLowerCase().replace(/\s+/g, '');
        return lower.includes('cw02') || lower.includes('cw2') || 
               (lower.includes('02') && lower.includes('ütemterv'));
    });
    
    if (cw02Sheet) {
        console.log(`Találat: "${cw02Sheet}"`);
        const sheet = workbook.Sheets[cw02Sheet];
        
        // "Napi fix ütemterv" keresése
        console.log('\n--- "Napi fix ütemterv" blokk keresése ---');
        let napiFixStart = null;
        let hetiFixStart = null;
        let felkovetesStart = null;
        
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        
        for (let r = 0; r <= range.e.r; r++) {
            for (let c = 0; c <= range.e.c; c++) {
                const cellAddr = XLSX.utils.encode_cell({r, c});
                const cell = sheet[cellAddr];
                if (cell && typeof cell.v === 'string') {
                    const val = cell.v.toLowerCase();
                    if (val.includes('napi fix ütemterv') && !val.includes('felkövet')) {
                        napiFixStart = {r, c, val: cell.v};
                        console.log(`Napi fix ütemterv: [${cellAddr}] = "${cell.v}"`);
                    }
                    if (val.includes('heti fix') && val.includes('felkövet')) {
                        hetiFixStart = {r, c, val: cell.v};
                        console.log(`Heti fix felkövetés: [${cellAddr}] = "${cell.v}"`);
                    }
                    if (val.includes('napi fix') && val.includes('felkövet')) {
                        felkovetesStart = {r, c, val: cell.v};
                        console.log(`Napi felkövetés: [${cellAddr}] = "${cell.v}"`);
                    }
                }
            }
        }
        
        // Napi fix ütemterv tábla kiolvasása
        if (napiFixStart) {
            console.log('\n--- NAPI FIX ÜTEMTERV TÁBLA ---');
            const startRow = napiFixStart.r;
            const startCol = napiFixStart.c;
            
            // Fejléc sor (dátumok)
            console.log('\nFejléc (dátumok):');
            let headers = [];
            for (let c = startCol; c <= startCol + 12; c++) {
                const cellAddr = XLSX.utils.encode_cell({r: startRow + 1, c});
                const cell = sheet[cellAddr];
                if (cell) {
                    headers.push(cell.v);
                    console.log(`  ${String.fromCharCode(65+c)}: ${cell.v}`);
                }
            }
            
            // Típusok és értékek
            console.log('\nTípusok és napi értékek:');
            for (let r = startRow + 2; r <= startRow + 20 && r <= range.e.r; r++) {
                const tipusCell = sheet[XLSX.utils.encode_cell({r, c: startCol})];
                if (tipusCell && typeof tipusCell.v === 'string' && tipusCell.v.match(/^B8/i)) {
                    let values = [tipusCell.v];
                    for (let c = startCol + 1; c <= startCol + 8; c++) {
                        const valCell = sheet[XLSX.utils.encode_cell({r, c})];
                        values.push(valCell ? valCell.v : '');
                    }
                    console.log(`  ${values.join(' | ')}`);
                }
            }
            
            // SUM percen sor keresése
            console.log('\nSUM percen sor:');
            for (let r = startRow; r <= startRow + 30 && r <= range.e.r; r++) {
                const cell = sheet[XLSX.utils.encode_cell({r, c: startCol})];
                if (cell && typeof cell.v === 'string' && cell.v.toLowerCase().includes('sum')) {
                    let values = [cell.v];
                    for (let c = startCol + 1; c <= startCol + 8; c++) {
                        const valCell = sheet[XLSX.utils.encode_cell({r, c})];
                        values.push(valCell ? valCell.v : '');
                    }
                    console.log(`  ${values.join(' | ')}`);
                }
            }
        }
        
        // Heti fix ütemterv (jobb oldali tábla - tekercsek)
        if (hetiFixStart) {
            console.log('\n--- HETI FIX ÜTEMTERV (TEKERCSEK) ---');
            const startRow = hetiFixStart.r;
            const startCol = hetiFixStart.c;
            
            console.log('\nFejléc:');
            for (let c = startCol; c <= startCol + 12; c++) {
                const cellAddr = XLSX.utils.encode_cell({r: startRow + 1, c});
                const cell = sheet[cellAddr];
                if (cell && cell.v) {
                    console.log(`  ${String.fromCharCode(65+c)}${startRow+2}: ${cell.v}`);
                }
            }
            
            console.log('\nTekercs típusok:');
            for (let r = startRow + 2; r <= startRow + 20 && r <= range.e.r; r++) {
                const tipusCell = sheet[XLSX.utils.encode_cell({r, c: startCol})];
                if (tipusCell && tipusCell.v) {
                    let values = [tipusCell.v];
                    for (let c = startCol + 1; c <= startCol + 10; c++) {
                        const valCell = sheet[XLSX.utils.encode_cell({r, c})];
                        values.push(valCell ? valCell.v : '');
                    }
                    console.log(`  ${values.join(' | ')}`);
                }
            }
        }
    } else {
        console.log('CW02 sheet nem található!');
        console.log('Elérhető sheetek:', workbook.SheetNames.join(', '));
    }

} catch (err) {
    console.error('Hiba:', err.message);
}
