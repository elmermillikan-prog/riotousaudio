const fs=require('fs'),path=require('path');
const PD='/root/riotousconsulting-cloud/dist/_riotousaudio/product';
const B='https://www.esbcar.com/_files/ugd/0bf3d1_';
// page SKU -> datasheet hash
const DS={
'1.6K2X':'8d41a528fc50478798c6592f605a4b10','1.6C':'5a40babbc7234f2dae838a0d669e1931','1.10SD4':'a46c310199f1487f9d823e2737fab673','1.10SD2':'a46c310199f1487f9d823e2737fab673',
'3.25':'fb8f88fea43f47509007a036a1e1641a','3.28':'f8d45370cadc4dd0beeebdf0b82b73b5','3.UMA':'e1916ae6eb974a29a7ff4934dba5210d','3.65':'18e04987cce348bda7fe38e9437dd3de','3.90':'ec3795c5a10a4b55a5a5d0df405b0f1c','3.165':'3491e09f1dfc46f7934c90d01a6de15e','3.69':'9f4ef82633134b6491e73f6e9de029bc','3.69C':'b677988156e24437b38e06710d39612c','3.10D4':'c327a50b6a814e26a3715f256484cba7','3.10D2':'c327a50b6a814e26a3715f256484cba7','3.WB6':'6c0c1705aa8e4f1ca5ed9a1db2d31be7','3.WB8G':'caf506e5343e4dc88948fd77f2c1a6bb','3.6K2CX':'2729b0cd7ad24b40a6aa57a67ebaafda','3.6K3CX':'db8ea3dfb33e41bd9d40f5a1e2dad5b2','3.6K3HECX':'e0ea82354ff348369d672ed49ede6b88',
'4.28':'8b5ed02663044823b15e42a4e105bd37','4.75':'5fd21d4d0e5c4c7b999e8bdb059e904d','4.100':'f3b3338ec0ea449b9b5b68c484eb8fed','4.UMA':'85abc88062a048a680ec5bdb8245e302','4.165':'59169660147041a5b3caac85046aca34','4.6C':'3abb33ebd2a0438d8259225e34de27a0','4.6K2CX':'f0173d31fc7f49ff888b2b88b86b2ea9','4.6K3CX':'d6ff008640224458aa3887c4fe794bf1',
'5.028':'2a23d24b3b9b444c87d3ab1f5fabcf46','5.050':'75734c5d2e584905975ccba1bc408056','5.165':'55a84e7888e643fd810491ba285d1105','5.UMA':'43366929b4f341a594e7bfa570665753','5.6K2CX':'fe44aef2e4144adb802f3b3275578226','5.6K3CX':'c191d7201b1d477f85305e086a9cafff',
'8.028':'92089aee876d473d8fb7d84d349573cd','8.028S':'92089aee876d473d8fb7d84d349573cd','8.003UMA':'ba572b1251a84513a108b7dd1c6f316d','8.075':'0ef6e1170f6e47559e637929683bc06c','8.165':'4f159dbec8574ccfa6f7068a3eea15b7','8.6K2CX':'c264b5a741f049d6a1b6b9f111401851','8.6K3CX':'c10de2660e294efa89b0808801cd90bf',
'9.1T-25':'1712e9a1c6c64cb99ff1bfca0b9a6e26','9.1T-28':'d96e37c98b3345089258da0f2ccf6669','9.UMA':'0c271dc5b11a41ee9bee5df6eb17244a','9.3M':'fbe8530728184e578fd6d510ec83a5fc','9.4M':'2f7fe466d9344e47bd6703eb2d106a03','9.6W':'52519e29c97f45009940bf079cef5626',
'A6FRONT200':'62b462e7e71b492f80b9e6fb3a6b8e68','A4FRONT200':'dcf036b9a4804ceb9a40732aa440f8ca','Q5FRONT200':'dcf036b9a4804ceb9a40732aa440f8ca','A6REAR165':'5a9ba179a0a34b94b6239e1d77463d46','A4/Q5REAR165':'5a9ba179a0a34b94b6239e1d77463d46',
'HR6USP':'79240f3459a843da9920aaa9f362ff0e','HR10US':'1687bc64754e4cfabe7c66bf80f9c924','HR10US-A':'b8e758871f674cdb97023fcb0d087e5d','HR11SW':'9c915d7433054fd5ad7b0e868260c4e6'
};
const INS={'3.WB6':'dd7f646fb2ae4030990356b1c8218979','HR6USP':'3e63483724ae4ee78a1716cb10556662','HR10US':'1206d6c1e2df403b9ef5faec96e1dbe4','HR10US-A':'2c1a0a45fcf241c68a3ddd61801d6d36','HR11SW':'d55bc675ede8476f82aef5cd05ef8022'};
const A=(u,t)=>`<a href="${u}" target="_blank" rel="noopener" style="color:var(--gold);font-size:.82rem;letter-spacing:.04em">↓ ${t}</a>`;
let done=0,skip=0,nomatch=0;
for(const d of fs.readdirSync(PD)){
 const f=path.join(PD,d,'index.html'); if(!fs.existsSync(f))continue;
 let h=fs.readFileSync(f,'utf8');
 if(h.includes('Documentation</h4>')){skip++;continue;}
 const sku=(h.match(/"sku":\s*"([^"]*)"/)||[])[1]; if(!sku||!DS[sku]){nomatch++;continue;}
 const links=[A(B+DS[sku]+'.pdf','Technical Data Sheet (PDF)')];
 if(INS[sku])links.push(A(B+INS[sku]+'.pdf','Installation Guide (PDF)'));
 const block=`<div class="pd-spec"><h4>Documentation</h4><div style="display:flex;flex-direction:column;gap:.45rem">${links.join('')}</div></div>`;
 const nh=h.replace(/(<\/div><\/div><\/section>)(\s*<footer)/, block+'$1$2');
 if(nh===h){console.log('  ANCHOR-MISS '+sku);continue;}
 fs.writeFileSync(f,nh); done++;
}
console.log('injected '+done+' product pages, skipped(existing) '+skip+', no-datasheet '+nomatch);
