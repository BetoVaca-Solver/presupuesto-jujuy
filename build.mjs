import { readFile, writeFile } from 'node:fs/promises';
const read = name => readFile(new URL(name,import.meta.url),'utf8');
const [template,style,model,app,data] = await Promise.all(['src/index.html','src/style.css','src/model.mjs','src/app.js','src/data.json'].map(read));
const html = template.replace('/*STYLE*/',()=>style)
  .replace('/*DATA*/',()=>JSON.stringify(JSON.parse(data)).replaceAll('<','\\u003c'))
  .replace('/*SCRIPT*/',()=>model.replace(/^export /gm,'')+'\n'+app);
await writeFile(new URL('docs/index.html',import.meta.url),html);
