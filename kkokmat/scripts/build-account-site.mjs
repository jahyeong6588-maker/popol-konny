import fs from 'node:fs/promises';
import path from 'node:path';
await import('./prepare-ocr.mjs');
const root=process.cwd(),out=path.resolve(root,'dist');
if(out!==path.join(root,'dist')||!await fs.stat(path.join(root,'public/index.html')).then(s=>s.isFile()))throw new Error('Missing public application');
// The generated output is fully recoverable from public/ and worker/.
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(path.join(out,'server'),{recursive:true});
await fs.cp(path.join(root,'public'),path.join(out,'client'),{recursive:true});
await fs.cp(path.join(root,'worker'),path.join(out,'server'),{recursive:true});
await fs.mkdir(path.join(out,'.openai'),{recursive:true});
await fs.copyFile(path.join(root,'.openai/hosting.json'),path.join(out,'.openai/hosting.json'));
await fs.cp(path.join(root,'drizzle'),path.join(out,'.openai/drizzle'),{recursive:true});
await fs.writeFile(path.join(out,'server/wrangler.json'),JSON.stringify({name:'kkokmat-account-preview',main:'index.js',compatibility_date:'2026-05-15',assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},d1_databases:[{binding:'DB',database_name:'kkokmat-accounts',database_id:'00000000-0000-4000-8000-000000000000'}]},null,2));
console.log('Built Worker API, static client assets, and D1 migrations.');
