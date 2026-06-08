const fs=require('fs');
let ES={}; try{ES=JSON.parse(fs.readFileSync('/root/_incoming/ra-enrich/data/esb-specs.json','utf8')).specs;}catch(e){}
const CM={'3.165':['3.165','6.5”/165 mm mid-woofer'],'3.65':['3.65','2.5”/65 mm midrange'],'3.28':['3.28','1.1”/28 mm dome tweeter'],'3.UMA':['3.UMA','2-way mid-high (UMA) unit'],'3.6K2CX':['3.6K2 CX','2-way passive crossover'],'3.6K3CX':['3.6K3 CX','3-way passive crossover']};
const SYS={
'3.6K2':{w:'2-way component speaker system',c:['3.165','3.28'],woof:'3.165'},
'3.6K2X':{w:'2-way component speaker system with crossover',c:['3.165','3.28','3.6K2CX'],woof:'3.165'},
'3.6K3':{w:'3-way component speaker system',c:['3.165','3.65','3.28'],woof:'3.165'},
'3.6K3U':{w:'3-way component speaker system with UMA',c:['3.165','3.UMA'],woof:'3.165'}};
const role=d=>/woofer/i.test(d)?'Mid-Woofer':/midrange/i.test(d)?'Midrange':/tweeter/i.test(d)?'Tweeter':/UMA/i.test(d)?'Mid-High (UMA)':/crossover/i.test(d)?'Crossover':'Component';
const perf=w=>{const e=ES[w];if(!e||!e.sections)return[];const out=[];for(const s of e.sections)for(const r of s[1])if(/impedance|power|watt/i.test(r[0])&&out.length<3)out.push(r);return out;};
const specs={};
for(const sku in SYS){const y=SYS[sku];
 const drivers=y.c.filter(c=>!/CX/.test(c)).map(c=>CM[c][0]).join(' + ');
 const cx=y.c.find(c=>/CX/.test(c));
 specs[sku]={desc:`The ${sku} is ESB's 3000 Series ${y.w} — ${drivers}${cx?`, matched by the ${CM[cx][0]} passive crossover`:''}. Conceived and built in Italy.`,
  narr:['In the System',y.c.map(c=>CM[c][0]+' — '+CM[c][1])],
  sections:(()=>{const cfg=[['Type',y.w]];for(const c of y.c)cfg.push([role(CM[c][1]),CM[c][0]]);const s=[['System Configuration',cfg]];const p=perf(y.woof);if(p.length)s.push(['Power & Performance',p]);return s;})()};}
fs.writeFileSync('/root/_incoming/ra-enrich/data/esb-systems-3k.json',JSON.stringify({specs},null,1));
console.log('composed '+Object.keys(specs).length+' (3.69K2.5 left for sanity pass — 6x9 makeup needs esbcar confirm)');
