/* Kleimpaul Site — APEX Experience. Microinterações leves e progressivas. */
(()=>{
 'use strict';
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
 function header(){const h=$('header');if(!h)return;const sync=()=>h.classList.toggle('apex-scrolled',scrollY>24);sync();addEventListener('scroll',sync,{passive:true});}
 function depth(){if(matchMedia('(prefers-reduced-motion: reduce)').matches||innerWidth<900)return;const hero=$('#inicio');if(!hero)return;let raf=0;hero.addEventListener('pointermove',e=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;hero.style.setProperty('--apex-x',`${x*18}px`);hero.style.setProperty('--apex-y',`${y*12}px`);});});hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--apex-x','0px');hero.style.setProperty('--apex-y','0px')});}
 function cards(){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('apex-in');io.unobserve(e.target)}}),{threshold:.09,rootMargin:'70px'});$$('.product-card,.about-item,.contact-item,.cms-catalog-card').forEach((el,i)=>{el.classList.add('apex-reveal');el.style.setProperty('--apex-delay',`${Math.min(i%8,7)*45}ms`);io.observe(el)});}
 function init(){header();depth();cards();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
