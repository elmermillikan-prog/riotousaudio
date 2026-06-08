const fs=require('fs'),path=require('path');
const PD='/root/riotousconsulting-cloud/dist/_riotousaudio/product';
const A=(u,t,ic)=>`<a href="${u}" target="_blank" rel="noopener" style="color:var(--gold);font-size:.82rem;letter-spacing:.04em">${ic} ${t}</a>`;
const SERIES={
 'Zapco Reference':{page:'https://www.zapco.com/ref-series',manual:'https://5a1c738a-65df-4d27-b529-e99b92128dc5.filesusr.com/ugd/0bf3d1_5751a9181c8544788d9e1a150db843f6.pdf'},
 'Zapco ST-B':{page:'https://www.zapco.com/st-b-series'},
 'Zapco ST-X':{page:'https://www.zapco.com/st-x-3-series',manual:'https://www.zapco.com/_files/ugd/0bf3d1_0e6c6a1860a94300923e9239c1da7971.pdf'},
 'Zapco Z-II':{page:'https://www.zapco.com/z-2-series'},
 'Zapco ST-D Compact':{page:'https://www.zapco.com/st-d-compact-series'},
 'Zapco Z-AP':{page:'https://www.zapco.com/z-ap-series'},
 'Zapco Analog Processors':{page:'https://www.zapco.com/analog-processors'},
 'Zapco DSP-IV':{page:'https://www.zapco.com/adsp-4-series',manual:'https://5a1c738a-65df-4d27-b529-e99b92128dc5.filesusr.com/ugd/0bf3d1_ddb2d3fe4c8f4b569c541d8b130f4103.pdf'},
 'Zapco Power/Caps':{page:'https://www.zapco.com/accessories'}
};
let done=0,skip=0,nm=0;
for(const d of fs.readdirSync(PD)){
 const f=path.join(PD,d,'index.html'); if(!fs.existsSync(f))continue;
 let h=fs.readFileSync(f,'utf8');
 if(h.includes('Documentation</h4>')){skip++;continue;}
 const cat=(h.match(/"category":\s*"([^"]*)"/)||[])[1]; const s=cat&&SERIES[cat]; if(!s){nm++;continue;}
 const links=[A(s.page,'Product Page at Zapco','↗')]; if(s.manual)links.push(A(s.manual,"Owner's Manual (PDF)",'↓'));
 const block=`<div class="pd-spec"><h4>Documentation</h4><div style="display:flex;flex-direction:column;gap:.45rem">${links.join('')}</div></div>`;
 const nh=h.replace(/(<\/div><\/div><\/section>)(\s*<footer)/, block+'$1$2');
 if(nh===h){console.log('  ANCHOR-MISS '+cat);continue;}
 fs.writeFileSync(f,nh); done++;
}
console.log('Zapco docs injected: '+done+', skipped(existing) '+skip+', non-Zapco '+nm);
