const fs=require('fs');const F='/root/_incoming/ra-enrich/transform.js';let s=fs.readFileSync(F,'utf8');let n=0;
const a='const ks=SPECS[sku].sections[0][1];';
const b='const ks=(SPECS[sku].sections[0]&&SPECS[sku].sections[0][1])||[];';
if(s.includes(a)){s=s.split(a).join(b);n++;}
const c='o2.additionalProperty=ks.map(r=>({"@type":"PropertyValue",name:r[0],value:r[1]}));Object.assign(o2,rest);';
const d='if(ks.length)o2.additionalProperty=ks.map(r=>({"@type":"PropertyValue",name:r[0],value:r[1]}));Object.assign(o2,rest);';
if(s.includes(c)){s=s.split(c).join(d);n++;}
fs.writeFileSync(F,s);console.log('fixed '+n+' spots');
