const data = JSON.parse(document.querySelector('#data').textContent);
const main = document.querySelector('#contenido');
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
  chart:'<path d="M4 20v-6m5 6V9m5 11V5m5 15V3"/>',
  bank:'<path d="m3 8 9-5 9 5v2H3z M5 11v6m5-6v6m4-6v6m5-6v6 M3 20h18"/>',
  balance:'<path d="M4 9h16v10H4z M7 6h10 M9 14h6"/>',
  files:'<path d="m12 3 9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5"/>',
  search:'<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
  filters:'<path d="M4 7h16M4 17h16 M9 4v6m6 4v6"/>',
  share:'<circle cx="6" cy="12" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>'
};
const icon = name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${glyphs[name]}</svg>`;
const url = address=>/^https:\/\//i.test(address??'')?safe(address):'';
const sourceLink = (address,label='Fuente original')=>url(address)?`<a href="${url(address)}" rel="noopener noreferrer" target="_blank">${safe(label)}</a>`:'';
const moneyUnits = state=>state.unit==='real'?`Millones de pesos promedio de ${state.baseYear} · IPC NOA (INDEC)`:'Millones de pesos corrientes';
const baseNote = state=>state.unit==='real' && state.baseYear!==2025
  ? '<small class="muted">El promedio de la base seleccionada incluye IPC proyectado.</small>' : '';
const basePicker = state=>state.unit==='real'
  ? `<label class="base-picker">Año base <select id="base-year">${years.map(year=>`<option value="${year}" ${state.baseYear===year?'selected':''}>${year}</option>`).join('')}</select></label>` : '';
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
  recursos:['ingresos-corrientes','ingresos-capital'], total:['corriente','capital','finalidades','finalidades-2027','jurisdicciones'],
  'inversion-real':['obras'], finalidades:functionalKeys, financieras:['amortizacion']
};
for(const row of data.budgetDetails) (budgetTree[row.parent]??=[]).push(row.id);
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
  return `<section class="panel share-panel" aria-label="Participación en el presupuesto"><h3><span class="chart-icon tone-aqua"><span class="pie-mark"></span></span>¿Cuánto representa?</h3>
    <p class="muted">Cada torta representa el total del año.</p>
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
  return `<div class="social-body">
  <div class="social-controls">${yearButtons([state.year],'social-year','Año de indicadores sociales')}  <label class="select-label">Indicador<select id="indicator">${indicatorKeys.map(name=>`<option ${name===indicator?'selected':''}>${safe(name)}</option>`).join('')}</select></label>
  </div>${series.monetary?baseNote(state):''}
  ${rows.length?`${trend(series)}<div class="table-scroll"><table><thead><tr><th>Período</th><th>Valor · ${safe(series.label)}</th><th>Cobertura</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${periodLabel(r.periodo)}</th><td>${num(r.valor)}${series.label==='%'?'%':''}</td><td>${safe(r.cobertura)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">Sin observaciones incorporadas para este indicador y año.</p>'}</div>`;
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


const rootTopics = ['recursos','total','saldo','financieras'];
const treeLabels = {recursos:'Recursos',total:'Gastos',saldo:'Resultado'};
const branchParent = new Map(Object.entries(budgetTree).flatMap(([parent,children])=>children.map(child=>[child,parent])));
const expandedBranches = new Set(['total','capital']);
const sourceDialog = document.querySelector('#sources');
const pickerMedia = matchMedia('(min-width: 910px)');
let state = parseState(location.hash,catalog);
let draft;
let toastTimer;
let searchText = '';

const yearButtons = (available,action,label='Años')=>`<div class="years" role="group" aria-label="${label}">${years.map(year=>
  `<button type="button" class="year" data-${action}="${year}" aria-pressed="${available.includes(year)}">${year}</button>`).join('')}</div>`;
const unitButtons = (unit,action)=>`<div class="units" role="group" aria-label="Unidad monetaria">${[['nominal','Corrientes'],['real','Constantes']].map(([value,label])=>
  `<button class="pill" type="button" data-${action}="${value}" aria-pressed="${unit===value}">${label}</button>`).join('')}</div>`;
const rangeText = state=>state.measure==='initial'?'Presupuesto previsto':
  `${measures[state.measure]} · ${state.cut==='annual'?'Cierre anual':'Enero a junio'}`;
const budgetStatus = year=>year===2027?'Proyecto':'Ley';
const searchKey = text=>text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
const treeName = key=>treeLabels[key]??catalog[key]?.name??budgetGroups[key].name;
const initialRows = (topic,selected=years)=>compareRows(data,{...state,topic,selected,measure:'initial'});

function revealTopic(topic){
  for(let key=branchParent.get(topic);key;key=branchParent.get(key)) expandedBranches.add(key);
}

function topicNodes(){
  const terms = searchKey(searchText.trim()).split(/\s+/).filter(Boolean);
  function node(key,matchAncestor=false){
    const name = treeName(key);
    const matched = matchAncestor||terms.every(term=>searchKey(name+' '+(catalog[key]?.name??'')).includes(term));
    const children = (budgetTree[key]??[]).map(child=>node(child,matched)).filter(Boolean);
    if(!matched&&!children.length) return '';
    const branch = Boolean(budgetTree[key]?.length);
    const open = terms.length>0||expandedBranches.has(key);
    const select = catalog[key]
      ? `<button type="button" class="pick-topic" data-pick="${key}" aria-pressed="${state.topic===key}">${safe(name)}</button>`
      : `<span class="branch-label">${safe(name)}</span>`;
    return `<li><div class="tree-row ${state.topic===key?'is-selected':''}">
      ${branch?`<button type="button" class="branch-toggle" data-branch="${key}" aria-expanded="${open}" aria-controls="branch-${key}" aria-label="${open?'Plegar':'Abrir'} ${safe(name)}" ${terms.length?'disabled':''}>${open?'−':'+'}</button>`:'<span></span>'}
      ${select}</div>${branch?`<ul id="branch-${key}" ${open?'':'hidden'}>${children.join('')}</ul>`:''}</li>`;
  }
  const items=rootTopics.map(key=>node(key)).filter(Boolean);
  return items.length?`<ul class="tree">${items.join('')}</ul>`:'<p class="muted empty-search" role="status">No encontramos partidas con ese nombre.</p>';
}

function summary(){
  const [resources,spending,results]=['recursos','total','saldo'].map(key=>initialRows(key));
  return `<section class="budget-summary" aria-labelledby="summary-title">
    <div class="section-heading"><div><h2 id="summary-title">Recursos − gastos = resultado</h2><p class="muted">${moneyUnits(state)}</p></div>${moneyControls(state)}</div>
    ${baseNote(state)}
    <div class="account-list">${years.map((year,i)=>{
      const result=results[i].value;
      const terms=[
        ['recursos','Recursos',resources[i].value,'aqua','bank'],
        ['total','Gastos',spending[i].value,'orange','chart'],
        ['saldo',result>0?'Superávit previsto':result<0?'Déficit previsto':'Resultado equilibrado',result,result<0?'rust':'cream','balance']
      ];
      return `<article class="account-row" aria-label="${year} · ${budgetStatus(year)}">
        <div class="account-year"><b>${year}</b><small>${budgetStatus(year)}</small></div>
        ${terms.map(([key,label,value,tone,glyph],index)=>`${index?`<span class="account-sign" aria-hidden="true">${index===1?'−':'='}</span>`:''}
          <button type="button" class="account-term tone-${tone}" data-aggregate="${key}" aria-label="${label}, ${year}, ${millions(value)} millones. Ver evolución" title="${year} · ${label}">
            <span class="account-icon">${icon(glyph)}</span><span class="account-value"><span>${label}</span><b class="price">${millions(value)}</b></span>
          </button>`).join('')}
      </article>`;
    }).join('')}</div>
  </section>`;
}

const changeText = row=>row.pct===null?'—':`${pctFormat.format(row.pct)}% <small class="muted">vs. ${row.priorYear}</small>`;

function breakdown(rows,topic,open){
  const basis=participationBasis(topic);
  const shareHeading=basis==='recursos'?'% de los recursos':state.measure==='currentCredit'?'% del crédito':'% del gasto';
  const children=state.measure==='initial'?(budgetTree[state.topic]??[]).filter(key=>catalog[key]):[];
  let parent=branchParent.get(state.topic);
  while(parent&&!budgetGroups[parent]) parent=branchParent.get(parent);
  return `<details class="panel breakdown" id="breakdown" ${open?'open':''}>
    <summary><span>Desglose y datos</span></summary>
    <div class="breakdown-content">
      ${parent?`<p class="note">${safe(budgetGroups[parent].note)}</p>`:''}
      <div class="table-scroll"><table><thead><tr><th scope="col">Año</th><th scope="col">Monto</th><th scope="col">Variación</th>${basis?`<th scope="col">${shareHeading}</th>`:''}<th scope="col">Estado</th></tr></thead><tbody>
        ${rows.flatMap(row=>{
          if(row.detail?.length) return row.detail.map(item=>`<tr><th scope="row">${row.year}<br><small>${safe(item.label)}</small></th>
            <td class="price">${millions(item.value)}</td><td>—</td>${basis?`<td>${Number.isFinite(item.share)?safe(percent(item.share)):'—'}</td>`:''}
            <td>${safe(item.status)}${item.inflation?`<br><small>${safe(item.inflation)}</small>`:''}</td></tr>`);
          return [`<tr><th scope="row">${row.year}</th><td class="price">${Number.isFinite(row.value)?millions(row.value):'—'}</td><td>${changeText(row)}</td>
            ${basis?`<td>${Number.isFinite(row.share)?safe(percent(row.share)):'—'}</td>`:''}<td>${safe(row.status)}${row.inflation?`<br><small>${safe(row.inflation)}</small>`:''}</td></tr>`];
        }).join('')}</tbody></table></div>
      ${children.length?`<h3>Partidas de este rubro</h3><div class="table-scroll"><table><thead><tr><th scope="col">Partida</th>${state.selected.map(year=>`<th scope="col">${year}</th>`).join('')}</tr></thead><tbody>
      ${children.map(key=>`<tr><th scope="row"><button type="button" class="row-link" data-pick="${key}">${safe(catalog[key].name)}</button></th>
        ${initialRows(key,state.selected).map(row=>`<td class="price">${Number.isFinite(row.value)?millions(row.value):row.detail?.length?'Ver proyecto':'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}
      <button type="button" class="secondary" data-download>Descargar CSV</button>
    </div>
  </details>`;
}

function analytics(detailOpen=false,announcementsOpen=false){
  const topic = catalog[state.topic];
  const rows = variations(compareRows(data,state));
  const project = rows.flatMap(row=>row.detail??[]);
  return `<div class="section-heading selection-heading"><div><h2 id="current-topic">${safe(topic.name)}</h2><p class="muted">${rangeText(state)}</p></div>
    <button type="button" class="secondary filter-button" data-filter aria-haspopup="dialog">${icon('filters')} Años y corte</button></div>
  <div class="chart-grid">
    <article class="panel chart-card">
      <h3><span class="chart-icon tone-orange">${icon('chart')}</span>Evolución del monto</h3>
      ${budgetTrend(rows)||'<p class="note chart-empty">Sin serie comparable para esta selección.</p>'}
      <div class="compare-years" style="--year-count:${rows.length}">${rows.map(row=>`<div class="compare-year">
        <span class="year-tag">${row.year}${row.year===2027&&state.measure==='initial'?' · Proyecto':''}</span>
        ${Number.isFinite(row.value)?`<b class="price">${millions(row.value)}</b>${row.pct===null?'':`<small class="change">${changeText(row)}</small>`}`:
        `<small class="muted">${row.detail?.length?'Ver proyecto':safe(row.status)}</small>`}</div>`).join('')}</div>
      ${topic.note?`<p class="note">${safe(topic.note)}</p>`:''}
      ${state.topic==='recursos'?'<p class="note">En 2026, el artículo 2 y la Planilla 8 distribuyen $740 de forma distinta entre recursos corrientes y de capital. El total coincide.</p>':''}
      ${topic.differentScope&&state.measure!=='initial'?'<p class="note">La ejecución corresponde a Promoción y Asistencia Social, de alcance distinto a la finalidad Bienestar Social.</p>':''}
    </article>
    ${sharePanel(rows,topic)}
  </div>
  ${project.length?`<section class="panel project-card"><h3>2027 · Importes del proyecto</h3><p class="note">Estos importes tienen otro alcance. El gráfico usa la serie comparable.</p>
    <div class="project-values">${project.map(row=>`<div><b>${safe(row.label)}</b><strong class="price">${millions(row.value)}</strong><small class="muted">${safe([row.reference,row.scope,row.inflation].filter(Boolean).join(' · '))}</small></div>`).join('')}</div></section>`:''}
  ${breakdown(rows,topic,detailOpen)}
  ${state.topic==='obras'?`<details class="panel breakdown" id="announcements" ${announcementsOpen?'open':''}><summary>Anuncios sobre obras</summary>
    <div class="breakdown-content">${data.claims.map(claim=>`<article class="claim"><small class="muted">${safe(claim.date)}</small><h3>${safe(claim.title)}</h3><p>${safe(claim.body)}</p></article>`).join('')}</div></details>`:''}`;
}

function methodContent(){
  return `<section class="source-group"><h3>Metodología</h3>
    <details open><summary>Ajuste por inflación</summary><p>Multiplicamos cada monto por el IPC medio del año base dividido por el IPC medio del período. Se usa el IPC NOA y el escenario central para el cálculo anual. El acumulado semestral usa el promedio de ese semestre como aproximación.</p>
    <ul>${data.deflators.map(row=>`<li>${row.ejercicio} · ${row.meses_observados} meses observados · ${row.meses_proyectados} proyectados</li>`).join('')}</ul>
    <p>${sourceLink('https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv','INDEC · series de IPC')} · ${sourceLink('https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informes/relevamiento-expectativas-mercado-2026-10.pdf','BCRA · REM de octubre de 2026')}</p></details>
    <details><summary>Participación y resultado</summary><p>Cada partida de gastos se divide por el gasto total del mismo indicador y corte. Los recursos se dividen por los ingresos totales previstos. La participación se conserva en pesos corrientes y constantes.</p><p>El resultado se calcula con ingresos y gastos sin redondear.</p></details>
    <details><summary>Crédito, ejecución y alcance</summary><p>El crédito vigente incorpora modificaciones. El devengado registra una obligación de pago. El 2027 figura como proyecto. Cuando cambia el alcance de un rubro, sus montos aparecen por separado. La descarga deja vacías las celdas sin dato.</p></details>
  </section>`;
}

function sourcesContent(){
  const yearly = years.map((year,i)=>{
    const entries = new Map();
    for(const row of data.annual.filter(item=>item.ejercicio===year)){
      if(!entries.has(row.fuente)) entries.set(row.fuente,row.referencia.startsWith('Art.')
        ? (year===2027?'Proyecto de presupuesto':'Ley de presupuesto'):row.referencia);
    }
    for(const list of Object.values(data.budgetSources)){
      if(list[i]) entries.set(list[i][1],list[i][0]);
    }
    if(year===2027) for(const item of data.projectItems) entries.set(item.source,item.reference);
    for(const row of data.execution){
      const address=row[`fuente_${year}`];
      if(address&&!entries.has(address)) entries.set(address,row.codigo==='total'?'Ejecución I.1 · devengado enero a junio':'Ejecución I.3 · devengado enero a junio');
    }
    for(const row of data.closing.filter(item=>item.ejercicio===year)){
      if(!entries.has(row.fuente)) entries.set(row.fuente,row.cuadro);
    }
    return `<section class="source-group"><h3>${year} <small>${budgetStatus(year)}</small></h3>
      <ul>${[...entries].map(([link,label])=>`<li>${sourceLink(link,label)}</li>`).join('')}</ul></section>`;
  });
  const series = new Map();
  for(const row of data.indicators){
    if(!series.has(row.fuente)) series.set(row.fuente,new Set());
    series.get(row.fuente).add(row.indicador);
  }
  return `<div class="dialog-head"><h2 id="sources-title">Fuentes</h2><button type="button" class="round" data-close aria-label="Cerrar Fuentes">${icon('close')}</button></div>
    <div class="source-body">${yearly.join('')}
    <section class="source-group"><h3>Indicadores sociales</h3><ul>${[...series].map(([link,names])=>
      `<li>${sourceLink(link,[...names].slice(0,2).join(' · '))}${names.size>2?`<small class="muted"> y ${names.size-2} series más</small>`:''}</li>`).join('')}</ul></section>
    <section class="source-group"><h3>Comunicados oficiales</h3><ul>${data.claims.map(claim=>`<li>${sourceLink(claim.url,claim.title)} <small class="muted">${safe(claim.date)}</small></li>`).join('')}</ul></section>
    ${methodContent()}</div>`;
}

function showSources(){
  if(sourceDialog.open) return;
  sourceDialog.innerHTML = sourcesContent();
  sourceDialog.showModal();
}

function dashboard(){
  main.innerHTML=`${summary()}
  <div class="explorer-layout">
    <details id="picker" class="panel picker" ${pickerMedia.matches?'open':''}>
      <summary><span>Partidas</span><span class="picker-current">${safe(catalog[state.topic].name)}</span></summary>
      <div class="picker-body"><label class="search-label">${icon('search')}<input id="partida-search" type="search" placeholder="Buscar una partida" aria-label="Buscar una partida" value="${safe(searchText)}"></label>
      <div id="topic-tree" class="tree-scroll">${topicNodes()}</div></div>
    </details>
    <section id="analytics" class="analytics" aria-labelledby="current-topic">${analytics(false,state.panel==='anuncios')}</section>
  </div>
  <details class="panel indicators" id="social-panel" ${state.tab==='indicadores'?'open':''}><summary>Indicadores sociales</summary><div id="social-content">${indicators()}</div></details>`;
}

function refreshAnalytics(){
  const chart=document.querySelector('#analytics');
  const active=document.activeElement;
  const open=document.querySelector('#breakdown').open;
  const announcementsOpen=document.querySelector('#announcements')?.open;
  chart.innerHTML=analytics(open,announcementsOpen);
  if(active?.matches('[data-filter]')) chart.querySelector('[data-filter]').focus({preventScroll:true});
}

function writeState(delta,{push=false,section='comparar'}={}){
  state={...state,...delta,tab:section};
  history[push?'pushState':'replaceState'](null,'',stateHash(state));
}

function pickTopic(topic,fromPicker,initial=false){
  const picker=document.querySelector('#picker');
  const fromBreakdown=document.activeElement?.closest('#breakdown');
  writeState({topic,measure:!initial&&catalog[topic].execution?state.measure:'initial',panel:'presupuesto'},{push:true});
  revealTopic(topic);
  if(budgetTree[topic]?.length) expandedBranches.add(topic);
  if(!fromPicker){
    searchText='';
    document.querySelector('#partida-search').value='';
  }
  picker.querySelector('.picker-current').textContent=catalog[topic].name;
  const tree=document.querySelector('#topic-tree');
  tree.innerHTML=topicNodes();
  refreshAnalytics();
  if(fromPicker){
    if(pickerMedia.matches) tree.querySelector(`[data-pick="${topic}"]`)?.focus({preventScroll:true});
    else{
      picker.open=false;
      picker.querySelector('summary').focus({preventScroll:true});
    }
  }
  if(fromBreakdown){
    const heading=document.querySelector('#current-topic');
    heading.tabIndex=-1;
    heading.focus();
  }
}

function updateMoney(delta){
  const active=document.activeElement;
  writeState(delta);
  main.querySelector('.budget-summary').outerHTML=summary();
  refreshAnalytics();
  document.querySelector('#social-content').innerHTML=indicators();
  if(active?.dataset.unit) main.querySelector(`[data-unit="${state.unit}"]`).focus({preventScroll:true});
  if(active?.id==='base-year') main.querySelector('#base-year')?.focus({preventScroll:true});
}

function drawFilters(){
  const options = (entries,active)=>entries.map(([key,label])=>`<option value="${key}" ${key===active?'selected':''}>${label}</option>`).join('');
  dialog.innerHTML=`<form id="filter-form"><div class="dialog-head"><h2 id="filter-title">Años y corte</h2><button class="round" type="button" data-close aria-label="Cerrar filtros">${icon('close')}</button></div>
    <p class="filter-topic">${safe(catalog[draft.topic].name)}</p>
    <fieldset><legend>Años</legend>${yearButtons(draft.selected,'draft-year')}</fieldset>
    <label class="select-label">Qué querés comparar<select data-draft="measure" ${catalog[draft.topic].execution?'':'disabled'}>${options(Object.entries(measures),draft.measure)}</select></label>
    <label class="select-label">Período<select data-draft="cut" ${draft.measure!=='accrued'?'disabled':''}>${options([['semester','Enero a junio'],['annual','Cierre anual']],draft.measure==='accrued'?draft.cut:'annual')}</select></label>
    <p role="alert" id="filter-message"></p><button class="primary" type="submit">Aplicar</button></form>`;
}

function openFilters(){
  draft={...state,selected:[...state.selected]};
  drawFilters();
  dialog.showModal();
}

function restoreView(){
  state = parseState(location.hash,catalog);
  if(!new URLSearchParams(location.hash.slice(1)).has('tema')) state.topic='capital';
  if(state.tab==='tema'&&state.panel==='ejecucion'&&catalog[state.topic].execution) state.measure='accrued';
  if(state.measure==='currentCredit') state.cut='annual';
  revealTopic(state.topic);
  dashboard();
  if(state.tab==='fuentes') showSources();
  if(state.tab==='indicadores') document.querySelector('#social-panel').scrollIntoView();
  if(state.tab==='tema'&&state.panel==='anuncios') document.querySelector('#announcements')?.scrollIntoView();
}

document.querySelector('#source-icon').innerHTML=icon('files');
document.querySelector('#share').innerHTML=icon('share');
document.querySelector('#share').addEventListener('click',share);
document.querySelector('[data-sources]').addEventListener('click',showSources);
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();main.focus();});
document.addEventListener('input',event=>{
  if(event.target.id!=='partida-search')return;
  searchText=event.target.value;
  document.querySelector('#topic-tree').innerHTML=topicNodes();
});
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button)return;
  const b=button.dataset;
  if(b.pick) pickTopic(b.pick,Boolean(button.closest('#picker')));
  if(b.aggregate) pickTopic(b.aggregate,false,true);
  if(b.branch){
    if(expandedBranches.has(b.branch)) expandedBranches.delete(b.branch);
    else expandedBranches.add(b.branch);
    const tree=document.querySelector('#topic-tree');
    tree.innerHTML=topicNodes();
    tree.querySelector(`[data-branch="${b.branch}"]`)?.focus({preventScroll:true});
  }
  if(b.unit) updateMoney({unit:b.unit});
  if('filter' in b) openFilters();
  if('download' in b) download();
  if('close' in b) button.closest('dialog').close();
  if(b.draftYear){
    const year=Number(b.draftYear);
    draft.selected=years.filter(item=>item===year?!draft.selected.includes(item):draft.selected.includes(item));
    button.setAttribute('aria-pressed',String(draft.selected.includes(year)));
    dialog.querySelector('#filter-message').textContent='';
  }
  if(b.socialYear){
    writeState({year:Number(b.socialYear)},{section:'indicadores'});
    const social=document.querySelector('#social-content');
    social.innerHTML=indicators();
    social.querySelector(`[data-social-year="${state.year}"]`).focus({preventScroll:true});
  }
});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='base-year') updateMoney({baseYear:Number(target.value)});
  if(target.id==='indicator'){
    writeState({social:target.value},{section:'indicadores'});
    const social=document.querySelector('#social-content');
    social.innerHTML=indicators();
    social.querySelector('#indicator').focus({preventScroll:true});
  }
  if(target.dataset.draft==='cut') draft.cut=target.value;
  if(target.dataset.draft==='measure'){
    draft.measure=target.value;
    draft.cut=draft.measure==='currentCredit'?'annual':'semester';
    drawFilters();
    dialog.querySelector('[data-draft="measure"]').focus();
  }
});
dialog.addEventListener('submit',event=>{
  event.preventDefault();
  if(draft.selected.length<2){
    dialog.querySelector('#filter-message').textContent='Seleccioná al menos dos años.';
    return;
  }
  dialog.close();
  writeState(draft,{push:true});
  refreshAnalytics();
});
for(const modal of [dialog,sourceDialog]) modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
pickerMedia.addEventListener('change',event=>{document.querySelector('#picker').open=event.matches;});
window.addEventListener('hashchange',restoreView);
restoreView();
