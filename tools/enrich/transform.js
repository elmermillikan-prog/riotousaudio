const fs=require('fs'), path=require('path');
const ROOT='/root/riotousconsulting-cloud/dist/_riotousaudio';
const OUT=process.env.RA_OUT || ROOT;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
const NARR_STYLE='<style>\n.pd-narr{margin:1.8rem 0}\n.pd-narr h4{font-size:.74rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:.9rem}\n.pd-narr ul{list-style:none}\n.pd-narr li{position:relative;padding:.7rem 0 .7rem 1.5rem;border-bottom:1px solid var(--line-soft);color:var(--ink-soft);font-size:.92rem;line-height:1.65}\n.pd-narr li::before{content:"\\2014";position:absolute;left:0;color:var(--gold)}\n.pd-narr li b{color:var(--ink);font-weight:500}\n</style>';
const PHEAD_FIX='<style>@media(min-width:921px){.phead .wrap{position:relative}.phead-art{top:50%;bottom:auto;transform:translateY(-50%);right:clamp(20px,5vw,64px);width:36%;max-width:420px;opacity:1}}</style>';

const SPECS={
"9.6W":{desc:"Some of the most technologically advanced car speakers ever produced. The 9000 mid-woofer pairs a high-modulus carbon-fibre cone — molded under vacuum and autoclave — with an oversized neodymium magnet and an FEM-analysed cast-aluminium basket.",narr:["Main Features",["The <b>pole cup</b>, designed with magnetic-flux analysis software, keeps the voice coil immersed in constant magnetic flux throughout its stroke.","A very powerful, high-temperature-resistant <b>neodymium magnet</b> greatly reduces the size and bulk of the magnetic motor.","The cast-aluminium, powder-coated <b>basket</b> offers very low resistance to airflow; its FEM-verified shape reduces vibration and resonance.","The 75 mm super-light <b>voice coil</b> ensures highest-in-class power handling, with an aluminium former, ventilation holes and black anodisation to dissipate heat.","The <b>cone</b> is high-modulus carbon, molded under vacuum and autoclave, for naturalness of reproduction and high transient dynamics.","A <b>CNC aluminium ring</b> secures the rubber suspension at the edge for perfect fastening and centering."]],sections:[["Key Specifications",[["Power Handling","180 W RMS · 360 W peak"],["Nominal Impedance","4 Ω"],["Sensitivity","91.5 dB (2.83 V / 1 m)"],["Frequency Response","48 Hz – 5 kHz"],["Voice Coil","75 mm aluminium"],["Mounting Diameter","165 mm (6.5″)"],["Mounting Depth","77 mm"]]],["Construction",[["Cone","High-modulus carbon fibre + dust cap"],["Surround","NBL rubber"],["Basket","Cast aluminium, powder-coated (FEM)"],["Magnet","Oversized neodymium N52-H"],["Spider","Flat Conex"]]],["Thiele–Small Parameters",[["Resonance (Fs)","61.9 Hz"],["DC Resistance (Re)","3.6 Ω"],["Inductance (Le)","110 µH"],["Qms / Qes / Qts","2.202 / 0.569 / 0.452"],["Vas","10.5 L"],["Xmax","5.25 mm"],["Sd","13.62 cm²"],["Mms","16.5 g"],["BL","6.375 N/A"]]]]},
"9.4M":{desc:"A 4-inch high-modulus carbon-fibre cone midrange with dual neodymium magnets and a die-cast aluminium basket.",narr:["Main Features",["High-modulus carbon-fibre cone and dust cup, molded under vacuum and autoclave.","High-grade <b>dual neodymium magnets</b> shrink the magnetic motor while raising output.","Die-cast, powder-coated aluminium basket with a low-turbulence profile."]],sections:[["Key Specifications",[["Power Handling","120 W RMS · 240 W peak"],["Nominal Impedance","4 Ω"],["Sensitivity","90.6 dB (2.83 V / 1 m)"],["Frequency Response","85 Hz – 20 kHz"],["Mounting Diameter","100 mm (4″)"]]],["Thiele–Small Parameters",[["Resonance (Fs)","135 Hz"],["DC Resistance (Re)","4.1 Ω"],["Qms / Qes / Qts","3.645 / 0.931 / 0.741"],["Vas","1.4 L"],["Xmax","2.8 mm"],["Sd","5.67 cm²"]]]]},
"9.3M":{desc:"A 3-inch high-modulus carbon-fibre cone midrange with NBL rubber suspension and a neodymium motor.",narr:["Main Features",["High-modulus carbon-fibre cone with NBL rubber surround.","High-grade neodymium magnet for a compact, powerful motor.","Aluminium-alloy basket tuned for low resonance."]],sections:[["Key Specifications",[["Power Handling","100 W RMS · 220 W peak"],["Nominal Impedance","4 Ω"],["Sensitivity","91.5 dB (2.83 V / 1 m)"],["Frequency Response","130 Hz – 20 kHz"],["Mounting Diameter","75 mm (3″)"]]],["Thiele–Small Parameters",[["Resonance (Fs)","127 Hz"],["DC Resistance (Re)","3.6 Ω"],["Qms / Qes / Qts","11.364 / 0.355 / 0.344"],["Vas","0.7 L"],["Sd","3.11 cm²"]]]]},
"9.1T-28":{desc:"A 1.1-inch silk-dome tweeter with TCA back-airflow control and an acoustic lens for optimised dispersion.",narr:["Main Features",["Pure silk dome with integrated catenary suspension reaches very high frequencies without vibration.","<b>TCA / FCA systems</b> control the air moved behind and in front of the dome for a more faithful response.","F52H neodymium magnet plus a secondary magnet stabilise the magnetic flux."]],sections:[["Key Specifications",[["Power Handling","100 W RMS · 220 W peak"],["Nominal Impedance","4 Ω"],["Sensitivity","94.5 dB (2.83 V / 1 m)"],["Frequency Response","1.4 kHz – 25 kHz"],["Dome","28 mm silk"]]],["Thiele–Small Parameters",[["Resonance (Fs)","690 Hz"],["DC Resistance (Re)","3.5 Ω"],["Qms / Qes / Qts","1.903 / 1.217 / 0.742"]]]]},
"9.1T-25":{desc:"A 1-inch silk-dome tweeter with an F52H neodymium magnet and a super-light aluminium voice coil.",narr:["Main Features",["Pure silk dome with a catenary profile for low mass and high-frequency reach.","F52H neodymium magnet for strong, heat-tolerant magnetic force.","Super-light aluminium voice coil with a pure-copper skin."]],sections:[["Key Specifications",[["Power Handling","100 W RMS · 220 W peak"],["Nominal Impedance","4 Ω"],["Sensitivity","91.5 dB (2.83 V / 1 m)"],["Frequency Response","1.1 kHz – 25 kHz"],["Dome","25 mm silk"]]],["Thiele–Small Parameters",[["Resonance (Fs)","1334 Hz"],["DC Resistance (Re)","3.6 Ω"],["Qms / Qes / Qts","1.910 / 1.981 / 0.972"]]]]},
"9.UMA":{desc:"A legend renewed: the UMA concentrates midrange and tweeter into a virtual single point, minimising phase delay at the crossover. Every part is CNC-machined for perfect geometry.",narr:["Main Features",["Combines the 9.1T-25 silk-dome tweeter with the 9.3M carbon midrange in one CNC-machined billet-aluminium flange.","Reproduces 130 Hz – 25 kHz with perfect linearity from a single virtual point source.","Tweeter and midrange are individually replaceable via screws."]],sections:[["Key Specifications",[["Configuration","2-Way Mid-High Unit (9.1T-25 + 9.3M)"],["Nominal Impedance","4 Ω"],["Frequency Response","130 Hz – 25 kHz"],["Overall","134 × 88 × 45 mm"]]]]}
};

// ---- Zapco Z-AP amps (compact table -> SPECS) ----
const AP_DESC="Zapco's flagship Class-AB \"Audiophile\" amplifier, built to set new sound-quality standards for car and home alike — designed by listening as much as by measuring.";
const AP_NARR=["The AP Difference",["The same high-end audiophile electrolytic caps as the flagship LX amps, with <b>WIMA poly caps</b> in the signal path.","A new low-noise input op-amp and the smoothest available op-amp in the signal path.","<b>Doubled output drivers</b> with increased operating voltage; a new aerospace insulator pulls heat off the outputs faster.","<b>0.1% precision resistors</b> at the differential input stage for the lowest possible noise floor.","Patented <b>multi-ground, gold-plated RCA</b> connectors for perfect signal transfer.","Low-noise <b>gain pots with detents</b>; matt-black finish with an engraved solid-copper serial plate."]];
// sku: [channels, [[powerLabel,powerVal]...], inputs, outputs, overall, chassis]
const AP={
"Z-150.2AP":[2,[["4 Ω Stereo","2 × 150 W"],["2 Ω Stereo","2 × 275 W"],["1 Ω Stereo","2 × 500 W *"],["4 Ω Bridged","1 × 550 W"],["2 Ω Bridged","1 × 1000 W *"]],"2 × RCA","2 × RCA","328 × 190 × 62 mm","300 × 190 × 62 mm"],
"Z-300.2AP":[2,[["4 Ω Stereo","2 × 300 W"],["2 Ω Stereo","2 × 500 W"],["1 Ω Stereo","2 × 800 W *"],["4 Ω Bridged","1 × 1000 W"],["2 Ω Bridged","1 × 1600 W *"]],"2 × RCA","2 × RCA","478 × 190 × 62 mm","450 × 190 × 62 mm"],
"Z-600.2AP":[2,[["4 Ω Stereo","2 × 600 W"],["2 Ω Stereo","2 × 1000 W"],["1 Ω Stereo","2 × 1600 W *"],["4 Ω Bridged","1 × 2000 W"],["2 Ω Bridged","1 × 3200 W *"]],"2 × RCA","2 × RCA","628 × 190 × 62 mm","600 × 190 × 62 mm"],
"Z-150.4AP":[4,[["4 Ω Stereo","4 × 150 W"],["2 Ω Stereo","4 × 275 W"],["1 Ω Stereo","4 × 400 W *"],["4 Ω Bridged","2 × 550 W"],["2 Ω Bridged","2 × 800 W *"]],"4 × RCA","2 × RCA","468 × 190 × 62 mm","440 × 190 × 62 mm"],
"Z-150.6AP":[6,[["4 Ω Stereo","6 × 150 W"],["2 Ω Stereo","6 × 275 W"],["1 Ω Stereo","6 × 500 W *"],["4 Ω Bridged","3 × 500 W"],["2 Ω Bridged","3 × 1000 W *"]],"6 × RCA","—","628 × 190 × 62 mm","600 × 190 × 62 mm"],
"Z-1100.1AP":[1,[["4 Ω Mono","1 × 650 W"],["2 Ω Mono","1 × 1100 W"],["1 Ω Mono","1 × 1600 W *"]],"2 × RCA","2 × RCA","508 × 190 × 62 mm","480 × 190 × 62 mm"],
"Z-2000.1AP":[1,[["4 Ω Mono","1 × 1200 W"],["2 Ω Mono","1 × 2000 W"],["1 Ω Mono","1 × 2400 W *"]],"2 × RCA","2 × RCA","628 × 190 × 62 mm","600 × 190 × 62 mm"]
};
for(const sku in AP){const a=AP[sku];const conns=[["Inputs",a[2]]];if(a[3]&&a[3]!=="—")conns.push(["Outputs",a[3]+" (pass-through)"]);conns.push(["Gain","Adjustable, 9 V – 1 V"]);
 SPECS[sku]={desc:AP_DESC,narr:AP_NARR,sections:[["Power Output",a[1]],["Performance",[["Amplifier Class","AB"],["Channels",String(a[0])],["Signal-to-Noise","over 110 dB"],["THD at Rated Power","under 1%"],["Frequency Response","15 Hz – 30 kHz"],["Tested Voltage","14.4 V"]]],["Connections & Controls",conns],["Dimensions",[["Overall (L × W × H)",a[4]],["Chassis (L × W × H)",a[5]]]]],note:"* Stable at 1 Ω stereo / 2 Ω bridged with music signal and proper ventilation."};}

const SERIES={
"ESB|9000":{intro:["Technology and design come together in a new and unusual aesthetic — the distinctive flower-shaped flanges around the tweeter dome and in the baskets of the cone speakers. But the shape isn't about looks; it's an expression of ESB's innovation.","Because the outer edge isn't equidistant from the centre, acoustic refraction along the speaker's edges is far less damaged. The same principle appears on the trailing edge of new Rolls-Royce aircraft engines, where turbulence is greatest — both are deliberate choices that channel airflow cleanly outward. It's just one inspiration behind a series full of technical innovation."]},
"Zapco|Z-AP":{intro:["Zapco began its quest for perfect sonic reproduction in 1974. The Z-AP \"Audiophile\" Series is the answer for the car — high-end internal components matched purely for sound quality, favourably compared to home amplifiers like McIntosh and Bryston.","Built on the acclaimed Z-Series LX, the AP amps add WIMA signal-path caps, low-noise audiophile op-amps, doubled output drivers and 0.1% precision resistors — for a signal-to-noise ratio beyond 110 dB and purity in even the quietest passages."]}
};


try{const _d="/root/_incoming/ra-enrich/data";if(fs.existsSync(_d)){for(const _f of fs.readdirSync(_d)){if(_f.endsWith(".json")){const _e=JSON.parse(fs.readFileSync(_d+"/"+_f,"utf8"));Object.assign(SPECS,_e.specs||{});Object.assign(SERIES,_e.series||{});console.log("merged "+_f+": +"+Object.keys(_e.specs||{}).length+" specs");}}}}catch(e){console.log("merge err",e.message);}
function jsonldBlocks(h){const out=[];const re=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;let m;while((m=re.exec(h))){out.push({full:m[0],body:m[1]});}return out;}
function buildInfo(sku,meta){const sp=SPECS[sku];if(!sp)return null;let o='';
 if(sp.desc)o+='<p style="color:var(--ink-soft);font-size:.95rem;line-height:1.7;margin:.2rem 0 .6rem">'+sp.desc+'</p>';
 if(sp.narr){o+='<div class="pd-narr"><h4>'+esc(sp.narr[0])+'</h4><ul>'+sp.narr[1].map(b=>'<li>'+b+'</li>').join('')+'</ul></div>';}
 for(const[h,rows]of sp.sections){o+='<div class="pd-spec"><h4>'+esc(h)+'</h4><table>'+rows.map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td></tr>').join('')+'</table></div>';}
 if(sp.note)o+='<p class="muted" style="margin:.4rem 0 0;font-size:.78rem">'+esc(sp.note)+'</p>';
 o+='<div class="pd-spec"><h4>Product Details</h4><table>'+[['Brand',meta.brand],['Series',meta.series],['Model',meta.model],['SKU',meta.sku],['EAN',meta.ean]].map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td></tr>').join('')+'</table></div>';
 return o;}
function transformProduct(h){
 if(h.includes('class="pd-narr"'))return null; // already enriched
 const blks=jsonldBlocks(h);let prod=null;
 for(const b of blks){try{const o=JSON.parse(b.body);if(o['@type']==='Product')prod={o,full:b.full};}catch(e){}}
 if(!prod||!SPECS[prod.o.sku])return null;
 const sku=prod.o.sku,cat=prod.o.category||'',brand=(prod.o.brand&&prod.o.brand.name)||'',series=cat.replace(brand,'').trim();
 const info=buildInfo(sku,{brand,series,model:prod.o.mpn||prod.o.name,sku,ean:prod.o.gtin13||''});
 const ks=(SPECS[sku].sections[0]&&SPECS[sku].sections[0][1])||[];
 const o2=Object.assign({},prod.o),rest={};['offers','gtin13','image'].forEach(k=>{if(k in o2){rest[k]=o2[k];delete o2[k];}});
 if(ks.length)o2.additionalProperty=ks.map(r=>({"@type":"PropertyValue",name:r[0],value:r[1]}));Object.assign(o2,rest);
 h=h.replace(prod.full,'<script type="application/ld+json">'+JSON.stringify(o2)+'</script>');
 h=h.replace('<link rel="stylesheet" href="/assets/site.css">','<link rel="stylesheet" href="/assets/site.css">'+NARR_STYLE);
 h=h.replace(/<div class="pd-spec"><h4>Specifications<\/h4><table>[\s\S]*?<\/table><\/div>/,info);
 return h;}
function transformSeries(h,key){
 if(h.includes('phead-art'))return null;
 const meta=SERIES[key];if(!meta)return null;
 const og=(h.match(/og:image" content="([^"]+)"/)||[])[1]||'';
 const art=og?'<div class="phead-art"><img src="'+og+'" alt="series hero"></div>':'';
 h=h.replace('<link rel="stylesheet" href="/assets/site.css">','<link rel="stylesheet" href="/assets/site.css">'+PHEAD_FIX);
 h=h.replace('<section class="phead"><div class="wrap">','<section class="phead"><div class="wrap">\n'+art);
 const introHtml=meta.intro.map(p=>'<p style="color:var(--ink-soft);max-width:600px;margin-top:1.2rem;font-size:1rem;line-height:1.85">'+p+'</p>').join('\n');
 h=h.replace(/(<p class="lead">[\s\S]*?<\/p>)/,'$1\n'+introHtml);
 return h;}
function writeOut(rel,html){const p=path.join(OUT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,html);}

// ---- GENERAL data-gated idempotent run ----
let np=0,ns=0;
for(const d of fs.readdirSync(path.join(ROOT,'product'))){
 const f=path.join(ROOT,'product',d,'index.html');if(!fs.existsSync(f))continue;
 const nh=transformProduct(fs.readFileSync(f,'utf8'));if(nh){writeOut('product/'+d+'/index.html',nh);np++;}
}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
for(const key in SERIES){const[brand,series]=key.split('|');const rel=brand.toLowerCase()+'/'+slug(series)+'/index.html';const f=path.join(ROOT,rel);if(!fs.existsSync(f)){console.log('  series page missing: '+rel);continue;}const nh=transformSeries(fs.readFileSync(f,'utf8'),key);if(nh){writeOut(rel,nh);ns++;}}
console.log('enriched this run: '+np+' product pages, '+ns+' series pages');
