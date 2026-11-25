const data = JSON.parse(document.querySelector('#data').textContent);
const main = document.querySelector('#contenido');
const nav = document.querySelector('#nav');
const dialog = document.querySelector('#filters');
const status = document.querySelector('#toast');
const format = new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});
const pctFormat = new Intl.NumberFormat('es-AR',{maximumFractionDigits:2,signDisplay:'exceptZero'});
const num = n=>format.format(n);
const millions = n=>'$'+num(n/1e6);
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
const moneyUnits = state=>state.unit==='real'?'Millones de pesos promedio de 2025 · IPC NOA (INDEC)':'Millones de pesos corrientes';
const indicatorKeys = [...new Set(data.indicators.map(r=>r.indicador))];
let state = parseState(location.hash);
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
  return `<div class="hero"><div><h1>Presupuesto<br>Jujuy</h1><p class="sub">Presupuesto provincial · 2025, 2026 y 2027</p></div><div class="controls">${yearButtons([state.year],'year')}${unitButtons(state.unit,'unit')}</div></div>
   <div class="layout"><article class="lead home-data"><small class="muted">${state.year} · ${safe(row.status)}</small><h2>Gasto total</h2><strong class="price">${millions(row.value)}</strong><small class="muted">${moneyUnits(state)}</small>
   ${row.inflation?`<small class="muted">${safe(row.inflation)}</small>`:''}
   ${state.year===2027?'<p class="note">El proyecto tiene cifras agregadas. Los anexos por tema y la ejecución están pendientes en esta base.</p>':''}
   <div class="actions"><button class="primary" type="button" data-filter="total">Comparar gasto total</button>${sourceLink(row.source)}</div></article>
   <section><h2 class="section-title">Explorar por tema</h2><div class="topic-list">${Object.entries(topics).filter(([key])=>key!=='total').map(([key,t])=>
   `<button type="button" class="topic ${t.color}" data-topic="${key}"><strong>${t.name}</strong><span class="glyph">${icon(t.icon)}</span></button>`).join('')}</div>
   <button type="button" class="text-button" data-tab="indicadores">Ver indicadores sociales de Jujuy</button></section></div>`;
}

function topicView(){
  const topic = topics[state.topic];
  const layers = [['presupuesto','Presupuesto','rust','total'],['ejecucion','Ejecución','orange','chart'],['anuncios','Anuncios','aqua','announce']];
  const content = {
    presupuesto:()=>valueRow('Crédito inicial / proyecto',currentRow('initial','annual'))+
      valueRow('Crédito vigente al cierre',currentRow('currentCredit','annual')),
    ejecucion:()=>valueRow('Devengado · enero a junio',currentRow('accrued','semester'))+
      valueRow('Devengado · cierre anual',currentRow('accrued','annual'))+
      '<p class="note">El pagado y la ejecución como porcentaje del crédito vigente al mismo corte requieren un cuadro compatible para esta partida.</p>',
    anuncios:()=>state.topic==='obras' && state.year===2026?data.claims.map(claim=>`<article class="data-row"><small class="muted">${safe(claim.date)}</small><h3>${safe(claim.title)}</h3><p>${safe(claim.body)}</p>${sourceLink(claim.url,'Comunicado oficial')}</article>`).join(''):'<p class="note">Sin anuncios incorporados para este tema y año.</p>'
  };
  return `<button class="back" type="button" data-tab="inicio">Volver a Inicio</button>
   <div class="hero"><div><h1>${topic.name}</h1><p class="sub">Presupuesto provincial · ${state.year}</p></div><div class="controls">${yearButtons([state.year],'year')}${unitButtons(state.unit,'unit')}</div></div>
   <div class="layout"><div><div class="layers">${layers.map(([key,label,color,g])=>`<button type="button" class="layer ${color}" data-panel="${key}" aria-pressed="${state.panel===key}">${label}<span class="glyph">${icon(g)}</span></button>`).join('')}</div>
   <div class="actions"><button type="button" class="primary" data-filter="${state.topic}">Comparar este tema</button><button type="button" class="secondary" data-tab="fuentes">Ver fuentes</button></div></div>
   <section class="lead detail" aria-label="Detalle"><h2>${layers.find(([key])=>key===state.panel)[1]}</h2><small class="muted">${moneyUnits(state)}</small>
   ${content[state.panel]()}
   ${topic.differentScope?'<p class="note">Bienestar Social en la ley y Promoción y Asistencia Social en ejecución tienen alcances distintos.</p>':''}</section></div>`;
}

function compare(){
  const topic = topics[state.topic];
  const rows = variations(compareRows(data,state));
  const filled = rows.filter(r=>Number.isFinite(r.value));
  const maximum = Math.max(1,...filled.map(r=>r.value));
  return `<div class="compare-head"><h1>${topic.name}</h1><p class="sub">${measures[state.measure]} · ${rangeText(state)}</p>
  <div class="actions">${unitButtons(state.unit,'unit')}<button class="secondary" type="button" data-filter="${state.topic}">Editar comparación</button></div></div>
  <div class="results"><article class="lead"><h2>Montos por año</h2><p class="muted">${moneyUnits(state)}</p>
  <div class="bars" role="list">${rows.map(r=>`<div class="bar-row" role="listitem"><strong>${r.year}</strong>
  ${Number.isFinite(r.value)?`<div class="track" aria-hidden="true"><div class="fill" style="width:${Math.max(0,r.value/maximum)*100}%"></div></div><span class="price">${millions(r.value)}</span>`:`<span class="muted">${safe(r.status)}</span><span aria-hidden="true">—</span>`}</div>`).join('')}</div>
  ${filled.length<2?'<p class="note">Hacen falta dos montos del mismo indicador y corte para calcular una variación.</p>':''}</article>
  <section class="lead"><div class="actions"><h2>Desglose</h2><button type="button" class="secondary" data-download>Descargar CSV</button><button type="button" class="secondary" data-tab="fuentes">Ver metodología</button></div>
  <div class="table-scroll"><table><thead><tr><th>Año</th><th>Monto</th><th>Variación</th>${state.measure==='initial'?'<th>% del gasto</th>':''}<th>Estado y fuente</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><th scope="row">${r.year}</th><td class="price">${Number.isFinite(r.value)?millions(r.value):'—'}</td><td>${r.pct===null?'—':`${pctFormat.format(r.pct)}%<br><small class="muted">vs. ${r.priorYear}</small>`}</td>
  ${state.measure==='initial'?`<td>${Number.isFinite(r.share)?num(r.share)+'%':'—'}</td>`:''}<td>${safe(r.status)}${r.inflation?`<br><small>${safe(r.inflation)}</small>`:''}${r.source?`<br>${sourceLink(r.source,'Abrir fuente')}`:''}</td></tr>`).join('')}
  </tbody></table></div></section></div>`;
}

function sources(){
  const original = data.annual.find(r=>r.ejercicio===state.year && r.concepto==='Gasto total');
  const work = data.annual.find(r=>r.ejercicio===state.year && r.concepto==='Trabajos Públicos');
  const exec = data.execution.find(r=>r.codigo==='total');
  const functionExec = data.execution.find(r=>r.codigo==='obras');
  const list = [original&&[original.estado_presupuesto==='proyecto'?'Proyecto de Presupuesto':'Ley de Presupuesto',original.fuente,'Crédito inicial · ejercicio completo'],
    work&&['Planilla de Trabajos Públicos',work.fuente,work.referencia],
    state.year!==2027&&['Hacienda · ejecución I.1',exec[`fuente_${state.year}`],'Devengado agregado · enero a junio'],
    state.year!==2027&&['Hacienda · ejecución I.3',functionExec[`fuente_${state.year}`],'Por finalidad, función y objeto · enero a junio'],
    state.year===2025&&['Cuenta de Inversión 2025',data.closing[0].fuente,'Cierre anual · cuadro 20'],
    ['INDEC · series de IPC','https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv','Nivel general de la región Noroeste y total nacional']].filter(Boolean);
  return `<div class="hero"><div><h1>Fuentes</h1><p class="sub">Documentos y metodología del comparador.</p></div>${yearButtons([state.year],'year')}</div>
  <div class="layout"><section><h2>Documentos de ${state.year}</h2><ul class="source-list">${list.map(([title,link,note])=>`<li>${sourceLink(link,title)}<small>${safe(note)}</small></li>`).join('')}</ul></section>
  <article class="lead detail"><h2>Cómo se comparan los montos</h2>
  <details open><summary>Ajuste por inflación</summary><p class="muted">Aplicamos el IPC NOA. El monto corriente se multiplica por el IPC medio de 2025 dividido por el IPC medio del período. El ajuste anual usa el escenario central. El acumulado semestral se ajusta con el promedio de ese semestre como aproximación.</p>
  <ul class="source-list">${data.deflators.map(d=>`<li>${d.ejercicio} · ${d.meses_observados} meses observados · ${d.meses_proyectados} proyectados</li>`).join('')}</ul><p class="method">${sourceLink('https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informes/relevamiento-expectativas-mercado-2026-10.pdf','REM de octubre de 2026')}</p></details>
  <details><summary>Crédito, ejecución y anuncios</summary><p class="muted">El crédito inicial se consulta en la ley o en el proyecto cuando se indica. El crédito vigente incorpora modificaciones. El devengado registra una obligación de pago. Los anuncios se presentan con su fecha y su propio alcance.</p></details>
  <details><summary>Proyecto y datos pendientes</summary><p class="muted">La base incorpora agregados del proyecto 2027. Una partida sin planilla o corte de ejecución queda sin monto. La variación indica el año anterior seleccionado que se tomó como base. Las celdas sin dato quedan vacías en la descarga.</p></details></article></div>`;
}

function indicators(){
  const indicator = indicatorKeys.includes(state.social) ? state.social : 'Incidencia de pobreza en personas';
  const rows = data.indicators.filter(r=>r.indicador===indicator && r.periodo.startsWith(String(state.year))).reverse();
  return `<button class="back" type="button" data-tab="inicio">Volver a Inicio</button><div class="hero"><div><h1>Indicadores sociales</h1><p class="sub">Jujuy · datos observados por fuente y cobertura</p></div>${yearButtons([state.year],'year')}</div>
  <div class="results"><article class="lead"><label class="select-label">Indicador<select id="indicator">${indicatorKeys.map(name=>`<option ${name===indicator?'selected':''}>${safe(name)}</option>`).join('')}</select></label>
  ${rows.length?`<div class="table-scroll"><table><thead><tr><th>Período</th><th>Valor</th><th>Cobertura y fuente</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${safe(r.periodo)}</th><td>${num(r.valor)} ${safe(r.unidad)}</td><td>${safe(r.cobertura)}<br>${sourceLink(r.fuente,'Abrir fuente')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">Sin observaciones incorporadas para este indicador y año.</p>'}</article></div>`;
}

const views = {inicio:home,tema:topicView,comparar:compare,fuentes:sources,indicadores:indicators};
function render(focus = false){
  const localId = document.activeElement?.id;
  const dataAttrs = {...document.activeElement?.dataset};
  main.innerHTML = views[state.tab]();
  const tab = ['tema','indicadores'].includes(state.tab)?'inicio':state.tab;
  nav.innerHTML = [['inicio','Inicio','home'],['comparar','Comparar','chart'],['fuentes','Fuentes','files']].map(([key,text,g])=>
    `<button class="nav-item" type="button" data-nav="${key}" ${key===tab?'aria-current="page"':''}>${icon(g)}${text}</button>`).join('');
  if(focus){
    const heading = main.querySelector('h1');
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
    window.scrollTo(0,0);
  } else if(localId==='indicator') document.querySelector('#indicator')?.focus({preventScroll:true});
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
  draft = {...state,topic,selected:[...state.selected]};
  drawFilters();
  dialog.showModal();
  dialog.querySelector('#topic-select').focus();
}

function drawFilters(focusSelector){
  const options = (entries,active)=>entries.map(([key,label])=>`<option value="${key}" ${key===active?'selected':''}>${label}</option>`).join('');
  dialog.innerHTML = `<form id="filter-form"><header><h2 id="filter-title">Comparar años</h2><button class="round" type="button" data-close aria-label="Cerrar">${icon('close')}</button></header>
  <label class="select-label">Tema<select id="topic-select" data-draft="topic">${options(Object.entries(topics).map(([key,t])=>[key,t.name]),draft.topic)}</select></label>
  <fieldset><legend>Años · elegí al menos dos</legend>${yearButtons(draft.selected,'draft-year')}</fieldset>
  <div class="filters-grid"><label>Indicador<select data-draft="measure">${options(Object.entries(measures),draft.measure)}</select></label>
  <label>Período<select data-draft="cut" ${draft.measure!=='accrued'?'disabled':''}>${options([['semester','Enero a junio'],['annual','Anual']],draft.measure==='accrued'?draft.cut:'annual')}</select></label></div>
  <fieldset><legend>Valores</legend>${unitButtons(draft.unit,'draft-unit')}</fieldset>
  <p class="hint">2027 se muestra con el estado de cada dato disponible.</p>
  <p role="alert" id="filter-message"></p><button class="primary" type="submit">Ver comparación</button></form>`;
  if(focusSelector) dialog.querySelector(focusSelector)?.focus();
}

function download(){
  const contents = csvRows(variations(compareRows(data,state)),state);
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
  if(b.nav==='comparar') openFilters(state.tab==='tema'||state.tab==='comparar'?state.topic:'total');
  else if(b.nav) update({tab:b.nav},{push:true,focus:true});
  if(b.filter) openFilters(b.filter);
  if(b.topic) update({tab:'tema',topic:b.topic,panel:'presupuesto'},{push:true,focus:true});
  if(b.year) update({year:Number(b.year)});
  if(b.unit) update({unit:b.unit});
  if(b.panel) update({panel:b.panel});
  if('download' in b) download();
  if('close' in b) dialog.close();
  if(b.draftYear){
    const y=Number(b.draftYear);
    draft.selected=draft.selected.includes(y)?draft.selected.filter(n=>n!==y):years.filter(n=>n===y||draft.selected.includes(n));
    button.setAttribute('aria-pressed',String(draft.selected.includes(y)));
    dialog.querySelector('#filter-message').textContent='';
  }
  if(b.draftUnit){
    draft.unit=b.draftUnit;
    dialog.querySelectorAll('[data-draft-unit]').forEach(control=>control.setAttribute('aria-pressed',String(control.dataset.draftUnit===draft.unit)));
  }
});
document.addEventListener('change',event=>{
  const field=event.target.dataset.draft;
  if(field){
    draft[field]=event.target.value;
    if(field==='measure'){
      if(draft.measure==='currentCredit') draft.cut='annual';
      if(draft.measure==='accrued') draft.cut='semester';
      drawFilters('[data-draft="measure"]');
    }
  }
  if(event.target.id==='indicator') update({social:event.target.value});
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
window.addEventListener('hashchange',()=>{state=parseState(location.hash);render(true);});
render();
