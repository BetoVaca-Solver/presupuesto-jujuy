const reportDialog = document.querySelector('#report-dialog');
const reportPrint = document.querySelector('#report-print');
const reportNumber = new Intl.NumberFormat('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1});
const reportChange = new Intl.NumberFormat('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1,signDisplay:'exceptZero'});
const reportIncomeShare = new Intl.NumberFormat('es-AR',{maximumFractionDigits:3});
const reportAmount = value=>Number.isFinite(value)?reportNumber.format(value/1e6):'—';
const reportPercent = value=>Number.isFinite(value)?safe(percent(value)):'—';
const reportDelta = value=>Number.isFinite(value)?reportChange.format(value)+'%':'—';
let reportFormat = 'short';
let reportState;

function reportTable(headers,rows,label){
  return `<table aria-label="${safe(label)}"><thead><tr>${headers.map(header=>`<th scope="col">${header}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([first,...cells])=>`<tr><th scope="row">${first}</th>${cells.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function reportSection(heading,content,note=''){
  return `<section class="report-section"><h3>${heading}</h3>${content}${note?`<p>${note}</p>`:''}</section>`;
}

function reportHeading(title,subtitle){
  return `<header class="report-heading"><p class="report-institution">PROVINCIA DE JUJUY</p>
    <h2>${title}</h2><p>${subtitle}</p></header>`;
}

function reportFooter(model,view){
  const counts = data.deflators.filter(row=>row.meses_proyectados && (view.selected.includes(row.ejercicio)
    || (view.unit==='real'&&view.baseYear===row.ejercicio)));
  const projected = counts.length?` IPC con meses proyectados (${counts.map(row=>`${row.ejercicio}, ${row.meses_proyectados}`).join(' · ')}).`:'';
  const september = model.executionYears.length?' Para el devengado a septiembre se usa el IPC medio de enero a septiembre.':'';
  const semester = view.measure==='accrued'&&view.cut==='semester'&&view.unit==='real'
    ? ' La partida devengada a junio usa el IPC medio del semestre.':'';
  return `<footer class="report-footer"><p>Las variaciones reales usan el IPC NOA. Las participaciones se calculan sobre el total del mismo año e indicador.${projected}${september}${semester}</p>
    <p>Fuentes. ${model.sources.map(([address,label])=>sourceLink(address,label)).join(' · ')}</p></footer>`;
}

function reportSummarySections(model,view) {
  const {cash,trend,balanceShare} = model;
  const {selected} = view;
  const end = selected.at(-1);
  const balanceNote = `El ${cash.saldo.at(-1).value<0?'déficit':'superávit'} previsto para ${end} equivale a ${reportIncomeShare.format(Math.abs(balanceShare.at(-1)))}% de los recursos.`;
  const accounts = reportTable(['Año','Recursos','Gastos','Resultado previsto'],selected.map((year,i)=>[
    `${year} · ${budgetStatus(year)}`,...['recursos','total','saldo'].map(key=>reportAmount(cash[key][i].value))
  ]),'Recursos, gastos y resultado');
  const compared = selected.slice(1);
  const changes = reportTable(['Concepto',...compared.flatMap((year,i)=>[
    `${year}/${String(selected[i]).slice(-2)}<br>Nominal`,`${year}/${String(selected[i]).slice(-2)}<br>Real`
  ])],trend.map(row=>[row.label,...compared.flatMap((year,i)=>[reportDelta(row.nominal[i+1].pct),reportDelta(row.real[i+1].pct)])]),'Variaciones del gasto');
  const realNote = compared.length?`Entre ${selected.at(-2)} y ${end}, la variación real ${end===2025?'':'estimada '}es de ${reportDelta(trend[0].real.at(-1).pct)} en el gasto total, ${reportDelta(trend[1].real.at(-1).pct)} en el corriente y ${reportDelta(trend[2].real.at(-1).pct)} en capital.`:'';
  const mix = reportTable(['Componente',...selected.map(year=>`% ${year}`),`Monto ${end}`],
    ['corriente','capital'].map(key=>[topics[key].name,...cash[key].map(row=>reportPercent(row.share)),reportAmount(cash[key].at(-1).value)]),'Composición del gasto');
  return reportSection('Recursos, gastos y resultado',accounts,balanceNote)
    +reportSection('Evolución del gasto · Análisis horizontal',changes,realNote)
    +reportSection('Composición del gasto · Análisis vertical',mix,
      'El gasto corriente incluye personal, funcionamiento y transferencias. El gasto de capital incluye construcciones y equipamiento.');
}

function reportTopicSection(model,view) {
  const topic = catalog[view.topic];
  const {selected,educationCapital,shareBasis} = model;
  const shareHeading = shareBasis==='recursos'?'% de recursos':view.measure==='currentCredit'?'% del crédito':'% del gasto';
  const columns = ['Año','Monto',...(shareBasis?[shareHeading]:[]),'Variación',...(educationCapital.length?['Capital']:[])];
  const rows = selected.map((row,i)=>[
    `${row.year} · ${safe(view.measure==='initial'?budgetStatus(row.year):row.status)}`,
    reportAmount(row.value),...(shareBasis?[reportPercent(row.share)]:[]),reportDelta(row.pct),
    ...(educationCapital.length?[reportAmount(educationCapital[i].value)]:[])
  ]);
  const projectDetail = selected.flatMap(row=>row.detail??[]);
  const unavailable = selected.filter(row=>!Number.isFinite(row.value)&&!row.detail?.length).map(row=>row.year);
  const notes = [
    projectDetail.length?`<strong>2027 · Proyecto con otro alcance.</strong> ${projectDetail.map(item=>`${safe(item.label)} (${reportAmount(item.value)})`).join(' · ')}.`:'',
    unavailable.length?`Sin dato comparable para ${unavailable.join(' y ')}.`:'',
    topic.note?safe(topic.note):'',
    topic.differentScope&&view.measure!=='initial'?'La ejecución corresponde a Promoción y Asistencia Social, de alcance distinto a Bienestar Social.':'',
    educationCapital.length&&educationCapital.at(-1).pct!==null
      ?`El gasto de capital del Ministerio varía ${reportDelta(educationCapital.at(-1).pct)} entre ${educationCapital.at(-1).priorYear} y ${educationCapital.at(-1).year}, en los valores elegidos.`:''
  ].filter(Boolean).join(' ');
  return reportSection(`Partida seleccionada · ${safe(topic.name)}`,
    `<p class="report-scope">${safe(rangeText(view))}</p>${reportTable(columns,rows,topic.name)}`,notes);
}

function reportExecutionSection(model,view) {
  const {execution,executionYears} = model;
  const caption = 'Ejecución provincial · Enero a septiembre';
  if(!executionYears.length) return reportSection(caption,'<p>Sin ejecución publicada para el año seleccionado.</p>');
  const compared = executionYears.length>1;
  const rows = execution.map(row=>[row.label,...row.rows.map(item=>reportAmount(item.value)),...(compared?[reportDelta(row.realChange)]:[])]);
  const note = [
    compared?`En el mismo corte, la variación real del devengado de Trabajos Públicos fue de ${reportDelta(execution.at(-1).realChange)}.`:'',
    view.selected.includes(2027)?'2027 figura como proyecto.':''
  ].filter(Boolean).join(' ');
  return reportSection(caption,reportTable(['Concepto',...executionYears.map(year=>`Devengado ${year}`),...(compared?['Variación real']:[])],rows,caption),note);
}

function reportMarkup(view,layout) {
  const model = buildReport(data,view,catalog);
  const units = safe(moneyUnits(view));
  const span = view.selected.join(' · ');
  const title = `Informe presupuestario`;
  const label = `${span} · ${units}`;
  const summary = reportSummarySections(model,view);
  const detail = reportTopicSection(model,view)+reportExecutionSection(model,view);
  const footer = reportFooter(model,view);
  if(layout==='short') return `<article class="report-page report-short">${reportHeading(title,label)}${summary}${detail}${footer}</article>`;
  return `<article class="report-page">${reportHeading(title,label)}${summary}<p class="report-page-number">1 / 2</p></article>
    <article class="report-page">${reportHeading('Partida y ejecución',label)}${detail}${footer}<p class="report-page-number">2 / 2</p></article>`;
}

function drawReportPreview() {
  for(const button of reportDialog.querySelectorAll('[data-report-format]')) {
    button.setAttribute('aria-pressed',String(button.dataset.reportFormat===reportFormat));
  }
  reportDialog.querySelector('#report-preview').innerHTML = reportMarkup(reportState,reportFormat);
}

function showReport() {
  if(reportDialog.open) return;
  reportState = {...state,selected:[...state.selected]};
  reportDialog.innerHTML = `<div class="dialog-head"><h2 id="report-dialog-title">Generar informe</h2>
    <button class="round" type="button" data-close aria-label="Cerrar informe">${icon('close')}</button></div>
    <div class="report-controls"><div class="units" role="group" aria-label="Formato del informe">
      <button class="pill" type="button" data-report-format="short">Breve · 1 hoja</button>
      <button class="pill" type="button" data-report-format="long">Ampliado · 2 hojas</button>
    </div><button class="primary" type="button" data-print-report>Imprimir o guardar PDF</button></div>
    <div id="report-preview"></div>`;
  drawReportPreview();
  reportDialog.showModal();
}

function clearPrintReport() {
  delete document.body.dataset.printReport;
  reportPrint.replaceChildren();
}

document.querySelector('#generate-report').addEventListener('click',showReport);
reportDialog.addEventListener('click',event=>{
  if(event.target===reportDialog){reportDialog.close();return;}
  const button = event.target.closest('button');
  if(!button) return;
  if(button.dataset.reportFormat){
    reportFormat = button.dataset.reportFormat;
    drawReportPreview();
  }
  if('printReport' in button.dataset){
    reportPrint.innerHTML = reportMarkup(reportState,reportFormat);
    document.body.dataset.printReport = '';
    window.print();
  }
});
reportDialog.addEventListener('close',clearPrintReport);
window.addEventListener('afterprint',clearPrintReport);
