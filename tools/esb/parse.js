const { PDFParse } = require('pdf-parse');
const fs=require('fs'),path=require('path');
const D='/root/riotousconsulting-cloud/dist/_riotousaudio/assets/datasheets/';
const C=s=>s.replace(/\s+/g,' ').trim();
function parse(t){
 const lines=t.split('\n').map(x=>x.replace(/ /g,' '));
 // features: numbered 1..N sentences (page-1 construction notes)
 const feats=[]; let cur=null,exp=1;
 for(const ln of lines){
  const m=ln.match(/^\s*(\d{1,2})\s+([A-Z(].*)/);
  if(m && +m[1]===exp){ if(cur)feats.push(C(cur)); cur=m[2]; exp++; }
  else if(cur){ if(/^(MAY|JAN|FEB|MAR|APR|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d|PARAMETERS|DESIGN BANDWIDTH|Speaker Type|All measurements/i.test(ln)){feats.push(C(cur));cur=null;} else if(ln.trim()&&!/:/.test(ln)&&!/^\s*\d/.test(ln)) cur+=' '+ln.trim(); }
 }
 if(cur)feats.push(C(cur));
 // label:value specs
 const kv={};
 for(const ln of lines){ const m=ln.match(/^\s*([A-Za-z][A-Za-z0-9 .,“”"'()\/%“”-]{2,40}?):\s*(.+\S)\s*$/); if(m){const k=C(m[1]);if(!kv[k])kv[k]=C(m[2]);} }
 return {feats,kv};
}
function sampleEntry(model,t){
 const {feats,kv}=parse(t);
 console.log('\n######## '+model+' ########');
 console.log('FEATURES ('+feats.length+'):');
 feats.slice(0,12).forEach((f,i)=>console.log('  '+(i+1)+'. '+f.slice(0,110)));
 console.log('SPEC KV ('+Object.keys(kv).length+'):');
 for(const k of Object.keys(kv)) console.log('  '+k+' = '+kv[k]);
}
(async()=>{
 for(const f of ['esb-5-165.pdf','esb-5-028.pdf','esb-5-6k2-cx.pdf']){
  if(!fs.existsSync(D+f)){console.log(f,'MISSING');continue;}
  try{const p=new PDFParse({data:fs.readFileSync(D+f)});const r=await p.getText();sampleEntry(f,r.text);}catch(e){console.log(f,'ERR',e.message);}
 }
})();
