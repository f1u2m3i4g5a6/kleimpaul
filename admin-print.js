(()=>{
  function active(){return document.querySelector('.section.active')}
  function printActive(){const sec=active();if(!sec)return;document.body.dataset.printSection=sec.dataset.section||'';window.print();setTimeout(()=>delete document.body.dataset.printSection,300)}
  function init(){document.getElementById('adminPrintSection')?.addEventListener('click',printActive)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
