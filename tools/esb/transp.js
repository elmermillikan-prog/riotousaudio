const Jimp=require('jimp');
const dir='/root/riotousconsulting-cloud/dist/_riotousaudio/assets/img/cutall';
(async()=>{
 for(const h of process.argv.slice(2)){
  let img;try{img=await Jimp.read(dir+'/'+h+'.jpg');}catch(e){console.log(h+' ERR '+e.message);continue;}
  const W=img.bitmap.width,H=img.bitmap.height,data=img.bitmap.data;
  const isW=i=>data[i]>236&&data[i+1]>236&&data[i+2]>236;
  const vis=new Uint8Array(W*H),st=[];
  const seed=(x,y)=>{const p=y*W+x;if(!vis[p]&&isW(p*4)){vis[p]=1;st.push(p);}};
  for(let x=0;x<W;x++){seed(x,0);seed(x,H-1);} for(let y=0;y<H;y++){seed(0,y);seed(W-1,y);}
  let c=0; while(st.length){const p=st.pop();const x=p%W,y=(p/W)|0;data[p*4+3]=0;c++;const nb=[[1,0],[-1,0],[0,1],[0,-1]];for(let k=0;k<4;k++){const nx=x+nb[k][0],ny=y+nb[k][1];if(nx>=0&&nx<W&&ny>=0&&ny<H){const np=ny*W+nx;if(!vis[np]&&isW(np*4)){vis[np]=1;st.push(np);}}}}
  if(W>1000)img.resize(1000,Jimp.AUTO);
  img.deflateLevel(9); await img.writeAsync(dir+'/'+h+'.png');
  console.log(h+' '+W+'x'+H+' '+Math.round(100*c/(W*H))+'% transp');
 }
})();
