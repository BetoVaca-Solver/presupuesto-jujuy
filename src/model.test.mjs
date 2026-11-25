import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compareRows,csvRows,indicatorRows,parseState,stateHash,topicCatalog,variations } from './model.mjs';
const data = JSON.parse(await readFile(new URL('./data.json',import.meta.url)));
const base = parseState();

test('el gasto inicial incluye el proyecto 2027 y rotula los meses estimados',()=>{
  const rows = compareRows(data,{...base,unit:'real'});
  assert.deepEqual(rows.map(r=>r.status),['Ley · crédito inicial','Ley · crédito inicial','Proyecto']);
  assert.deepEqual(rows.map(r=>r.inflation),['','IPC: 2 meses proyectados','IPC: 12 meses proyectados']);
  assert.equal(rows[0].value,1989195943158);
});

test('obra pública semestral cambia de variación positiva a negativa al deflactar',()=>{
  const query = {...base,topic:'obras',measure:'accrued',cut:'semester'};
  const nominal = variations(compareRows(data,query));
  const real = variations(compareRows(data,{...query,unit:'real'}));
  assert.ok(Math.abs(nominal[1].pct-12.736588)<0.000001);
  assert.ok(Math.abs(real[1].pct-(-15.083903))<0.000001);
  assert.equal(real[2].status,'Sin ejecución publicada');
  assert.equal(real[2].value,undefined);
  assert.equal(real[2].pct,null);
  assert.match(csvRows(real,{...query,unit:'real'}),/"2027";"pesos promedio de 2025";"";"";"Sin ejecución publicada"/);
});

test('el crédito vigente al cierre usa el cuadro con vigencia verificada',()=>{
  const rows = compareRows(data,{...base,topic:'obras',measure:'currentCredit',cut:'annual'});
  assert.equal(rows[0].value,284304455182);
  assert.equal(rows[1].value,undefined);
});

test('una consulta compartida restaura tema, corte, años y unidad',()=>{
  const query = {...base,tab:'comparar',topic:'salud',year:2027,selected:[2025,2027],measure:'accrued',unit:'real',panel:'ejecucion',social:'Empleo'};
  assert.deepEqual(parseState(stateHash(query)),query);
  const invalid = parseState('#tema=toString&anio=2028&anios=2026,2026,2023&indicador=constructor');
  assert.deepEqual(invalid.selected,[2026]);
  assert.equal(invalid.topic,'total');
  assert.equal(invalid.measure,'initial');
});

test('el proyecto muestra jurisdicciones y construcciones sin mezclarlas con la serie comparable',()=>{
  const state = {...base,selected:[2025,2026,2027]};
  assert.equal(compareRows(data,{...state,topic:'obras'})[2].detail[0].value,386567015964);
  const salud = {...state,topic:'salud'};
  const rows = variations(compareRows(data,salud));
  assert.equal(rows[2].detail[0].value,915860649632);
  assert.equal(rows[2].pct,null);
  assert.match(csvRows(rows,salud),/915860649632/);
  assert.deepEqual(compareRows(data,{...state,topic:'educacion'})[2].detail.map(r=>r.value),[899153499770,25076008631]);
});

test('la base de precios cambia la unidad sin afectar la variación real',()=>{
  const state = {...base,unit:'real'};
  const old = variations(compareRows(data,state));
  const rebased = variations(compareRows(data,{...state,baseYear:2026}));
  const nominal = compareRows(data,base);
  assert.ok(Math.abs(rebased[1].value-nominal[1].value)<300);
  assert.ok(Math.abs(rebased[2].pct-old[2].pct)<1e-8);
});

test('los indicadores monetarios tienen una observación por mes según la unidad elegida',()=>{
  const name = 'Crianza 6 a 12 años, total';
  const nominal = indicatorRows(data,base,name);
  const adjusted = indicatorRows(data,{...base,unit:'real',baseYear:2026},name);
  assert.equal(nominal.rows.at(-1).valor,720300.72);
  assert.ok(Math.abs(adjusted.rows.at(-1).valor-673330)<2);
  assert.equal(adjusted.rows.length,new Set(adjusted.rows.map(row=>row.periodo)).size);
  const poverty = indicatorRows(data,{...base,unit:'real'},'Incidencia de pobreza en personas');
  assert.equal(poverty.rows.at(-1).valor,27.6);
});

test('ingresos, gastos y componentes del saldo cierran en los tres ejercicios',()=>{
  const rows = topic=>compareRows(data,{...base,topic});
  const resources = rows('recursos');
  const spending = rows('total');
  const financing = rows('saldo');
  const current = rows('saldo-corriente');
  const capital = rows('saldo-capital');
  for(const [i,result] of financing.entries()){
    assert.equal(resources[i].value-spending[i].value,result.value);
    assert.equal(current[i].value+capital[i].value,result.value);
    assert.equal(result.share,null);
  }
});

test('las participaciones usan el total correspondiente y conservan el alcance',()=>{
  const rows = (topic,unit='nominal')=>compareRows(data,{...base,topic,unit});
  assert.equal(rows('impuestos')[2].share,3257926927267/4046946673988*100);
  assert.deepEqual(rows('personal','real').map(row=>row.share),rows('personal').map(row=>row.share));
  const [,,project] = rows('salud');
  assert.equal(project.share,undefined);
  assert.equal(project.detail[0].share,915860649632/4045932631010*100);
  const [missing,,official] = rows('jur-50-capital');
  assert.equal(missing.value,undefined);
  assert.equal(official.value,5295325551);
  assert.equal(rows('jur-90-capital')[2].share,0);
});

test('se puede compartir y exportar una partida del desglose',()=>{
  const catalog = topicCatalog(data);
  const topic = 'func-3-1';
  const query = parseState('#vista=comparar&tema=func-3-1&indicador=accrued',catalog);
  assert.equal(query.topic,topic);
  assert.equal(query.measure,'initial');
  assert.match(csvRows(compareRows(data,query),query,catalog),/"Atención médica".*"189168478763"/);
});
