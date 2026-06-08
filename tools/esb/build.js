const { PDFParse } = require('pdf-parse');
const fs=require('fs'),path=require('path');
const D='/root/riotousconsulting-cloud/dist/_riotousaudio/assets/datasheets/';
const OUT='/root/_incoming/ra-enrich/data/esb-datasheets.json';
const C=s=>s.replace(/\s+/g,' ').trim();
function parse(t){
 const lines=t.split('\n');
 const feats=[]; let cur=null,exp=1;
 for(const ln of lines){
  const m=ln.match(/^\s*(\d{1,2})\s+([A-Z(].*)/);
  if(m&&+m[1]===exp){if(cur)feats.push(C(cur));cur=m[2];exp++;}
  else if(cur){ if(/^(MAY|JAN|FEB|MAR|APR|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d|PARAMETERS|DESIGN BANDWIDTH|Speaker Type|All measurements/i.test(ln)){feats.push(C(cur));cur=null;} else if(ln.trim()&&!/:/.test(ln)&&!/^\s*\d/.test(ln))cur+=' '+ln.trim(); }
 }
 if(cur)feats.push(C(cur));
 const kv={};
 for(const ln of lines){const m=ln.match(/^\s*([A-Za-z][A-Za-z0-9 .,“”"'()\/%-]{2,40}?):\s*(.+\S)\s*$/);if(m){const k=C(m[1]);if(!kv[k])kv[k]=C(m[2]);}}
 return {feats,kv};
}
function entry(model,series,t){
 const {feats,kv}=parse(t);
 const g=(...ks)=>{for(const k in kv){const lk=k.toLowerCase().replace(/[“”"]/g,'');if(ks.some(q=>lk.includes(q)))return kv[k];}return null;};
 const stype=(g('speaker type')||g('type')||'').trim();
 const diam=g('nominal diameter');
 const isX=/crossover/i.test(stype);
 const desc=isX
  ? `The ${model} is the ${stype.toLowerCase()} that ties ESB's ${series} Series components into one calibrated, time-aligned system.`
  : `The ${model} is an ESB ${series} Series ${stype.toLowerCase()||'speaker'}${diam?` (${diam})`:''} — conceived and built in Italy as an exercise in obsession.`;
 const sec=[];
 if(isX){
  const xs=[]; [['Crossover Frequency','crossover frequency'],['Slope','slope'],['Power Handling','power handling'],['HF Level Adjust','high frequency leve'],['Low-Frequency Section','low frequency section'],['High-Frequency Section','high frequency section'],['Cable Connector','cable connector']].forEach(([l,q])=>{const v=g(q);if(v)xs.push([l,v]);});
  if(xs.length)sec.push(['Crossover Network',xs]);
 } else {
  const perf=[]; [['Nominal Impedance','nominal impedance'],['Continuous Power','continuous power'],['Peak Power','peak power'],['Rec. Amplifier Power','rec. amplifier','amplifier power'],['Sensitivity','sensitivity']].forEach(([l,...q])=>{const v=g(...q);if(v)perf.push([l,v]);});
  if(perf.length)sec.push(['Power & Performance',perf]);
  const ts=[]; [['Free-Air Resonance (Fs)','free air resonance'],['Voice Coil DC Resistance (Re)','voice coil resistance'],['Electrical Q (Qes)','(qes)'],['Mechanical Q (Qms)','(qms)'],['Total Q (Qts)','(qts)'],['Equivalent Compliance (Vas)','equivalent compliance'],['Moving Mass (Mms)','moving mass'],['Magnetic Strength (BL)','magnetic strength'],['Effective Piston Area (Sd)','effective piston'],['Linear Excursion (Xmax)','linear excursion']].forEach(([l,...q])=>{const v=g(...q);if(v)ts.push([l,v]);});
  if(ts.length)sec.push(['Thiele-Small Parameters',ts]);
  const bw=[]; for(const k in kv){if(/hp filters/i.test(k))bw.push([k.replace(/with /i,'').trim(),kv[k]]);}
  if(bw.length)sec.push(['Design Bandwidth',bw]);
  const phys=[]; const vc=g('voice coil diameter'); if(vc)phys.push(['Voice Coil Diameter',vc]); if(diam)phys.push(['Nominal Diameter',diam]);
  if(phys.length)sec.push(['Construction',phys]);
 }
 const o={desc}; if(feats.length)o.narr=["Main Features",feats]; o.sections=sec; return o;
}
// thin SKU -> [datasheet file, series]
const MAP={
 '5.028':['esb-5-028.pdf','5000'],'5.050':['esb-5-050.pdf','5000'],'5.165':['esb-5-165.pdf','5000'],'5.UMA':['esb-5-uma.pdf','5000'],'5.6K2CX':['esb-5-6k2-cx.pdf','5000'],'5.6K3CX':['esb-5-6k3-cx.pdf','5000'],
 '8.028':['esb-8-028.pdf','8000'],'8.028S':['esb-8-028.pdf','8000'],'8.003UMA':['esb-8-003uma.pdf','8000'],'8.075':['esb-8-075.pdf','8000'],'8.165':['esb-8-165.pdf','8000'],'8.6K2CX':['esb-8-6k2-cx.pdf','8000'],'8.6K3CX':['esb-8-6k3-cx.pdf','8000'],
 '1.10SD2':['esb-1-10sd4-d2.pdf','1000'],'1.10SD4':['esb-1-10sd4-d2.pdf','1000'],
 '3.69C':['esb-3-69c.pdf','3000'],
 'A6FRONT200':['esb-cs-audi-a6-front-200.pdf','6000 Car Special'],'A4FRONT200':['esb-cs-audi-a4q5-front-200.pdf','6000 Car Special'],'Q5FRONT200':['esb-cs-audi-a4q5-front-200.pdf','6000 Car Special'],'A6REAR165':['esb-cs-audi-rear-165.pdf','6000 Car Special'],'A4/Q5REAR165':['esb-cs-audi-rear-165.pdf','6000 Car Special'],
 'HR6USP':['harmony-hr-6-us-p.pdf','Hard Rock']
};
(async()=>{
 const specs={}; let done=0, miss=[];
 for(const sku in MAP){ const [file,series]=MAP[sku];
  if(!fs.existsSync(D+file)){miss.push(sku);continue;}
  try{const p=new PDFParse({data:fs.readFileSync(D+file)});const r=await p.getText();specs[sku]=entry(sku,series,r.text);done++;}catch(e){console.log('ERR',sku,e.message);}
 }
 fs.writeFileSync(OUT,JSON.stringify({specs},null,1));
 console.log('built '+done+' entries, missing-file '+miss.length+(miss.length?' ('+miss.join(',')+')':''));
 console.log('\n=== SAMPLE 5.165 ===\n'+JSON.stringify(specs['5.165'],null,1));
 console.log('\n=== SAMPLE 5.6K2CX ===\n'+JSON.stringify(specs['5.6K2CX'],null,1));
})();
