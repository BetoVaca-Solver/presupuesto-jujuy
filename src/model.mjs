export const years = [2025, 2026, 2027];
export const topics = {
  corriente: { name:'Gasto corriente', law:'Gasto corriente', execution:'corriente', overviewOnly:true },
  capital: { name:'Gasto de capital', law:'Gasto de capital', execution:'capital', overviewOnly:true },
  total: { name:'Gasto total', law:'Gasto total', execution:'total', color:'cream', icon:'total' },
  obras: { name:'Obra pública', law:'Trabajos Públicos', execution:'obras', color:'aqua', icon:'works' },
  salud: { name:'Salud', law:'Salud', execution:'3.1', color:'orange', icon:'health' },
  educacion: { name:'Educación y cultura', law:'Cultura y Educación', execution:'3.4', color:'cream', icon:'book' },
  social: { name:'Bienestar social', law:'Bienestar Social', execution:'3.2', color:'aqua', icon:'people', differentScope:true },
  seguridad: { name:'Seguridad', law:'Seguridad', execution:'II', color:'orange', icon:'shield' },
  recursos: { name:'Recursos totales', law:'Recursos totales', overviewOnly:true, basis:'recursos' },
  'ingresos-corrientes': { name:'Recursos corrientes', law:'Recursos corrientes', overviewOnly:true, basis:'recursos' },
  'ingresos-capital': { name:'Recursos de capital', law:'Recursos de capital', overviewOnly:true, basis:'recursos' },
  saldo: { name:'Resultado financiero', law:'Resultado financiero previsto', overviewOnly:true, basis:null },
  amortizacion: { name:'Amortización de deuda', law:'Amortización de deuda', overviewOnly:true, basis:null },
  administracion: { name:'Administración general', law:'Administración General', overviewOnly:true },
  ciencia: { name:'Ciencia y técnica', law:'Ciencia y Técnica', overviewOnly:true },
  economia: { name:'Desarrollo de la economía', law:'Desarrollo de la Economía', overviewOnly:true },
  'deuda-funcion': { name:'Deuda pública', law:'Deuda Pública', overviewOnly:true },
  'sin-clasificar': { name:'Gastos a clasificar', law:'Gastos a Clasificar', overviewOnly:true }
};
export const topicCatalog = data => ({
  ...topics, ...Object.fromEntries((data.budgetDetails??[]).map(row=>[row.id,row]))
});
export const measures = {
  initial: 'Presupuesto inicial / proyecto',
  accrued: 'Gasto devengado',
  currentCredit: 'Crédito vigente'
};
export const parseState = (hash = '', catalog = topics) => {
  const query = new URLSearchParams(hash.replace(/^#/, ''));
  const tab = query.get('vista');
  const requestedTopic = query.get('tema');
  const topic = Object.hasOwn(catalog,requestedTopic) ? requestedTopic : 'total';
  const year = Number(query.get('anio'));
  const measure = query.get('indicador');
  const selected = (query.get('anios') || '').split(',').map(Number).filter(x=>years.includes(x));
  const panel = query.get('ficha');
  const social = query.get('social');
  const baseYear = Number(query.get('base'));
  return {
    tab: ['inicio','tema','comparar','completa','fuentes','indicadores'].includes(tab) ? tab : 'inicio',
    topic,
    year: years.includes(year) ? year : 2026,
    unit: query.get('pesos') === 'constantes' ? 'real' : 'nominal',
    selected: selected.length ? years.filter(x=>selected.includes(x)) : [...years],
    measure: catalog[topic].execution && Object.hasOwn(measures,measure) ? measure : 'initial',
    cut: query.get('corte') === 'anual' ? 'annual' : 'semester',
    social,
    baseYear: years.includes(baseYear) ? baseYear : 2025,
    panel: ['presupuesto','ejecucion','anuncios'].includes(panel) ? panel : 'presupuesto'
  };
};
export function stateHash(state) {
  return '#'+new URLSearchParams({
    vista:state.tab, tema:state.topic, anio:state.year,
    pesos:state.unit==='real'?'constantes':'corrientes',
    anios:state.selected.join(','), indicador:state.measure,
    corte:state.cut==='annual'?'anual':'semestre', ficha:state.panel,
    base:state.baseYear,
    ...(state.social ? {social:state.social} : {})
  });
}
export const priceYearFactor = (data, year) => data.deflators.find(row=>row.ejercicio===year)?.factor_a_pesos_2025 ?? 1;

export const participationBasis = topic => topic.basis === undefined ? 'total' : topic.basis;

function shareOf(data, pesos, year, basis) {
  const denominator = data.annual.find(row=>row.ejercicio===year && row.concepto===topics[basis]?.law)?.pesos_corrientes;
  return denominator > 0 && pesos >= 0 && pesos <= denominator ? pesos/denominator*100 : null;
}

export function projectRows(data, state) {
  if(state.year !== 2027) return [];
  return data.projectItems.filter(row=>row.topic===state.topic).map(row=>({
    ...row,
    value:state.unit==='real'?row.pesos*priceYearFactor(data,2027)/priceYearFactor(data,state.baseYear):row.pesos,
    share:row.topic==='obras'?null:shareOf(data,row.pesos,2027,'total'),
    status:'Proyecto · alcance distinto',
    inflation:state.unit==='real'?'Ajuste con IPC proyectado':''
  }));
}

export function compareRows(data, state) {
  const topic = topics[state.topic] ?? data.budgetDetails.find(row=>row.id===state.topic);
  const real = state.unit === 'real';
  const baseFactor = real ? priceYearFactor(data,state.baseYear) : 1;
  return state.selected.map(year => {
    if(state.measure==='initial') {
      const index = years.indexOf(year);
      const def = data.deflators.find(item=>item.ejercicio===year);
      const inflation = real && def?.meses_proyectados ? `IPC: ${def.meses_proyectados} meses proyectados` : '';
      if(topic.amounts) {
        const pesos = topic.amounts[index];
        if(!Number.isFinite(pesos)) return {year,status:'Sin dato en este desglose'};
        const [reference,source] = data.budgetSources[topic.source][index];
        return {year,value:real?pesos*priceYearFactor(data,year)/baseFactor:pesos,
          share:shareOf(data,pesos,year,participationBasis(topic)), status:year===2027?'Proyecto':'Ley · crédito inicial',
          scope:reference,inflation,source};
      }
      const row = data.annual.find(row=>row.ejercicio===year && row.concepto===topic.law);
      if(!row){
        const detail = projectRows(data,{...state,year});
        return {year,status:detail.length?'Proyecto · alcance distinto':'Sin dato',detail};
      }
      return {year,value:real?row.pesos_constantes_2025/baseFactor:row.pesos_corrientes,
        share:shareOf(data,row.pesos_corrientes,year,participationBasis(topic)),
        status:row.estado_presupuesto==='proyecto'?'Proyecto':'Ley · crédito inicial',
        scope:row.referencia, inflation, source:row.fuente};
    }
    if(year===2027) return {year,status:'Sin ejecución publicada'};
    if(state.cut==='annual'){
      const row = year===2025 && data.closing.find(row=>row.concepto===topic.execution);
      const total = year===2025 && data.closing.find(row=>row.concepto==='total');
      const field = state.measure==='currentCredit'?'credito_vigente':'devengado';
      if(!row) return {year,status:'Sin dato verificado'};
      return {year,value:row[field]/baseFactor,share:row.cuadro===total?.cuadro&&total[field]>0?row[field]/total[field]*100:null,
        inflation:real&&state.baseYear!==2025?'Base de precios con IPC proyectado':'',status:'Cierre anual',scope:row.cuadro,source:row.fuente};
    }
    if(state.measure==='currentCredit') return {year,status:'Sin dato'};
    const row = data.execution.find(row=>row.codigo===topic.execution);
    if(!row) return {year,status:'Sin dato'};
    const total = data.execution.find(row=>row.codigo==='total');
    const totalValue = total?.[`devengado_${year}`];
    return {year,value:row[real?`devengado_${year}_en_pesos_base_2025`:`devengado_${year}`]/baseFactor,
      share:totalValue>0?row[`devengado_${year}`]/totalValue*100:null,
      status:'Devengado',scope:row.concepto,inflation:real?'Ajuste semestral aproximado':'',
      source:row[`fuente_${year}`]};
  });
}
export function variations(rows){
  return rows.map((row,index)=>{
    const prior = rows[index-1];
    const pct = prior?.value > 0 && Number.isFinite(row.value) ? (row.value/prior.value-1)*100 : null;
    return {...row,pct,priorYear:pct===null?null:prior.year};
  });
}
export function indicatorRows(data, state, indicator){
  const all = data.indicators.filter(row=>row.indicador===indicator);
  const monetary = all.some(row=>row.unidad==='pesos');
  const adjusted = monetary && state.unit==='real';
  const unit = monetary ? (adjusted?'pesos a precios promedio 2025':'pesos') : all[0]?.unidad;
  const year = String(state.year);
  const series = all.filter(row=>row.unidad===unit && row.periodo.slice(0,4)>= '2025' && row.periodo.slice(0,4)<=year)
    .sort((a,b)=>a.periodo.localeCompare(b.periodo));
  const baseFactor = adjusted ? priceYearFactor(data,state.baseYear) : 1;
  const label = adjusted?`Pesos promedio de ${state.baseYear}`: monetary?'Pesos corrientes':unit;
  const history = series.map(row=>({...row,valor:row.valor/baseFactor}));
  const observations = history.filter(row=>row.periodo.slice(0,4)===year);
  const frequency = period=>period.includes('-S')?'semester':period.includes('-')?'month':'year';
  const chartFrequency = observations.some(row=>frequency(row.periodo)==='month') ? 'month' : frequency(observations.at(-1)?.periodo??'');
  return {monetary,label,rows:observations,chart:observations.length?history.filter(row=>frequency(row.periodo)===chartFrequency):[]};
}

export function csvRows(rows,state,catalog=topics) {
  const unit = state.unit==='real'?`pesos promedio de ${state.baseYear}`:'pesos corrientes';
  const cut = state.measure==='initial'||state.cut==='annual'?'anual':'enero a junio';
  const header = ['concepto','indicador','corte','año','unidad','monto','participación porcentual','estado','alcance','ajuste','comparado con','variación porcentual','fuente'];
  const values = rows.flatMap(row=> {
    const common = [measures[state.measure],cut,row.year,unit];
    return row.detail?.length
      ? row.detail.map(item=>[item.label,...common,item.value,item.share,item.status,`${item.reference} · ${item.scope}`,item.inflation,null,null,item.source])
      : [[catalog[state.topic].name,...common,row.value,row.share,row.status,row.scope,row.inflation,row.priorYear,row.pct,row.source]];
  });
  return [header,...values].map(row=>row.map(value=>`"${(typeof value==='number'?String(value).replace('.',','):String(value??'')).replaceAll('"','""')}"`).join(';')).join('\r\n')+'\r\n';
}
