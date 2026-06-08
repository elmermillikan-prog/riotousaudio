const fs=require('fs'),path=require('path');
const PD='/root/riotousconsulting-cloud/dist/_riotousaudio/product';
const A=(u,t)=>`<a href="${u}" target="_blank" rel="noopener" style="color:var(--gold);font-size:.82rem;letter-spacing:.04em">↗ ${t}</a>`;
const M={
 'ESB 1000':['https://www.esbcar.com/1000-series','ESB'],'ESB 3000':['https://www.esbcar.com/3000-series','ESB'],'ESB 4000':['https://www.esbcar.com/4000-series','ESB'],'ESB 5000':['https://www.esbcar.com/5000-series','ESB'],'ESB 8000':['https://www.esbcar.com/8000-series','ESB'],'ESB 9000':['https://www.esbcar.com/9000-series','ESB'],'ESB 6000 Car Special':['https://www.esbcar.com','ESB'],
 'Harmony Blue Note':['https://www.zapco.com/hb-series','Zapco'],'Harmony Hard Rock':['https://www.esbcar.com/harmony-series','ESB']
};
let done=0,skip=0,nm=0;
for(const d of fs.readdirSync(PD)){
 const f=path.join(PD,d,'index.html'); if(!fs.existsSync(f))continue;
 let h=fs.readFileSync(f,'utf8');
 if(h.includes('Documentation</h4>')){skip++;continue;}
 const cat=(h.match(/"category":\s*"([^"]*)"/)||[])[1]; const m=cat&&M[cat]; if(!m){nm++;continue;}
 const block=`<div class="pd-spec"><h4>Documentation</h4><div style="display:flex;flex-direction:column;gap:.45rem">${A(m[0],'Product Information at '+m[1]+'.com')}</div></div>`;
 const nh=h.replace(/(<\/div><\/div><\/section>)(\s*<footer)/, block+'$1$2');
 if(nh!==h){fs.writeFileSync(f,nh);done++;}
}
console.log('fallback docs injected: '+done+', skipped(existing) '+skip+', unmatched '+nm);
