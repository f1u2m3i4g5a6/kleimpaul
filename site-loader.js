(()=>{
  const html=document.documentElement,loader=document.getElementById('kp-site-loader');
  if(!loader){html.classList.remove('kp-loading');return}
  let done=false;const first=!sessionStorage.getItem('kp_seen'),started=performance.now(),min=first?180:70;
  const finish=()=>{if(done)return;done=true;sessionStorage.setItem('kp_seen','1');const wait=Math.max(0,min-(performance.now()-started));setTimeout(()=>{html.classList.remove('kp-loading');html.classList.add('kp-loaded');setTimeout(()=>loader.remove(),230)},wait)};
  const dom=document.readyState==='loading'?new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true})):Promise.resolve();
  const cms=window.KleimpaulCMS?.initialReady?Promise.resolve():new Promise(r=>{window.addEventListener('kleimpaul:cms-ready',r,{once:true});setTimeout(r,850)});
  Promise.allSettled([dom,cms]).then(finish);
  setTimeout(finish,1250);
  window.addEventListener('pageshow',e=>{if(e.persisted)finish()},{once:true});
})();
