import { readFile, writeFile } from 'node:fs/promises';
const read = name => readFile(new URL(name,import.meta.url),'utf8');
const [template,style,model,app,data,reportModel,reportView,reportStyle] = await Promise.all([
  'src/index.html','src/style.css','src/model.mjs','src/app.js','src/data.json',
  'src/report-model.mjs','src/report-view.js','src/report.css'
].map(read));
const bundle = code => code.replace(/^import .*\n/gm,'').replace(/^export /gm,'');
const html = template.replace('/*STYLE*/',()=>style+'\n'+reportStyle)
  .replace('/*DATA*/',()=>JSON.stringify(JSON.parse(data)).replaceAll('<','\\u003c'))
  .replace('/*SCRIPT*/',()=>[bundle(model),bundle(reportModel),app,reportView].join('\n'));
await writeFile(new URL('docs/index.html',import.meta.url),html);
