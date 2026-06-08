const https=require('https'),fs=require('fs'),path=require('path');
const DIR='/root/riotousconsulting-cloud/dist/_riotousaudio/assets/datasheets';
const B='https://www.esbcar.com/_files/ugd/0bf3d1_';
const map={
'esb-8-003uma.pdf':'ba572b1251a84513a108b7dd1c6f316d','esb-8-075.pdf':'0ef6e1170f6e47559e637929683bc06c','esb-8-165.pdf':'4f159dbec8574ccfa6f7068a3eea15b7','esb-8-6k2-cx.pdf':'c264b5a741f049d6a1b6b9f111401851','esb-8-6k3-cx.pdf':'c10de2660e294efa89b0808801cd90bf',
'esb-1-10sd4-d2.pdf':'a46c310199f1487f9d823e2737fab673','esb-3-69c.pdf':'b677988156e24437b38e06710d39612c',
'esb-cs-audi-a6-front-200.pdf':'62b462e7e71b492f80b9e6fb3a6b8e68','esb-cs-audi-a4q5-front-200.pdf':'dcf036b9a4804ceb9a40732aa440f8ca','esb-cs-audi-rear-165.pdf':'5a9ba179a0a34b94b6239e1d77463d46',
'harmony-hr-6-us-p.pdf':'79240f3459a843da9920aaa9f362ff0e'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function get(url){return new Promise(res=>{https.get(url,{timeout:40000},r=>{if([301,302,307,308].includes(r.statusCode)&&r.headers.location){r.resume();return res({redirect:r.headers.location});}if(r.statusCode!==200){r.resume();return res({status:r.statusCode});}const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res({status:200,buf:Buffer.concat(c)}));}).on('error',e=>res({err:e.code})).on('timeout',function(){this.destroy();res({err:'TIMEOUT'});});});}
(async()=>{let ok=0;for(const [n,h] of Object.entries(map)){if(fs.existsSync(path.join(DIR,n))){console.log('skip '+n);continue;}let url=B+h+'.pdf',a=0,r;while(a<8){a++;r=await get(url);if(r.redirect){url=r.redirect;continue;}if(r.status===429){console.log('429 '+n+' #'+a);await sleep(40000);continue;}break;}if(r&&r.status===200&&r.buf){fs.writeFileSync(path.join(DIR,n),r.buf);console.log('OK '+n+' '+r.buf.length);ok++;}else console.log('FAIL '+n+' '+JSON.stringify(r));await sleep(8000);}
console.log('NEEDDONE ok='+ok);})();
