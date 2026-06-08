const fs=require('fs');
const DS=JSON.parse(fs.readFileSync('/root/_incoming/ra-enrich/data/esb-datasheets.json','utf8')).specs;
const CM={
'5.165':['5.165','6.5”/165 mm mid-woofer'],'5.050':['5.050','2”/50 mm dome midrange'],'5.028':['5.028','1.1”/28 mm soft-dome tweeter'],'5.UMA':['5.UMA','2-way mid-high (UMA) unit'],'5.6K2CX':['5.6K2 CX','2-way passive crossover'],'5.6K3CX':['5.6K3 CX','3-way passive crossover'],
'8.165':['8.165','6.5”/165 mm mid-woofer'],'8.075':['8.075','3”/75 mm cone midrange'],'8.028':['8.028','1.1”/28 mm dome tweeter'],'8.028S':['8.028S','1.1”/28 mm shallow dome tweeter'],'8.003UMA':['8.003 UMA','2-way mid-high (UMA) unit'],'8.6K2CX':['8.6K2 CX','2-way passive crossover'],'8.6K3CX':['8.6K3 CX','3-way passive crossover']};
const SYS={
'5.6K2':{s:'5000',w:'2-way component speaker system',c:['5.165','5.028'],woof:'5.165'},
'5.6K2X':{s:'5000',w:'2-way component speaker system with crossover',c:['5.165','5.028','5.6K2CX'],woof:'5.165'},
'5.6K3':{s:'5000',w:'3-way component speaker system',c:['5.165','5.050','5.028'],woof:'5.165'},
'5.6K3X':{s:'5000',w:'3-way component speaker system with crossover',c:['5.165','5.050','5.028','5.6K3CX'],woof:'5.165'},
'5.6K3U':{s:'5000',w:'3-way component speaker system with UMA',c:['5.165','5.UMA'],woof:'5.165'},
'5.6K3UX':{s:'5000',w:'3-way component speaker system with UMA and crossover',c:['5.165','5.UMA','5.6K3CX'],woof:'5.165'},
'8.6K2':{s:'8000',w:'2-way component speaker system',c:['8.165','8.028','8.6K2CX'],woof:'8.165'},
'8.6K2S':{s:'8000',w:'2-way component speaker system (shallow tweeter)',c:['8.165','8.028S','8.6K2CX'],woof:'8.165'},
'8.6K3':{s:'8000',w:'3-way component speaker system',c:['8.165','8.075','8.028','8.6K3CX'],woof:'8.165'},
'8.6K3S':{s:'8000',w:'3-way component speaker system (shallow tweeter)',c:['8.165','8.075','8.028S','8.6K3CX'],woof:'8.165'},
'8.6K3U':{s:'8000',w:'3-way component speaker system with UMA',c:['8.165','8.003UMA','8.6K3CX'],woof:'8.165'}};
const role=d=>/woofer/i.test(d)?'Mid-Woofer':/midrange/i.test(d)?'Midrange':/tweeter/i.test(d)?'Tweeter':/UMA/i.test(d)?'Mid-High (UMA)':/crossover/i.test(d)?'Crossover':'Component';
const woofPerf=w=>{const e=DS[w];if(!e||!e.sections)return[];const p=e.sections.find(s=>/Power & Performance/.test(s[0]));return p?p[1].filter(r=>/Impedance|Continuous Power|Peak Power/.test(r[0])):[];};
const specs={};
for(const sku in SYS){const y=SYS[sku];
 const drivers=y.c.filter(c=>!/CX/.test(c)).map(c=>CM[c][0]).join(' + ');
 const cx=y.c.find(c=>/CX/.test(c));
 const desc=`The ${sku} is ESB's ${y.s} Series ${y.w} — ${drivers}${cx?`, matched by the ${CM[cx][0]} passive crossover`:''}. Conceived and built in Italy as an exercise in obsession.`;
 const cfg=[['Type',y.w]]; for(const c of y.c)cfg.push([role(CM[c][1]),CM[c][0]]);
 const sec=[['System Configuration',cfg]]; const pf=woofPerf(y.woof); if(pf.length)sec.push(['Power & Performance',pf]);
 specs[sku]={desc,narr:['In the System',y.c.map(c=>CM[c][0]+' — '+CM[c][1])],sections:sec};}
fs.writeFileSync('/root/_incoming/ra-enrich/data/esb-systems.json',JSON.stringify({specs},null,1));
console.log('composed '+Object.keys(specs).length+' systems: '+Object.keys(specs).join(', '));
