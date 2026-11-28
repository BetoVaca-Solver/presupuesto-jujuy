import { compareRows, participationBasis, priceYearFactor, topics, variations } from './model.mjs';

const reportSeptember = {
  2025: {
    ipc:8747.799655555556, total:1432244763395.19, capital:148341278503.64, obras:99382659009.32,
    source:'https://hacienda.jujuy.gob.ar/wp-content/uploads/2025/11/Planilla-I.1.Devengado.pdf'
  },
  2026: {
    ipc:11650.068322222223, total:1902094566254.41, capital:116262960505.15, obras:99583782604.97,
    source:'https://hacienda.jujuy.gob.ar/wp-content/uploads/2026/02/Planilla-I.1.Devengado-AC-0926.pdf'
  }
};
// Observed annual mean of the INDEC NOA index, on the same scale as the September averages.
const reportIpc2025 = 9033.7181;
const reportEducation = {
  2025: { total:473161593800, capital:74355738125, source:'https://drive.google.com/file/d/1z36ZA4M619gIoaZy7PupkjtxkXH8kvQL/view' },
  2026: { total:634148063682, capital:82591899365, source:'https://drive.google.com/file/d/1n0B7MPqLOzvIRt_6qEeRFjUdGKdKnMS-/view' }
};
const reportAggregates = ['recursos','total','saldo','corriente','capital'];
const reportExecutionTopics = ['total','capital','obras'];

function reportTopicRows(data,state,account){
  const rows = compareRows(data,state);
  if(state.measure!=='initial' || !['jur-40','jur-40-corriente','jur-40-capital'].includes(state.topic)) return rows;
  return rows.map((row,index)=>{
    const entry = reportEducation[row.year];
    if(!entry || Number.isFinite(row.value)) return row;
    const pesos = state.topic==='jur-40' ? entry.total
      : state.topic==='jur-40-capital' ? entry.capital : entry.total-entry.capital;
    return {
      ...row, value:state.unit==='real'?pesos*priceYearFactor(data,row.year)/priceYearFactor(data,state.baseYear):pesos,
      share:pesos/account.total[index].value*100, status:'Ley · crédito inicial',
      scope:'Planilla 7 A · F', source:entry.source
    };
  });
}

export function buildReport(data,state,catalog){
  const budgetState = {...state,measure:'initial'};
  const account = Object.fromEntries(reportAggregates.map(topic=>[topic,compareRows(data,{...budgetState,topic,unit:'nominal'})]));
  const real = Object.fromEntries(reportAggregates.map(topic=>[topic,compareRows(data,{...budgetState,topic,unit:'real'})]));
  const cash = state.unit==='real'?real:account;
  const selected = variations(reportTopicRows(data,state,account));
  const educationCapital = state.topic==='jur-40' ? variations(reportTopicRows(data,{...budgetState,topic:'jur-40-capital'},account)) : [];
  const executionYears = state.selected.filter(year=>Object.hasOwn(reportSeptember,year));
  const execution = reportExecutionTopics.map(topic=>{
    const nominal = executionYears.map(year=>({year,value:reportSeptember[year][topic]}));
    const adjusted = nominal.map(row=>({...row,value:row.value*reportIpc2025/reportSeptember[row.year].ipc/priceYearFactor(data,state.baseYear)}));
    return {label:topic==='obras'?'Trabajos Públicos (construcciones)':topics[topic].name,
      rows:state.unit==='real'?adjusted:nominal, realChange:variations(adjusted).at(-1)?.pct??null};
  });
  const sources = new Map();
  const add = (address,label)=>{if(address&&!sources.has(address)) sources.set(address,label);};
  account.total.forEach(row=>add(row.source,row.year===2027?'Proyecto 2027':`Ley ${row.year}`));
  for(const row of [...selected,...educationCapital]){
    add(row.source,`Partida ${row.year}`);
    row.detail?.forEach(item=>add(item.source,`Anexo ${row.year}`));
  }
  executionYears.forEach(year=>add(reportSeptember[year].source,`Devengado a septiembre ${year}`));
  add('https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv','IPC NOA (INDEC)');
  return {
    cash,
    trend:['total','corriente','capital'].map(key=>({key,label:topics[key].name,
      nominal:variations(account[key]),real:variations(real[key])})),
    selected, educationCapital, execution, executionYears, sources:[...sources],
    shareBasis:participationBasis(catalog[state.topic]),
    balanceShare:cash.saldo.map((row,i)=>row.value/cash.recursos[i].value*100)
  };
}
