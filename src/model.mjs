export const years = [2025, 2026, 2027];
export const topics = {
  total: { name:'Gasto total', law:'Gasto total', execution:'total', color:'cream', icon:'total' },
  obras: { name:'Obra pública', law:'Trabajos Públicos', execution:'obras', color:'aqua', icon:'works' },
  salud: { name:'Salud', law:'Salud', execution:'3.1', color:'orange', icon:'health' },
  educacion: { name:'Educación y cultura', law:'Cultura y Educación', execution:'3.4', color:'cream', icon:'book' },
  social: { name:'Bienestar social', law:'Bienestar Social', execution:'3.2', color:'aqua', icon:'people', differentScope:true },
  seguridad: { name:'Seguridad', law:'Seguridad', execution:'II', color:'orange', icon:'shield' }
};
export const measures = {
  initial: 'Presupuesto inicial / proyecto',
  accrued: 'Gasto devengado',
  currentCredit: 'Crédito vigente'
};
export const parseState = (hash = '') => {
  const query = new URLSearchParams(hash.replace(/^#/, ''));
  const tab = query.get('vista');
  const topic = query.get('tema');
  const year = Number(query.get('anio'));
  const measure = query.get('indicador');
  const selected = (query.get('anios') || '').split(',').map(Number).filter(x=>years.includes(x));
  const panel = query.get('ficha');
  const social = query.get('social');
  return {
    tab: ['inicio','tema','comparar','fuentes','indicadores'].includes(tab) ? tab : 'inicio',
    topic: Object.hasOwn(topics,topic) ? topic : 'total',
    year: years.includes(year) ? year : 2026,
    unit: query.get('pesos') === 'constantes' ? 'real' : 'nominal',
    selected: selected.length ? years.filter(x=>selected.includes(x)) : [...years],
    measure: Object.hasOwn(measures,measure) ? measure : 'initial',
    cut: query.get('corte') === 'anual' ? 'annual' : 'semester',
    social,
    panel: ['presupuesto','ejecucion','anuncios'].includes(panel) ? panel : 'presupuesto'
  };
};
export function stateHash(state) {
  return '#'+new URLSearchParams({
    vista:state.tab, tema:state.topic, anio:state.year,
    pesos:state.unit==='real'?'constantes':'corrientes',
    anios:state.selected.join(','), indicador:state.measure,
    corte:state.cut==='annual'?'anual':'semestre', ficha:state.panel,
    ...(state.social ? {social:state.social} : {})
  });
}
export function compareRows(data, state) {
  const topic = topics[state.topic];
  const real = state.unit === 'real';
  return state.selected.map(year => {
    if(state.measure==='initial') {
      const row = data.annual.find(row=>row.ejercicio===year && row.concepto===topic.law);
      if(!row) return {year,status:year===2027?'Planilla pendiente':'Sin dato'};
      const def = data.deflators.find(item=>item.ejercicio===year);
      const inflation = real && def.meses_proyectados ? `IPC: ${def.meses_proyectados} meses proyectados` : '';
      return {year,value:real?row.pesos_constantes_2025:row.pesos_corrientes, share:row.participacion_gasto_pct,
        status:row.estado_presupuesto==='proyecto'?'Proyecto':'Ley · crédito inicial',
        scope:row.referencia, inflation, source:row.fuente};
    }
    if(state.cut==='annual'){
      const row = year===2025 && data.closing.find(row=>row.concepto===topic.execution);
      const field = state.measure==='currentCredit'?'credito_vigente':'devengado';
      if(!row) return {year,status:'Sin dato verificado'};
      return {year,value:row[field],status:'Cierre anual',scope:row.cuadro,source:row.fuente};
    }
    if(year===2027 || state.measure==='currentCredit') return {year,status:'Sin dato'};
    const row = data.execution.find(row=>row.codigo===topic.execution);
    if(!row) return {year,status:'Sin dato'};
    return {year,value:row[real?`devengado_${year}_en_pesos_base_2025`:`devengado_${year}`],
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
export function csvRows(rows,state) {
  const unit = state.unit==='real'?'pesos promedio de 2025':'pesos corrientes';
  const cut = state.measure==='initial'||state.cut==='annual'?'anual':'enero a junio';
  const header = ['concepto','indicador','corte','año','unidad','monto','participación porcentual','estado','alcance','ajuste','comparado con','variación porcentual','fuente'];
  const values = rows.map(r=>[topics[state.topic].name,measures[state.measure],cut,r.year,unit,r.value,r.share,r.status,r.scope,r.inflation,r.priorYear,r.pct,r.source]);
  return [header,...values].map(row=>row.map(value=>`"${(typeof value==='number'?String(value).replace('.',','):String(value??'')).replaceAll('"','""')}"`).join(';')).join('\r\n')+'\r\n';
}
