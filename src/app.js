const data = JSON.parse(document.querySelector('#data').textContent);
const main = document.querySelector('#contenido');
const nav = document.querySelector('#nav');
const dialog = document.querySelector('#filters');
const status = document.querySelector('#toast');
const format = new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});
const pctFormat = new Intl.NumberFormat('es-AR',{maximumFractionDigits:2,signDisplay:'exceptZero'});
const shareFormat = new Intl.NumberFormat('es-AR',{maximumFractionDigits:2});
const num = n=>format.format(n);
const millions = n=>'$'+num(n/1e6);
const percent = n=>n>0&&n<.01?'<0,01%':shareFormat.format(n)+'%';
const safe = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const glyphs = {
 home:'<path d="m3 11 9-8 9 8v9H3z M9 20v-6h6v6"/>', chart:'<path d="M4 20v-6m5 6V9m5 11V5m5 15V3"/>',
 files:'<path d="m12 3 9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5"/>',
 total:'<path d="M4 7h16v12H4z M7 5h10 M8 13h8"/>',
 works:'<path d="M4 15v-2a8 8 0 0 1 16 0v2 M10 5v6m4-6v6 M3 15h18v4H3z"/>',
 health:'<path d="M12 4v16m-8-8h16"/>',
 book:'<path d="M12 6c-4-3-8-2-9-1v14c2-2 6-2 9 0 3-2 7-2 9 0V5c-1-1-5-2-9 1zm0 0v13"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 19v-2a6 6 0 0 1 12 0v2 M16 6a3 3 0 0 1 0 6m1 2a4 4 0 0 1 4 4v1"/>',
 shield:'<path d="M12 3 4 6v5c0 6 4 9 8 11 4-2 8-5 8-11V6z M9 12l2 2 4-5"/>',
 share:'<circle cx="6" cy="12" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 announce:'<path d="m4 10 14-5v14L4 14z M4 14l3 6h4l-2-4"/>'
};
const icon = name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${glyphs[name]}</svg>`;
const url = address=>/^https:\/\//i.test(address??'')?safe(address):'';
const sourceLink = (address,label='Fuente original')=>url(address)?`<a href="${url(address)}" rel="noopener noreferrer" target="_blank">${safe(label)}</a>`:'';
const moneyUnits = state=>state.unit==='real'?`Millones de pesos promedio de ${state.baseYear} · IPC NOA (INDEC)`:'Millones de pesos corrientes';
const baseNote = state=>state.unit==='real' && state.baseYear!==2025
  ? '<small class="muted">El promedio de la base seleccionada incluye IPC proyectado.</small>' : '';
const basePicker = (state,attribute='id="base-year"')=>state.unit==='real'
  ? `<label class="base-picker">Año base <select ${attribute}>${years.map(year=>`<option value="${year}" ${state.baseYear===year?'selected':''}>${year}</option>`).join('')}</select></label>` : '';
const moneyControls = state=>`<div class="money-controls">${unitButtons(state.unit,'unit')}${basePicker(state)}</div>`;
const indicatorKeys = [...new Set(data.indicators.map(r=>r.indicador))];
const catalog = topicCatalog(data);
const functionalKeys = ['administracion','seguridad','salud','social','educacion','ciencia','economia','deuda-funcion','sin-clasificar'];
const budgetGroups = {
  finalidades: {name:'Gasto por finalidad · 2025 y 2026', note:'Agrupa el gasto según el servicio que se quiere prestar. Abrí una finalidad para ver sus funciones.'},
  'finalidades-2027': {name:'Gasto por finalidad · proyecto 2027', note:'La Planilla 5 usa otras categorías. Los importes se obtienen sumando sus columnas institucionales. El cuadro queda $4 millones por debajo del total del artículo 1.'},
  jurisdicciones: {name:'Gasto por jurisdicción · proyecto 2027', note:'La Planilla 6 muestra cuánto se prevé asignar a cada organismo. Abrí una jurisdicción para ver su gasto corriente y de capital.'},
  financieras: {name:'Aplicaciones financieras', note:'La amortización del capital de la deuda se informa fuera del gasto total. Los intereses sí integran el gasto corriente.'}
};
const budgetTree = {
  recursos:['ingresos-corrientes','ingresos-capital'], total:['corriente','capital'],
  'inversion-real':['obras'], finalidades:functionalKeys, financieras:['amortizacion']
};
for(const row of data.budgetDetails) (budgetTree[row.parent]??=[]).push(row.id);
const openedBudgetNodes = new Set(['recursos','total','saldo']);
let state = parseState(location.hash,catalog);
let draft;
let toastTimer;

const yearButtons = (available,action)=>`<div class="years" role="group" aria-label="Años">${years.map(year=>
  `<button type="button" class="year" data-${action}="${year}" aria-pressed="${available.includes(year)}">${year}</button>`).join('')}</div>`;
const unitButtons = (unit,action)=>`<div class="units" role="group" aria-label="Unidad monetaria">${[['nominal','Corrientes'],['real','Constantes']].map(([value,label])=>
  `<button class="pill" type="button" data-${action}="${value}" aria-pressed="${unit===value}">${label}</button>`).join('')}</div>`;
const valueRow = (label,row)=>`<div class="data-row"><span>${label}</span>
  <strong class="price">${Number.isFinite(row?.value)?millions(row.value):safe(row?.status??'Sin dato')}</strong>
  ${row?.source?`<small class="muted">${safe([row.status,row.scope,row.inflation].filter(Boolean).join(' · '))}</small>${sourceLink(row.source)}`:''}</div>`;
const currentRow = (measure,cut)=>compareRows(data,{...state,selected:[state.year],measure,cut})[0];
const rangeText = state=>state.measure==='initial'?'Anual · crédito inicial o proyecto':state.cut==='annual'?'Cierre anual':'Enero a junio · mismo corte';

function home(){
  const row = compareRows(data,{...state,topic:'total',selected:[state.year],measure:'initial'})[0];
  return `<div class="hero"><div><h1>Presupuesto<br>Jujuy</h1><p class="sub">Presupuesto provincial · 2025, 2026 y 2027</p></div><div class="controls">${yearButtons([state.year],'year')}${moneyControls(state)}</div></div>
   <div class="layout"><article class="lead home-data"><small class="muted">${state.year} · ${safe(row.status)}</small><h2>Gasto total</h2><strong class="price">${millions(row.value)}</strong><small class="muted">${moneyUnits(state)}</small>
   ${baseNote(state)}
   ${row.inflation?`<small class="muted">${safe(row.inflation)}</small>`:''}
   ${state.year===2027?'<p class="note">Las fichas incluyen importes del proyecto y aclaran qué mide cada anexo.</p>':''}
   <div class="actions"><button class="primary" type="button" data-filter="total">Comparar gasto total</button>${sourceLink(row.source)}</div></article>
   <section><h2 class="section-title">Explorar por tema</h2><div class="topic-list">${Object.entries(topics).filter(([key,t])=>key!=='total'&&!t.overviewOnly).map(([key,t])=>
   `<button type="button" class="topic ${t.color}" data-topic="${key}"><strong>${t.name}</strong><span class="glyph">${icon(t.icon)}</span></button>`).join('')}</div>
   <button type="button" class="text-button" data-tab="indicadores">Ver indicadores sociales de Jujuy</button></section></div>`;
}

function topicView(){
  const topic = topics[state.topic];
  const layers = [['presupuesto','Presupuesto','rust','total'],['ejecucion','Ejecución','orange','chart'],['anuncios','Anuncios','aqua','announce']];
  const project = projectRows(data,state);
  const content = {
    presupuesto:()=>project.length
      ? project.map(row=>valueRow(row.label,{...row,scope:row.reference})+`<p class="note">${safe(row.scope)}</p>`).join('')
      : valueRow('Crédito inicial / proyecto',currentRow('initial','annual'))+
        valueRow('Crédito vigente al cierre',currentRow('currentCredit','annual')),
    ejecucion:()=>state.year===2027?'<p class="note">Sin ejecución publicada para 2027.</p>':valueRow('Devengado · enero a junio',currentRow('accrued','semester'))+
      valueRow('Devengado · cierre anual',currentRow('accrued','annual'))+
      '<p class="note">El pagado y la ejecución como porcentaje del crédito vigente al mismo corte requieren un cuadro compatible para esta partida.</p>',
    anuncios:()=>state.topic==='obras' && state.year===2026?data.claims.map(claim=>`<article class="data-row"><small class="muted">${safe(claim.date)}</small><h3>${safe(claim.title)}</h3><p>${safe(claim.body)}</p>${sourceLink(claim.url,'Comunicado oficial')}</article>`).join(''):'<p class="note">Sin anuncios incorporados para este tema y año.</p>'
  };
  return `<button class="back" type="button" data-tab="inicio">Volver a Inicio</button>
   <div class="hero"><div><h1>${topic.name}</h1><p class="sub">Presupuesto provincial · ${state.year}</p></div><div class="controls">${yearButtons([state.year],'year')}${moneyControls(state)}</div></div>
   <div class="layout"><div><div class="layers">${layers.map(([key,label,color,g])=>`<button type="button" class="layer ${color}" data-panel="${key}" aria-pressed="${state.panel===key}">${label}<span class="glyph">${icon(g)}</span></button>`).join('')}</div>
   <div class="actions"><button type="button" class="primary" data-filter="${state.topic}">Comparar este tema</button><button type="button" class="secondary" data-tab="fuentes">Ver fuentes</button></div></div>
   <section class="lead detail" aria-label="Detalle"><h2>${layers.find(([key])=>key===state.panel)[1]}</h2><small class="muted">${moneyUnits(state)}</small>
   ${baseNote(state)}${content[state.panel]()}
   ${topic.differentScope?'<p class="note">Bienestar Social en la ley y Promoción y Asistencia Social en ejecución tienen alcances distintos.</p>':''}</section></div>`;
}

function topicOptions(topic){
  const groups = [
    ['Resumen',['total','recursos','saldo','corriente','capital','ingresos-corrientes','ingresos-capital','amortizacion']],
    ['Rubros de ingresos',data.budgetDetails.filter(row=>row.basis==='recursos').map(row=>row.id)],
    ['Rubros de gasto',['obras',...data.budgetDetails.filter(row=>row.basis==='total'&&row.parent!=='finalidades-2027'&&!/^(func|jur)-/.test(row.id)).map(row=>row.id)]],
    ['Componentes del resultado',['saldo-corriente','saldo-capital']],
    ['Finalidades y funciones · 2025 y 2026',[...functionalKeys,...data.budgetDetails.filter(row=>row.id.startsWith('func-')).map(row=>row.id)]],
    ['Finalidades · proyecto 2027',budgetTree['finalidades-2027']],
    ['Jurisdicciones e importes por tipo de gasto · proyecto 2027',data.budgetDetails.filter(row=>row.id.startsWith('jur-')).map(row=>row.id)]
  ];
  return groups.map(([label,keys])=>`<optgroup label="${label}">${keys.map(key=>
    `<option value="${key}" ${topic===key?'selected':''}>${safe(catalog[key].name)}</option>`).join('')}</optgroup>`).join('');
}

function budgetTrend(rows){
  const values = rows.filter(row=>Number.isFinite(row.value));
  if(!values.length) return '';
  const low = Math.min(0,...values.map(row=>row.value));
  const high = Math.max(0,...values.map(row=>row.value));
  const divisor = high-low || 1;
  const bottom = low===high?164:172;
  const chartX = i=>123+(rows.length===1?.5:i/(rows.length-1))*392;
  const chartY = value=>bottom-(value-low)/divisor*145;
  const ticks = high===low?[0]:[high,(high+low)/2,low];
  const lines = rows.map((row,i)=>{
    const next = rows[i+1];
    if(!Number.isFinite(row.value)||!Number.isFinite(next?.value)) return '';
    return `<line x1="${chartX(i)}" y1="${chartY(row.value)}" x2="${chartX(i+1)}" y2="${chartY(next.value)}" class="budget-line ${next.year===2027?'projected':''}"/>`;
  }).join('');
  return `<svg class="budget-chart" viewBox="0 0 550 206" role="img" aria-label="${safe(values.map(row=>row.year+' · '+millions(row.value)+' millones').join('; '))}">
  ${ticks.map(tick=>`<line x1="121" x2="521" y1="${chartY(tick)}" y2="${chartY(tick)}" class="gridline"/>
  <text x="112" y="${chartY(tick)+4}" text-anchor="end">${num(tick/1e6)}</text>`).join('')}
  ${low<0&&high>0?`<line x1="121" x2="521" y1="${chartY(0)}" y2="${chartY(0)}" class="zero-line"/>`:''}
  ${lines}${rows.map((row,i)=>`<text x="${chartX(i)}" y="197" text-anchor="middle">${row.year}</text>${Number.isFinite(row.value)?
    `<circle cx="${chartX(i)}" cy="${chartY(row.value)}" r="5.5" class="budget-dot ${row.year===2027?'projected':''}"><title>${row.year} · ${millions(row.value)} millones</title></circle>`:''}`).join('')}</svg>`;
}

function budgetPie(share,label,denominator){
  const portion = share>0&&share<.01?'Menos de $0,01':`$${shareFormat.format(share)}`;
  return `<div class="share-item"><div class="budget-pie" aria-hidden="true">
    <svg viewBox="0 0 80 80"><circle class="pie-rest" cx="40" cy="40" r="32"></circle>
    ${share>0?`<circle class="pie-part" cx="40" cy="40" r="32" pathLength="100" stroke-dasharray="${share} 100" transform="rotate(-90 40 40)"></circle>`:''}</svg>
    <span>${safe(percent(share))}</span></div>
    <p>${label?`<b>${safe(label)}</b><br>`:''}${portion} de cada $100 <span class="muted">${denominator}</span></p></div>`;
}

function sharePanel(rows,topic){
  const basis = participationBasis(topic);
  if(!basis) return '';
  const denominator = basis==='recursos'?'de los ingresos previstos':
    state.measure==='accrued'?'del gasto devengado':state.measure==='currentCredit'?'del crédito vigente':'del gasto previsto';
  const worksProject = state.topic==='obras' && state.measure==='initial' && rows.some(row=>row.year===2027);
  const construction = worksProject && compareRows(data,{...state,topic:'construcciones',selected:[2027]})[0];
  return `<section class="lead share-panel" aria-label="Participación en el presupuesto"><h2>¿Cuánto representa?</h2>
    <p class="muted">La torta completa representa el total de cada año. El color muestra la parte elegida.</p>
    ${rows.map(row=>{
      const separate = row.detail?.filter(item=>Number.isFinite(item.share))??[];
      const pies = Number.isFinite(row.share)?budgetPie(row.share,'',denominator):
        separate.length?separate.map(item=>budgetPie(item.share,item.label,denominator)).join('')+'<small class="muted">Presupuesto por ministerio · distinto alcance.</small>':
        construction&&row.year===2027?budgetPie(construction.share,'Construcciones · Planilla 1',denominator)+
          '<small class="muted">La torta usa el cuadro por naturaleza del gasto. La Planilla 15 se muestra aparte.</small>':
        `<p class="muted">${safe(row.status==='Sin dato'?'Participación sin dato':row.status)}</p>`;
      return `<article class="share-year"><h3>${row.year} <span class="muted">${row.year===2027&&state.measure==='initial'?'Proyecto':''}</span></h3>${pies}</article>`;
    }).join('')}</section>`;
}

function compare(){
  const topic = catalog[state.topic];
  const rows = variations(compareRows(data,state));
  const filled = rows.filter(row=>Number.isFinite(row.value));
  const showShares = participationBasis(topic)!==null;
  const shareHeading = participationBasis(topic)==='recursos'?'% de los recursos':state.measure==='currentCredit'?'% del crédito':'% del gasto';
  const period = state.measure==='initial'?'Presupuesto anual previsto':`${measures[state.measure]} · ${rangeText(state)}`;
  return `<div class="compare-head"><h1>${safe(topic.name)}</h1><p class="sub">${period}</p></div>
  <div class="results"><div class="compare-layout">
    <article class="lead compare-chart"><h2>Cómo cambia el monto</h2><p class="muted">${moneyUnits(state)}</p>${baseNote(state)}
      ${budgetTrend(rows)}
      <div class="compare-years">${rows.map(row=>`<div class="compare-year"><span class="year-tag">${row.year}${row.year===2027&&state.measure==='initial'?' · Proyecto':''}</span>
        ${Number.isFinite(row.value)?`<strong class="price">${millions(row.value)}</strong>
        ${row.pct===null?'':`<small class="change">${pctFormat.format(row.pct)}% frente a ${row.priorYear}</small>`}`:
        `<small class="muted">${row.detail?.length?'Ver importes abajo':safe(row.status)}</small>`}</div>`).join('')}</div>
      ${topic.note?`<p class="note">${safe(topic.note)}</p>`:''}
      ${rows.some(row=>row.detail?.length)?`<div class="project-comparison"><h3>2027 · Importes del proyecto</h3>
        ${rows.flatMap(row=>row.detail??[]).map(row=>valueRow(row.label,{...row,scope:row.reference})).join('')}
        <p class="note">Estos importes tienen otro alcance. El gráfico de evolución usa la serie comparable.</p></div>`:''}
      ${filled.length<2?'<p class="note">Hacen falta dos montos del mismo indicador y corte para calcular una variación.</p>':''}
    </article>
    <aside class="lead compare-controls" aria-label="Controles de comparación">
      <label class="select-label" for="compare-topic">Partida o indicador<select id="compare-topic">${topicOptions(state.topic)}</select></label>
      ${moneyControls(state)}
      <button class="secondary" type="button" data-filter="${state.topic}">Elegir años e indicador</button>
    </aside>
    ${sharePanel(rows,topic)}
  </div>
  <section class="lead"><div class="actions"><h2>Desglose</h2><button type="button" class="secondary" data-download>Descargar CSV</button><button type="button" class="secondary" data-tab="fuentes">Ver metodología</button></div>
  <div class="table-scroll"><table><thead><tr><th>Año</th><th>Monto</th><th>Variación</th>${showShares?`<th>${shareHeading}</th>`:''}<th>Estado y fuente</th></tr></thead><tbody>
  ${rows.map(row=>`<tr><th scope="row">${row.year}</th><td class="price">${Number.isFinite(row.value)?millions(row.value):'—'}</td><td>${row.pct===null?'—':`${pctFormat.format(row.pct)}%<br><small class="muted">vs. ${row.priorYear}</small>`}</td>
    ${showShares?`<td>${Number.isFinite(row.share)?safe(percent(row.share)):'—'}</td>`:''}<td>${safe(row.status)}${row.inflation?`<br><small>${safe(row.inflation)}</small>`:''}${row.source?`<br>${sourceLink(row.source,'Abrir fuente')}`:''}</td></tr>`).join('')}
  </tbody></table></div></section></div>`;
}

function sources(){
  const original = data.annual.find(r=>r.ejercicio===state.year && r.concepto==='Gasto total');
  const work = data.annual.find(r=>r.ejercicio===state.year && r.concepto==='Trabajos Públicos');
  const exec = data.execution.find(r=>r.codigo==='total');
  const functionExec = data.execution.find(r=>r.codigo==='obras');
  const list = [original&&[original.estado_presupuesto==='proyecto'?'Proyecto de Presupuesto':'Ley de Presupuesto',original.fuente,'Crédito inicial · ejercicio completo'],
    [...data.budgetSources.balance[years.indexOf(state.year)],'Ingresos, gastos y resultado previstos'],
    work&&['Planilla de Trabajos Públicos',work.fuente,work.referencia],
    state.year!==2027&&['Hacienda · ejecución I.1',exec[`fuente_${state.year}`],'Devengado agregado · enero a junio'],
    state.year!==2027&&['Hacienda · ejecución I.3',functionExec[`fuente_${state.year}`],'Por finalidad, función y objeto · enero a junio'],
    state.year===2025&&['Cuenta de Inversión 2025',data.closing[0].fuente,'Cierre anual · cuadro 20'],
    state.year===2027&&['Proyecto 2027 · Planilla 6',data.projectItems.find(row=>row.topic==='salud').source,'Presupuesto por jurisdicción'],
    state.year===2027&&['Proyecto 2027 · Planilla 15',data.projectItems.find(row=>row.topic==='obras').source,'Construcciones en bienes de dominio público y privado'],
    ['INDEC · series de IPC','https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv','Nivel general de la región Noroeste y total nacional']].filter(Boolean);
  return `<div class="hero"><div><h1>Fuentes</h1><p class="sub">Documentos y metodología del comparador.</p></div>${yearButtons([state.year],'year')}</div>
  <div class="layout"><section><h2>Documentos de ${state.year}</h2><ul class="source-list">${list.map(([title,link,note])=>`<li>${sourceLink(link,title)}<small>${safe(note)}</small></li>`).join('')}</ul></section>
  <article class="lead detail"><h2>Cómo se comparan los montos</h2>
  <details open><summary>Ajuste por inflación</summary><p class="muted">Aplicamos el IPC NOA. El monto corriente se multiplica por el IPC medio del año base elegido dividido por el IPC medio del período. El ajuste anual usa el escenario central. El acumulado semestral se ajusta con el promedio de ese semestre como aproximación.</p>
  <ul class="source-list">${data.deflators.map(d=>`<li>${d.ejercicio} · ${d.meses_observados} meses observados · ${d.meses_proyectados} proyectados</li>`).join('')}</ul><p class="method">${sourceLink('https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informes/relevamiento-expectativas-mercado-2026-10.pdf','REM de octubre de 2026')}</p></details>
  <details><summary>Crédito, ejecución y anuncios</summary><p class="muted">El crédito inicial se consulta en la ley o en el proyecto cuando se indica. El crédito vigente incorpora modificaciones. El devengado registra una obligación de pago. Los anuncios se presentan con su fecha y su propio alcance.</p></details>
  <details><summary>Cómo se calcula la participación</summary><p class="muted">Cada partida de gasto se divide por el gasto total previsto o por el total del mismo indicador y corte. Cada recurso se divide por los ingresos totales previstos. Como ambos montos del año usan el mismo factor de precios, el porcentaje se conserva en pesos corrientes y constantes.</p></details>
  <details><summary>Proyecto y datos pendientes</summary><p class="muted">La base incorpora agregados, jurisdicciones y construcciones del proyecto 2027. Las cifras con distinto alcance se muestran con su fuente y sin variación interanual. La ejecución requiere un corte publicado. La variación indica el año anterior seleccionado que se tomó como base. Las celdas sin dato quedan vacías en la descarga.</p></details></article></div>`;
}

function fullView(){
  const annual = {...state,selected:years,measure:'initial',cut:'annual'};
  const roots = ['recursos','total','saldo'];
  const read = key=>compareRows(data,{...annual,topic:key});
  const [resources,spending,balances] = roots.map(read);
  const amount = row=>Number.isFinite(row.value)?millions(row.value):row.detail?.length?'Ver proyecto':'—';
  const resultLabel = value=>value>0?'Superávit previsto':value<0?'Déficit previsto':'Resultado equilibrado';

  function treeRow(key){
    const group = budgetGroups[key];
    const topic = group??catalog[key];
    const rows = group?[]:read(key);
    const children = budgetTree[key]??[];
    const sourceRows = rows.flatMap(row=>row.detail?.length
      ? row.detail.map(item=>({...item,year:row.year}))
      : row.source?[row]:[]);
    return `<details class="budget-node" data-budget-node="${key}" ${openedBudgetNodes.has(key)?'open':''}>
      <summary class="budget-summary ${group?'budget-group':''}"><span class="budget-label"><span class="disclosure" aria-hidden="true"></span>${safe(topic.name)}</span>
        ${rows.map(row=>`<span class="budget-cell"><span class="budget-cell-year">${row.year}</span><span class="${Number.isFinite(row.value)?'price':'muted'}">
          ${amount(row)}${Number.isFinite(row.share)?`<small class="muted">${safe(percent(row.share))}</small>`:''}</span></span>`).join('')}</summary>
      <div class="budget-children">
        ${topic.note?`<p class="note">${safe(topic.note)}</p>`:''}
        ${key==='recursos'?'<p class="note">En 2026, el artículo 2 y la Planilla 8 distribuyen $740 de forma distinta entre recursos corrientes y de capital. El total de ingresos coincide.</p>':''}
        ${rows.some(row=>row.detail?.length)?`<div class="project-detail"><h3>2027 · Importes del proyecto</h3>
          ${rows.flatMap(row=>row.detail??[]).map(item=>valueRow(item.label,{...item,scope:item.reference})).join('')}
          <p class="note">Los anexos del proyecto usan otro alcance.</p></div>`:''}
        ${children.map(treeRow).join('')}
        ${!group?`<div class="budget-row-actions"><button type="button" class="text-button" data-compare-topic="${key}">Comparar</button>
          ${sourceRows.map(row=>sourceLink(row.source,row.label?`${row.year} · ${row.label}`:`${row.year} · Fuente`)).join('')}</div>`:''}
      </div></details>`;
  }

  return `<div class="hero"><div><h1>Vista completa</h1><p class="sub">Ingresos, gastos y resultado de los tres presupuestos</p></div>${moneyControls(state)}</div>
  <div class="results">
    <section class="lead"><h2>Cuánto entra, cuánto se gasta y cuánto queda</h2>
      <p class="muted">${moneyUnits(state)}</p>${baseNote(state)}
      <div class="year-overview">${years.map((year,i)=>`<article class="year-card balance-card">
        <h3 class="year-tag">${year} · ${year===2027?'Proyecto':'Ley'}</h3>
        <dl><div><dt>Recursos</dt><dd class="price">${amount(resources[i])}</dd></div>
        <div><dt>Gastos</dt><dd class="price">${amount(spending[i])}</dd></div>
        <div class="balance-line"><dt>${resultLabel(balances[i].value)}</dt><dd class="price">${amount(balances[i])}</dd></div></dl>
        ${resources[i].inflation?`<small class="muted">${safe(resources[i].inflation)}</small>`:''}</article>`).join('')}</div>
    </section>
    <section class="lead budget-structure"><h2>Abrir el presupuesto por rubro</h2>
      <p class="muted">Abrí cada fila para ver el detalle y las fuentes. Los porcentajes indican cuánto pesa la partida dentro del total de ingresos o gastos del año.</p>
      <div class="budget-column-head" aria-hidden="true"><span>Concepto</span>${years.map(year=>`<span>${year} · ${year===2027?'Proyecto':'Ley'}</span>`).join('')}</div>
      ${roots.map(treeRow).join('')}
      ${Object.keys(budgetGroups).map(treeRow).join('')}
      <small class="muted">— indica que el rubro no está identificado en ese desglose. Los importes provienen de la ley y sus anexos o del proyecto.</small>
    </section>
    <div class="actions"><button type="button" class="secondary" data-tab="indicadores">Ver indicadores sociales</button><button type="button" class="text-button" data-tab="fuentes">Fuentes y metodología</button></div>
  </div>`;
}

function periodLabel(period){
  const [year,part] = period.split('-');
  if(!part) return year;
  if(part.startsWith('S')) return `${part.slice(1)}.º semestre ${year}`;
  return new Intl.DateTimeFormat('es-AR',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${period}-01T00:00:00Z`));
}
function trend(series){
  const rows = series.chart;
  if(!rows.length) return '';
  const first=rows[0],last=rows.at(-1);
  const difference = last.valor-first.valor;
  const change=series.label==='%'?`${pctFormat.format(difference)} p.p.`:first.valor===0?null:`${pctFormat.format(difference/first.valor*100)}%`;
  const low = Math.min(...rows.map(row=>row.valor));
  const high = Math.max(...rows.map(row=>row.valor));
  const padding = (high-low)*.14 || Math.max(Math.abs(high)*.07,1);
  const bottom = Math.max(0,low-padding);
  const top = high+padding;
  const time = period => {
    const [year,cut] = period.split('-');
    const withinYear = cut?.startsWith('S')?Number(cut.slice(1))*6:Number(cut??0);
    return Number(year)*12+withinYear;
  };
  const duration = time(last.periodo)-time(first.periodo) || 1;
  const points = rows.map(row=>[75+284*(time(row.periodo)-time(first.periodo))/duration,154-(row.valor-bottom)/(top-bottom)*127]);
  const ticks=[top,(top+bottom)/2,bottom];
  return `<section class="trend" aria-label="Evolución del indicador">
   <div class="trend-head"><div><small class="muted">Último dato · ${periodLabel(last.periodo)}</small><strong>${num(last.valor)}${series.label==='%'?'%':''}</strong><small class="muted">${safe(series.label)}</small></div>
   ${rows.length>1&&change!==null?`<div><small class="muted">Cambio en el tramo</small><strong>${change}</strong><small class="muted">Desde ${periodLabel(first.periodo)}</small></div>`:''}</div>
   ${rows.length>1?`<svg class="series-chart" viewBox="0 0 380 184" role="img" aria-label="Desde ${periodLabel(first.periodo)} hasta ${periodLabel(last.periodo)}. Cambio de la serie en ${safe(series.label)}.">
   ${ticks.map((tick,i)=>`<line x1="75" x2="359" y1="${27+i*63.5}" y2="${27+i*63.5}" class="gridline"/><text x="69" y="${30+i*63.5}" text-anchor="end">${num(tick)}</text>`).join('')}
   <polyline points="${points.map(p=>p.join(',')).join(' ')}" class="series-stroke"/>
   ${points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="3.6"><title>${periodLabel(rows[i].periodo)} · ${num(rows[i].valor)}</title></circle>`).join('')}
   <text x="75" y="176">${periodLabel(first.periodo)}</text><text x="359" y="176" text-anchor="end">${periodLabel(last.periodo)}</text></svg>`:''}</section>`;
}

function indicators(){
  const indicator = indicatorKeys.includes(state.social) ? state.social : 'Incidencia de pobreza en personas';
  const series = indicatorRows(data,state,indicator);
  const rows = [...series.rows].reverse();
  return `<button class="back" type="button" data-tab="inicio">Volver a Inicio</button><div class="hero"><div><h1>Indicadores sociales</h1><p class="sub">Jujuy · datos observados por fuente y cobertura</p></div>${yearButtons([state.year],'year')}</div>
  <div class="results"><article class="lead">
  <label class="select-label">Indicador<select id="indicator">${indicatorKeys.map(name=>`<option ${name===indicator?'selected':''}>${safe(name)}</option>`).join('')}</select></label>
  ${series.monetary?moneyControls(state)+baseNote(state):''}
  ${rows.length?`${trend(series)}<div class="table-scroll"><table><thead><tr><th>Período</th><th>Valor · ${safe(series.label)}</th><th>Cobertura y fuente</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${periodLabel(r.periodo)}</th><td>${num(r.valor)}${series.label==='%'?'%':''}</td><td>${safe(r.cobertura)}<br>${sourceLink(r.fuente,'Abrir fuente')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">Sin observaciones incorporadas para este indicador y año.</p>'}</article></div>`;
}

const views = {inicio:home,tema:topicView,completa:fullView,comparar:compare,fuentes:sources,indicadores:indicators};
function render(focus = false){
  const localId = document.activeElement?.id;
  const dataAttrs = {...document.activeElement?.dataset};
  for(const node of main.querySelectorAll('[data-budget-node]')){
    if(node.open) openedBudgetNodes.add(node.dataset.budgetNode);
    else openedBudgetNodes.delete(node.dataset.budgetNode);
  }
  main.innerHTML = views[state.tab]();
  const tab = ['tema','indicadores'].includes(state.tab)?'inicio':state.tab;
  nav.innerHTML = [['inicio','Inicio','home'],['completa','Vista completa','overview'],['comparar','Comparar','chart']].map(([key,text,g])=>
    `<button class="nav-item" type="button" data-nav="${key}" ${key===tab?'aria-current="page"':''}>${icon(g)}${text}</button>`).join('');
  if(focus){
    const heading = main.querySelector('h1');
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
    window.scrollTo(0,0);
  } else if(['indicator','base-year','compare-topic'].includes(localId)) document.getElementById(localId)?.focus({preventScroll:true});
  else if(Object.keys(dataAttrs).length) {
    const target = [...main.querySelectorAll('button')].find(button=>Object.entries(dataAttrs).every(([key,value])=>button.dataset[key]===value));
    target?.focus({preventScroll:true});
  }
}

function update(delta,{push=false,focus=false}={}){
  state = {...state,...delta};
  history[push?'pushState':'replaceState'](null,'',stateHash(state));
  render(focus);
}

function openFilters(topic){
  draft = {...state,topic,measure:catalog[topic].execution?state.measure:'initial',
    selected:[...(state.tab==='completa'?years:state.selected)]};
  drawFilters();
  dialog.showModal();
  dialog.querySelector('#topic-select').focus();
}

function drawFilters(focusSelector){
  const options = (entries,active)=>entries.map(([key,label])=>`<option value="${key}" ${key===active?'selected':''}>${label}</option>`).join('');
  dialog.innerHTML = `<form id="filter-form"><header><h2 id="filter-title">Comparar años</h2><button class="round" type="button" data-close aria-label="Cerrar">${icon('close')}</button></header>
  <label class="select-label">Partida o indicador<select id="topic-select" data-draft="topic">${topicOptions(draft.topic)}</select></label>
  <fieldset><legend>Años · elegí al menos dos</legend>${yearButtons(draft.selected,'draft-year')}</fieldset>
  <div class="filters-grid"><label>Indicador<select data-draft="measure" ${catalog[draft.topic].execution?'':'disabled'}>${options(Object.entries(measures),draft.measure)}</select></label>
  <label>Período<select data-draft="cut" ${draft.measure!=='accrued'?'disabled':''}>${options([['semester','Enero a junio'],['annual','Anual']],draft.measure==='accrued'?draft.cut:'annual')}</select></label></div>
  <fieldset><legend>Valores</legend>${unitButtons(draft.unit,'draft-unit')}${basePicker(draft,'data-draft="baseYear"')}</fieldset>
  <p class="hint">2027 figura como proyecto. La ejecución se muestra cuando hay un corte publicado.</p>
  <p role="alert" id="filter-message"></p><button class="primary" type="submit">Ver comparación</button></form>`;
  if(focusSelector) dialog.querySelector(focusSelector)?.focus();
}

function download(){
  const contents = csvRows(variations(compareRows(data,state)),state,catalog);
  const href = URL.createObjectURL(new Blob(['\ufeff',contents],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = href;
  link.download = `jujuy-${state.topic}-${state.measure}-${state.unit}.csv`;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function toast(message){
  status.textContent=message;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>status.textContent='',4200);
}
async function share(){
  if(location.protocol==='file:'){
    toast('El enlace compartido estará disponible al publicar el sitio.');
    return;
  }
  const link = new URL(location.href);
  link.hash = stateHash(state);
  try {
    if(navigator.share) {await navigator.share({title:'Presupuesto Jujuy',url:link.href});return;}
    if(navigator.clipboard){await navigator.clipboard.writeText(link.href);toast('Enlace copiado');return;}
  } catch(error){if(error.name==='AbortError') return;}
  window.prompt('Copiá el enlace de esta vista',link.href);
}

document.querySelector('#share').innerHTML=icon('share');
document.querySelector('#share').addEventListener('click',share);
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();main.focus();});
document.addEventListener('click',event=>{
  const button = event.target.closest('button');
  if(!button)return;
  const b=button.dataset;
  if(b.tab) update({tab:b.tab},{push:true,focus:true});
  if(b.nav) update({tab:b.nav},{push:true,focus:true});
  if(b.filter) openFilters(b.filter);
  if(b.topic) update({tab:'tema',topic:b.topic,panel:'presupuesto'},{push:true,focus:true});
  if(b.compareTopic) update({tab:'comparar',topic:b.compareTopic,measure:'initial',selected:[...years]},{push:true,focus:true});
  if(b.year) update({year:Number(b.year)});
  if(b.unit) update({unit:b.unit});
  if(b.panel) update({panel:b.panel});
  if('download' in b) download();
  if('sources' in b) update({tab:'fuentes'},{push:true,focus:true});
  if('close' in b) dialog.close();
  if(b.draftYear){
    const y=Number(b.draftYear);
    draft.selected=draft.selected.includes(y)?draft.selected.filter(n=>n!==y):years.filter(n=>n===y||draft.selected.includes(n));
    button.setAttribute('aria-pressed',String(draft.selected.includes(y)));
    dialog.querySelector('#filter-message').textContent='';
  }
  if(b.draftUnit){
    draft.unit=b.draftUnit;
    drawFilters(`[data-draft-unit="${draft.unit}"]`);
  }
});
document.addEventListener('change',event=>{
  const field=event.target.dataset.draft;
  if(field){
    draft[field]=field==='baseYear'?Number(event.target.value):event.target.value;
    if(field==='measure'){
      if(draft.measure==='currentCredit') draft.cut='annual';
      if(draft.measure==='accrued') draft.cut='semester';
      drawFilters('[data-draft="measure"]');
    }
    if(field==='topic'){
      if(!catalog[draft.topic].execution) draft.measure='initial';
      drawFilters('#topic-select');
    }
  }
  if(event.target.id==='base-year') update({baseYear:Number(event.target.value)});
  if(event.target.id==='indicator') update({social:event.target.value});
  if(event.target.id==='compare-topic'){
    const topic=event.target.value;
    update({topic,measure:catalog[topic].execution?state.measure:'initial'});
  }
});
dialog.addEventListener('submit',event=>{
  event.preventDefault();
  if(draft.selected.length<2){
    dialog.querySelector('#filter-message').textContent='Seleccioná dos o tres años.';
    return;
  }
  dialog.close();
  update({...draft,tab:'comparar'},{push:true,focus:true});
});
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
window.addEventListener('hashchange',()=>{state=parseState(location.hash,catalog);render(true);});
render();
