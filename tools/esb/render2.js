const fs=require('fs');
const {PDFParse}=require('pdf-parse');
const OUT='/root/riotousconsulting-cloud/dist/_riotousaudio/assets/tmp';
(async()=>{
 const buf=fs.readFileSync('./pdfs-cache/esb-cs-audi-a6-front-200.pdf');
 const p=new PDFParse({data:buf});
 let r;
 try{ r=await p.getScreenshot({scale:4}); }catch(e){ console.log('ERR scale opt:',e.message); return; }
 const pages=r.pages||[];
 const pg=pages[1]||pages[0];
 console.log('page2 dims: '+pg.width+'x'+pg.height+' scale='+pg.scale);
 const b=Buffer.from(pg.data,'base64');
 fs.writeFileSync(OUT+'/a6_hi.png',b);
 console.log('saved a6_hi.png='+b.length+'B');
})();
