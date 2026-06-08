const fs=require('fs');const F='/root/_incoming/ra-enrich/transform.js';let s=fs.readFileSync(F,'utf8');
if(s.includes('ra-enrich/data')){console.log('transform.js already patched');process.exit(0);}
const ins='\ntry{const _d="/root/_incoming/ra-enrich/data";if(fs.existsSync(_d)){for(const _f of fs.readdirSync(_d)){if(_f.endsWith(".json")){const _e=JSON.parse(fs.readFileSync(_d+"/"+_f,"utf8"));Object.assign(SPECS,_e.specs||{});Object.assign(SERIES,_e.series||{});console.log("merged "+_f+": +"+Object.keys(_e.specs||{}).length+" specs");}}}}catch(e){console.log("merge err",e.message);}\n';
s=s.replace('function jsonldBlocks(h)',ins+'function jsonldBlocks(h)');fs.writeFileSync(F,s);console.log('patched transform.js');
