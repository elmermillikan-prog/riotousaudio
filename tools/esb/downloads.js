const fs=require('fs');
const ESB='https://www.esbcar.com/_files/ugd/0bf3d1_';
const ZF='https://5a1c738a-65df-4d27-b529-e99b92128dc5.filesusr.com/ugd/0bf3d1_';
const ZW='https://www.zapco.com/_files/ugd/0bf3d1_';
const esbManuals=[['1000 Series — Installation','caf1ff1fa9494987979f900e266f1009'],['3000 Series — Installation (all components)','6b258fdf3e8e4c499e5d2e82032d26a7'],['4000 Series — Quick Installation','995be5c0d58549b19783ba20090912d3'],['5000 Series — Quick Installation','eac8e87361ab43eca0286343de1c908a'],['8000 Series — Quick Installation','d94bf774c60549afbf2bae3c6f15a050'],['9000 Series — Quick Installation','984b0f45c6a748218c3de2b5c883293b']];
const esbUma=[['9.UMA','q8g5n4asq0tphawit9mwy'],['8.UMA','g78yx4hyt8j03wvax21il'],['5.UMA','cunxhtgkonn4dst4mvbs1'],['4.UMA','ufndc222h5981a0kwsyy4'],['3.UMA','ezr9po9ck1pls0w28s0vr']];
const zMan=[["Reference Series — Owner's Manual",ZF+'5751a9181c8544788d9e1a150db843f6.pdf'],["ST-X SQ Series — Owner's Manual",ZW+'0e6c6a1860a94300923e9239c1da7971.pdf'],["DSP-Z8 IV — User's Manual",ZF+'ddb2d3fe4c8f4b569c541d8b130f4103.pdf'],["DSP-IV II — User's Manual",ZF+'4f43f29fface41cc990900d26804097b.pdf'],["Tech Note — Amplifier Class, Power & Heat",ZF+'c6cb6df223f749c594ea145f70cfce2a.pdf']];
const A=(u,t,ic)=>`<a class="dl" href="${u}" target="_blank" rel="noopener"><span>${t}</span><em>${ic}</em></a>`;
const hub=(u,t)=>`<a class="dl dl-hub" href="${u}" target="_blank" rel="noopener"><span>${t}</span><em>↗</em></a>`;
const HEAD=`<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Documentation &amp; Downloads — Riotous Audio</title>
<meta name="description" content="Datasheets, owner's manuals, installation guides and resources for ESB, Zapco and Harmony car audio — curated by Riotous Audio.">
<link rel="canonical" href="https://riotousaudio.com/downloads/">
<meta property="og:title" content="Documentation & Downloads — Riotous Audio"><meta property="og:image" content="https://riotousaudio.com/assets/img/cut/hero_uma.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#0a0a0c">
<style>.dl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:.9rem;margin-top:1.6rem}
.dl{display:flex;align-items:center;justify-content:space-between;gap:1rem;border:1px solid var(--line-soft);border-radius:4px;padding:1rem 1.3rem;background:linear-gradient(170deg,var(--void-3),var(--void));transition:all .35s}
.dl:hover{border-color:var(--line);transform:translateY(-3px)}
.dl span{font-size:.92rem;color:var(--ink-soft)}.dl em{font-style:normal;color:var(--gold);font-size:1.1rem}
.dl-hub{background:linear-gradient(160deg,rgba(201,168,106,.10),var(--void));border-color:var(--line)}
.dl-hub span{color:var(--ink);font-family:var(--serif);font-size:1.15rem}</style></head>`;
const HEADER=`<body><header class="nav"><div class="wrap nav-in">
<a class="brand" href="/"><span class="dot"></span>Riotous<b>Audio</b></a>
<nav class="links" id="nav"><a href="/esb/">ESB</a><a href="/zapco/">Zapco</a><a href="/harmony/">Harmony</a><a href="/craft/">Craft</a><a href="/contact/" class="nav-cta">Contact</a></nav>
<button class="burger" onclick="document.getElementById('nav').classList.toggle('open')"><span></span><span></span><span></span></button>
</div></header>`;
const FOOTER=`<footer><div class="wrap"><div class="foot-grid">
<div class="foot-brand"><div class="serif">Riotous<span style="color:var(--gold)">Audio</span></div><p>Your first source for ESB, Zapco and Harmony car audio in the United States.</p></div>
<div><h5>Houses</h5><a href="/esb/">ESB Audio</a><a href="/zapco/">Zapco</a><a href="/harmony/">Harmony</a></div>
<div><h5>Explore</h5><a href="/esb/">Loudspeakers</a><a href="/zapco/">Amplifiers</a><a href="/downloads/">Documentation</a><a href="/craft/">The Craft</a></div>
<div><h5>Contact</h5><a href="/contact/">Inquire to Order</a><a href="/contact/">Dealer & Install</a></div></div>
<div class="foot-bottom"><span>© 2026 Riotous Audio · A Riotous Consulting LLC venture (SDVOSB)</span><span class="dis">Authorized U.S. dealer. ESB, Zapco and Harmony are trademarks of their respective owners. Documentation is provided by the manufacturers; links open on their official sites.</span></div></div></footer></body></html>`;
const body=`
<section class="hero" style="min-height:auto;padding-top:150px;padding-bottom:0"><div class="wrap"><div class="rv in" style="max-width:780px">
<span class="eyebrow">Resources</span><h1 style="font-size:clamp(2.4rem,5vw,4rem)">Documentation<br><span class="accent">&amp; Downloads</span></h1>
<p class="lead">Every model's spec sheet is linked on its own product page. The libraries below cover the over-arching material — installation manuals, owner's manuals, technical notes and design files — served from the manufacturers, always current.</p></div></div></section>
<section><div class="wrap"><div class="sec-head rv"><span class="eyebrow">ESB Audio · Italy</span><h2>ESB loudspeakers</h2>
<p class="lead">Per-product Technical Data Sheets live on each ESB product page. Below: the full ESB library plus series installation manuals and UMA acoustic-pod 3D-print files.</p></div>
<div class="dl-grid rv">${hub('https://www.esbcar.com/support','ESB — Complete Datasheet & Manual Library')}
${esbManuals.map(m=>A(ESB+m[1]+'.pdf',m[0],'↓')).join('')}
${esbUma.map(m=>A('https://www.dropbox.com/scl/fi/'+m[1]+'/'+m[0]+'.zip',m[0]+' — Acoustic Pod (3D files)','↓')).join('')}</div></div></section>
<section style="background:linear-gradient(180deg,transparent,var(--void-2),transparent)"><div class="wrap"><div class="sec-head rv"><span class="eyebrow">Zapco · Since 1974</span><h2>Zapco amplifiers &amp; processors</h2>
<p class="lead">Each amplifier and processor links its product page and series manual. Below: Zapco's full support library, key owner's manuals and tuning software.</p></div>
<div class="dl-grid rv">${hub('https://www.zapco.com/support','Zapco — Complete Manual & Software Library')}
${zMan.map(m=>A(m[1],m[0],'↓')).join('')}</div></div></section>
<section><div class="wrap"><div class="sec-head rv"><span class="eyebrow">Harmony · by Zapco</span><h2>Harmony</h2>
<p class="lead">Hard Rock speakers &amp; subwoofers documentation lives in the ESB library; Blue Note DSP amplifiers, media stations and tuning apps live in the Zapco library.</p></div>
<div class="dl-grid rv">${hub('https://www.esbcar.com/harmony-series','Harmony Hard Rock — at ESB')}${hub('https://www.zapco.com/hb-series','Harmony Blue Note — at Zapco')}</div></div></section>`;
const REVEAL=`<script>const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.rv').forEach(el=>io.observe(el));</script>`;
fs.mkdirSync('/root/riotousconsulting-cloud/dist/_riotousaudio/downloads',{recursive:true});
fs.writeFileSync('/root/riotousconsulting-cloud/dist/_riotousaudio/downloads/index.html', HEAD+HEADER+body+REVEAL+FOOTER);
console.log('downloads page written ('+(HEAD+HEADER+body+REVEAL+FOOTER).length+' bytes)');
