const https=require('https'),fs=require('fs'),path=require('path');
const DIR='/root/riotousconsulting-cloud/dist/_riotousaudio/assets/datasheets'; fs.mkdirSync(DIR,{recursive:true});
const B='https://www.esbcar.com/_files/ugd/0bf3d1_';
const map={
'esb-9-1t-25.pdf':'1712e9a1c6c64cb99ff1bfca0b9a6e26','esb-9-1t-28.pdf':'d96e37c98b3345089258da0f2ccf6669','esb-9-uma.pdf':'0c271dc5b11a41ee9bee5df6eb17244a','esb-9-3m.pdf':'fbe8530728184e578fd6d510ec83a5fc','esb-9-4m.pdf':'2f7fe466d9344e47bd6703eb2d106a03','esb-9-6w.pdf':'52519e29c97f45009940bf079cef5626',
'esb-8-003uma.pdf':'ba572b1251a84513a108b7dd1c6f316d','esb-8-075.pdf':'0ef6e1170f6e47559e637929683bc06c','esb-8-165.pdf':'4f159dbec8574ccfa6f7068a3eea15b7','esb-8-6k2-cx.pdf':'c264b5a741f049d6a1b6b9f111401851','esb-8-6k3-cx.pdf':'c10de2660e294efa89b0808801cd90bf',
'esb-cs-audi-a6-front-200.pdf':'62b462e7e71b492f80b9e6fb3a6b8e68','esb-cs-audi-rear-165.pdf':'5a9ba179a0a34b94b6239e1d77463d46','esb-cs-audi-a4q5-front-200.pdf':'dcf036b9a4804ceb9a40732aa440f8ca','esb-cs-mb-front-100.pdf':'0e5c9f56e7034125a0f80d7a83e7422c','esb-cs-mb-coax-100.pdf':'56dfeaa68cdf4de2b1f251b8d237cfea','esb-cs-mb-sub-200.pdf':'0add3e9b6de14e2795d118369d9d0634','esb-cs-bmw-front-100.pdf':'3c1b40010e264525a5493b1056ab3ea4','esb-cs-bmw-sub-1.pdf':'0322d612a5e841cca161eba8353bcf7b',
'esb-4-28.pdf':'8b5ed02663044823b15e42a4e105bd37','esb-4-75.pdf':'5fd21d4d0e5c4c7b999e8bdb059e904d','esb-4-100.pdf':'f3b3338ec0ea449b9b5b68c484eb8fed','esb-4-uma.pdf':'85abc88062a048a680ec5bdb8245e302','esb-4-165.pdf':'59169660147041a5b3caac85046aca34','esb-4-6c.pdf':'3abb33ebd2a0438d8259225e34de27a0','esb-4-6k2-cx.pdf':'f0173d31fc7f49ff888b2b88b86b2ea9','esb-4-6k3-cx.pdf':'d6ff008640224458aa3887c4fe794bf1',
'esb-3-25.pdf':'fb8f88fea43f47509007a036a1e1641a','esb-3-28.pdf':'f8d45370cadc4dd0beeebdf0b82b73b5','esb-3-uma.pdf':'e1916ae6eb974a29a7ff4934dba5210d','esb-3-65.pdf':'18e04987cce348bda7fe38e9437dd3de','esb-3-90.pdf':'ec3795c5a10a4b55a5a5d0df405b0f1c','esb-3-165.pdf':'3491e09f1dfc46f7934c90d01a6de15e','esb-3-69.pdf':'9f4ef82633134b6491e73f6e9de029bc','esb-3-69c.pdf':'b677988156e24437b38e06710d39612c','esb-3-10d4-d2.pdf':'c327a50b6a814e26a3715f256484cba7','esb-3-wb6.pdf':'6c0c1705aa8e4f1ca5ed9a1db2d31be7','esb-3-wb8-g.pdf':'caf506e5343e4dc88948fd77f2c1a6bb','esb-3-6k2-cx.pdf':'2729b0cd7ad24b40a6aa57a67ebaafda','esb-3-6k3-cx.pdf':'db8ea3dfb33e41bd9d40f5a1e2dad5b2','esb-3-6k3-he-cx.pdf':'e0ea82354ff348369d672ed49ede6b88',
'esb-1-6k2x.pdf':'8d41a528fc50478798c6592f605a4b10','esb-1-6c.pdf':'5a40babbc7234f2dae838a0d669e1931','esb-1-10sd4-d2.pdf':'a46c310199f1487f9d823e2737fab673',
'harmony-hr-6-us-p.pdf':'79240f3459a843da9920aaa9f362ff0e','harmony-hr-10-us.pdf':'1687bc64754e4cfabe7c66bf80f9c924','harmony-hr-10-us-a.pdf':'b8e758871f674cdb97023fcb0d087e5d','harmony-hr-11-sw.pdf':'9c915d7433054fd5ad7b0e868260c4e6'
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function get(url){return new Promise(resolve=>{https.get(url,{timeout:40000},res=>{
  if([301,302,307,308].includes(res.statusCode)&&res.headers.location){res.resume();return resolve({redirect:res.headers.location});}
  if(res.statusCode!==200){res.resume();return resolve({status:res.statusCode});}
  const c=[];res.on('data',d=>c.push(d));res.on('end',()=>resolve({status:200,buf:Buffer.concat(c)}));
}).on('error',e=>resolve({err:e.code})).on('timeout',function(){this.destroy();resolve({err:'TIMEOUT'});});});}
(async()=>{const ents=Object.entries(map);let ok=0,skip=0,bad=[];
 for(const [name,h] of ents){
   if(fs.existsSync(path.join(DIR,name))){skip++;continue;}
   let url=B+h+'.pdf',a=0,r;
   while(a<6){a++;r=await get(url);if(r.redirect){url=r.redirect;continue;}if(r.status===429){await sleep(30000);continue;}break;}
   if(r&&r.status===200&&r.buf){fs.writeFileSync(path.join(DIR,name),r.buf);console.log('OK '+name+' '+r.buf.length);ok++;}
   else{console.log('FAIL '+name+' '+JSON.stringify(r));bad.push(name);}
   await sleep(7000);}
 fs.writeFileSync('/root/_incoming/ra-esb/dl-done.txt','downloaded '+ok+' skipped '+skip+' failed '+bad.length+'\n'+(bad.join(',')));
 console.log('ALLDONE ok='+ok+' skip='+skip+' fail='+bad.length);})();
