const fs=require('fs');
const {PDFParse}=require('pdf-parse');
const OUT='/root/riotousconsulting-cloud/dist/_riotousaudio/assets/tmp';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const buf=fs.readFileSync('/root/_incoming/ra-esb/pdfs-cache/esb-cs-audi-a6-front-200.pdf');
 const p=new PDFParse({data:buf});
 console.log('methods:',Object.getOwnPropertyNames(Object.getPrototypeOf(p)).filter(m=>!m.startsWith('_')&&m!=='constructor'));
 let r;
 try{ r=await p.getScreenshot(); }catch(e){ console.log('getScreenshot ERR:',e.message); return; }
 console.log('ret:',Array.isArray(r)?'array':typeof r,' keys:',(r&&typeof r==='object'&&!Array.isArray(r))?Object.keys(r):'-');
 const pages=Array.isArray(r)?r:(r.pages||r.images||[]);
 console.log('npages:',pages.length, pages[0]?('page0 keys: '+Object.keys(pages[0]).join(',')):'');
 let saved=[];
 pages.forEach((pg,i)=>{
   let bytes=null;
   for(const k of Object.keys(pg)){const v=pg[k];
     if(Buffer.isBuffer(v)){bytes=v;break;}
     if(typeof v==='string'&&v.length>500){bytes=Buffer.from(v.startsWith('data:')?v.split(',')[1]:v,'base64');break;}
   }
   if(bytes){const fn=OUT+'/a6_p'+(i+1)+'.png';fs.writeFileSync(fn,bytes);saved.push('a6_p'+(i+1)+'.png='+bytes.length+'B');}
 });
 console.log('SAVED:',saved.join('  ')||'NONE');
})();
