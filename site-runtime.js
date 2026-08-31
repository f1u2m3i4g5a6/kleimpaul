import { FIREBASE_CONFIG, DEFAULT_COMPANY_ID } from './firebase-config.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getFirestore, doc, collection, onSnapshot, query, where, getDoc, getDocs } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const COMPANY_ID = document.documentElement.dataset.company || DEFAULT_COMPANY_ID;
const PAGE = (()=>{
  const n = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  return n.replace(/\.html?$/,'').replace(/\(.*?\)$/,'') || 'index';
})();
const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const company = (...parts)=>['empresas',COMPANY_ID,...parts];
const escapeHTML=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

window.KleimpaulCMS = {db, companyId:COMPANY_ID, page:PAGE, connected:false};
let cachedOverrides=[];
let searchCatalogPromise=null;
const initialReadyParts={settings:false,overrides:false};
function markInitialReady(part){initialReadyParts[part]=true;if(initialReadyParts.settings&&initialReadyParts.overrides&&!window.KleimpaulCMS.initialReady){window.KleimpaulCMS.initialReady=true;window.dispatchEvent(new CustomEvent('kleimpaul:cms-ready'));}}
setTimeout(()=>{markInitialReady('settings');markInitialReady('overrides')},900);

const KP_EMPTY_IMAGE='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
const mediaCache=new Map();
function isLegacyStaticImage(value){const raw=String(value||'').trim();return !!raw&&!/^(?:https?:|data:|blob:|media:)/i.test(raw)&&/\.(?:png|jpe?g|webp|gif|svg|ico)(?:[?#].*)?$/i.test(raw);}
function mediaId(value){const m=String(value||'').match(/^media:([A-Za-z0-9_-]+)$/);return m?m[1]:null;}
async function resolveMedia(value){
  const raw=String(value||'').trim();
  const id=mediaId(raw);
  if(!id){
    if(!raw)return '';
    if(isLegacyStaticImage(raw))return KP_EMPTY_IMAGE;
    if(/^(?:https?:|data:|blob:)/i.test(raw))return raw;
    return ''; // somente Mídia/URL válida; evita requisições acidentais como /a
  }
  if(mediaCache.has(id)) return mediaCache.get(id);
  try{const snap=await getDoc(doc(db,...company('media',id)));const data=snap.exists()?snap.data():null;const out=data&&(data.public===true)?(data.dataUrl||data.url||''):'';mediaCache.set(id,out||'');return mediaCache.get(id)}catch{ mediaCache.set(id,''); return ''; }
}
async function resolveRowsImages(rows){return await Promise.all(rows.map(async x=>({...x,image:x.image?await resolveMedia(x.image):x.image})));}

let globalImageRules=[];
let globalImageObserver=null;
let activeLogoResolved='';
function globalImageKey(value){
  const raw=String(value||'').trim(); if(!raw)return '';
  if(/^media:/i.test(raw))return raw.toLowerCase();
  if(/^data:/i.test(raw))return raw.slice(0,96);
  try{
    const u=new URL(raw,location.href);
    const path=decodeURIComponent(u.pathname).replace(/\\/g,'/');
    const base=path.split('/').filter(Boolean).pop()||'';
    return base.toLowerCase();
  }catch{return raw.replace(/^\.\//,'').split('/').pop().toLowerCase();}
}
function cssFirstUrl(value){const m=String(value||'').match(/url\((?:["']?)(.*?)(?:["']?)\)/i);return m?m[1]:'';}
function isLogoKey(key){return /(^|\/)logo\.[a-z0-9]+$/i.test(String(key||''));}
async function applyGlobalImageReplacements(root=document){
  if(!globalImageRules.length)return;
  const rules=globalImageRules.filter(x=>x&&x.enabled!==false&&x.match&&x.value);
  if(!rules.length)return;
  const imgs=[];
  if(root?.tagName==='IMG')imgs.push(root);
  if(root?.querySelectorAll)imgs.push(...root.querySelectorAll('img'));
  for(const img of imgs){
    const original=img.dataset.cmsOriginalSrc||img.getAttribute('src')||img.currentSrc||'';
    if(!img.dataset.cmsOriginalSrc&&original)img.dataset.cmsOriginalSrc=original;
    const key=globalImageKey(original); const rule=rules.find(x=>globalImageKey(x.match)===key); if(!rule)continue;
    const value=await resolveMedia(rule.value); if(!value)continue; if(activeLogoResolved&&value===activeLogoResolved&&!isLogoKey(key))continue; if(img.src!==value)img.src=value;
    if(rule.alt)img.alt=rule.alt;
    if(rule.fit)img.style.setProperty('object-fit',rule.fit,'important');
    if(rule.aspectRatio)img.style.setProperty('aspect-ratio',rule.aspectRatio,'important');
    if(rule.position)img.style.setProperty('object-position',rule.position,'important');
  }
  const nodes=[];
  if(root?.nodeType===1)nodes.push(root);
  if(root?.querySelectorAll)nodes.push(...root.querySelectorAll('*'));
  for(const el of nodes){
    if(el.tagName==='IMG'||['SCRIPT','STYLE','LINK','META'].includes(el.tagName))continue;
    let cs;try{cs=getComputedStyle(el)}catch{continue}
    const bg=cs.backgroundImage; const src=cssFirstUrl(bg);
    const original=el.dataset.cmsOriginalBg||src; if(!original)continue; if(!el.dataset.cmsOriginalBg&&original)el.dataset.cmsOriginalBg=original;
    const key=globalImageKey(original); const rule=rules.find(x=>globalImageKey(x.match)===key); if(!rule)continue;
    const value=await resolveMedia(rule.value); if(!value||value===KP_EMPTY_IMAGE)continue; if(activeLogoResolved&&value===activeLogoResolved&&!isLogoKey(key))continue;
    const escaped=String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const next=src?bg.replace(/url\((?:["']?)(.*?)(?:["']?)\)/i,`url("${escaped}")`):(bg&&bg!=='none'?`${bg}, url("${escaped}")`:`url("${escaped}")`);
    el.style.setProperty('background-image',next,'important');
    if(rule.fit)el.style.setProperty('background-size',rule.fit==='fill'?'100% 100%':rule.fit,'important');
    if(rule.position)el.style.setProperty('background-position',rule.position,'important');
  }
}
function installGlobalImageObserver(){
  if(globalImageObserver||!document.body)return;
  let timer=0; globalImageObserver=new MutationObserver(muts=>{clearTimeout(timer);timer=setTimeout(()=>{for(const m of muts){m.addedNodes?.forEach(n=>{if(n.nodeType===1)applyGlobalImageReplacements(n)});} },80);});
  globalImageObserver.observe(document.body,{childList:true,subtree:true});
}

document.addEventListener('error',(event)=>{
  const img=event.target;
  if(img?.tagName!=='IMG'||img.dataset.kpImageRecovered==='1')return;
  img.dataset.kpImageRecovered='1';
  const failed=img.currentSrc||img.src||'';
  const original=img.dataset.cmsOriginalSrc||'';
  if(original && original!==failed && /^(?:https?:|data:|blob:)/i.test(original)){
    img.src=original;
    return;
  }
  img.removeAttribute('srcset');
  img.src=KP_EMPTY_IMAGE;
  img.classList.add('kp-image-missing');
},true);

function setConnected(ok){
  window.KleimpaulCMS.connected=ok;
  document.documentElement.dataset.firebase=ok?'online':'offline';
}
function money(v){
  if(v===null||v===undefined||v==='') return '';
  return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}
function normalizeWhatsapp(value){
  return String(value||'').replace(/\D/g,'');
}

let lastSiteSettings={};
function ensureRuntimeBackgroundLayers(){
  if(!document.body)return {global:null,hero:null};
  let global=document.getElementById('kp-runtime-site-background');
  if(!global){
    global=document.createElement('div');
    global.id='kp-runtime-site-background';
    global.setAttribute('aria-hidden','true');
    document.body.prepend(global);
  }
  const heroHost=document.getElementById('inicio');
  let hero=heroHost?.querySelector(':scope > .kp-runtime-hero-background')||null;
  if(heroHost&&!hero){
    hero=document.createElement('div');
    hero.className='kp-runtime-hero-background';
    hero.setAttribute('aria-hidden','true');
    heroHost.prepend(hero);
  }
  return {global,hero};
}
function clearRuntimeBackgroundLayers(){
  const layers=ensureRuntimeBackgroundLayers();
  for(const layer of [layers.global,layers.hero]){
    if(!layer)continue;
    layer.classList.remove('is-active');
    layer.style.removeProperty('background-image');
    layer.style.removeProperty('background-position');
    layer.style.removeProperty('background-size');
    layer.style.removeProperty('filter');
    layer.style.removeProperty('opacity');
  }
}
async function applySiteSurfaceSettings(s={}){
  lastSiteSettings=s||{};
  const root=document.documentElement,body=document.body;
  if(s.darkBg)root.style.setProperty('--cms-user-dark-bg',s.darkBg);
  if(s.lightBg)root.style.setProperty('--cms-user-light-bg',s.lightBg);
  if(s.faviconUrl){
    const href=await resolveMedia(s.faviconUrl);
    if(href){
      let links=[...document.querySelectorAll('link[rel~="icon"]')];
      if(!links.length){const link=document.createElement('link');link.rel='icon';document.head.appendChild(link);links=[link]}
      links.forEach(link=>link.href=href);
    }
  }
  if(!body)return;
  if(s.backgroundUrl){
    const url=await resolveMedia(s.backgroundUrl);
    if(url){
      const visibility=Math.max(0,Math.min(100,Number(s.backgroundOpacity??55)))/100;
      const dark=body.classList.contains('dark')||!body.classList.contains('light');
      const overlayStrength=Math.max(0,Math.min(100,Number(s.backgroundOverlay??42)))/100;
      const blur=Math.max(0,Math.min(18,Number(s.backgroundBlur??0)));
      const position=String(s.backgroundPosition||'center center');
      const size=['cover','contain','auto'].includes(String(s.backgroundSize||''))?String(s.backgroundSize):'cover';
      const base=dark?'5,8,12':'247,247,245';
      const shade=dark?Math.max(.08,Math.min(.94,.90-visibility*.62+overlayStrength*.28)):Math.max(.12,Math.min(.96,.94-visibility*.56+overlayStrength*.24));
      const heroLeft=dark?Math.max(.18,Math.min(.93,.90-visibility*.50+overlayStrength*.20)):Math.max(.24,Math.min(.96,.92-visibility*.46+overlayStrength*.20));
      const heroMid=dark?Math.max(.10,Math.min(.86,.72-visibility*.55+overlayStrength*.18)):Math.max(.16,Math.min(.9,.78-visibility*.50+overlayStrength*.18));
      const heroRight=dark?Math.max(.04,Math.min(.72,.50-visibility*.46+overlayStrength*.16)):Math.max(.10,Math.min(.78,.58-visibility*.42+overlayStrength*.16));
      const escaped=cssUrlValue(url);
      const photo=`url("${escaped}")`;
      const composite=`linear-gradient(rgba(${base},${Math.max(.12,shade)}),rgba(${base},${Math.max(.18,shade+.06)})),${photo}`;
      const layers=ensureRuntimeBackgroundLayers();
      if(layers.global){
        layers.global.style.setProperty('background-image',photo);
        layers.global.style.setProperty('background-position',position);
        layers.global.style.setProperty('background-size',size);
        layers.global.style.setProperty('filter',`blur(${blur}px)`);
        layers.global.style.setProperty('opacity',String(Math.max(.18,visibility)));
        layers.global.classList.add('is-active');
      }
      if(layers.hero){
        layers.hero.style.setProperty('background-image',photo);
        layers.hero.style.setProperty('background-position',position);
        layers.hero.style.setProperty('background-size',size);
        layers.hero.style.setProperty('filter',`blur(${Math.min(blur,8)}px)`);
        layers.hero.style.setProperty('opacity',String(Math.max(.28,visibility)));
        layers.hero.classList.add('is-active');
      }
      [root,body].forEach(node=>{
        node.style.setProperty('--cms-site-photo',photo);
        node.style.setProperty('--cms-site-position',position);
        node.style.setProperty('--cms-site-size',size);
        node.style.setProperty('--cms-site-visibility',String(visibility));
        node.style.setProperty('--cms-site-overlay',String(overlayStrength));
        node.style.setProperty('--cms-site-blur',`${blur}px`);
        node.style.setProperty('--cms-hero-shade-left',String(heroLeft));
        node.style.setProperty('--cms-hero-shade-mid',String(heroMid));
        node.style.setProperty('--cms-hero-shade-right',String(heroRight));
      });
      body.style.setProperty('--cms-applied-site-bg',composite);
      body.style.setProperty('background-image',composite,'important');
      body.style.setProperty('background-size',size,'important');
      body.style.setProperty('background-position',position,'important');
      body.style.setProperty('background-attachment',innerWidth>900?'fixed':'scroll','important');
      body.classList.add('cms-custom-site-bg');
    }else{
      ['--cms-site-photo','--cms-site-position','--cms-site-size','--cms-site-visibility','--cms-site-overlay','--cms-site-blur','--cms-hero-shade-left','--cms-hero-shade-mid','--cms-hero-shade-right'].forEach(k=>{root.style.removeProperty(k);body.style.removeProperty(k)});body.style.removeProperty('--cms-applied-site-bg');
      body.style.removeProperty('background-image');body.classList.remove('cms-custom-site-bg');clearRuntimeBackgroundLayers();
    }
  }else{
    ['--cms-site-photo','--cms-site-position','--cms-site-size','--cms-site-visibility','--cms-site-overlay','--cms-site-blur','--cms-hero-shade-left','--cms-hero-shade-mid','--cms-hero-shade-right'].forEach(k=>{root.style.removeProperty(k);body.style.removeProperty(k)});body.style.removeProperty('--cms-applied-site-bg');
    body.style.removeProperty('background-image');body.style.removeProperty('background-size');body.style.removeProperty('background-position');body.style.removeProperty('background-attachment');body.classList.remove('cms-custom-site-bg');clearRuntimeBackgroundLayers();
  }
}
window.addEventListener('kleimpaul:theme',()=>applySiteSurfaceSettings(lastSiteSettings));
async function applyGlobalSettings(s={}){
  const root=document.documentElement;
  await applySiteSurfaceSettings(s);
  if(s.accent) root.style.setProperty('--cms-accent',s.accent), root.style.setProperty('--orange',s.accent);
  if(s.accent2) root.style.setProperty('--cms-accent-2',s.accent2), root.style.setProperty('--orange-light',s.accent2);
  if(s.radius) root.style.setProperty('--cms-radius',`${Number(s.radius)}px`);
  if(s.siteTitle) document.title=s.siteTitle;
  window.KleimpaulCMS.storyAutoplayMs=Number(s.storyAutoplayMs||5000);
  const storySection=document.querySelector('#stories');
  if(storySection){storySection.style.display=s.storySectionEnabled===false?'none':'';const eyebrow=storySection.querySelector('.section-title span'),title=storySection.querySelector('.section-title h2'),subtitle=storySection.querySelector('.section-title p');if(eyebrow&&s.storyEyebrow)eyebrow.textContent=s.storyEyebrow;if(title&&s.storyTitle)title.textContent=s.storyTitle;if(subtitle&&s.storySubtitle)subtitle.textContent=s.storySubtitle;}
  if(s.companyName){
    document.querySelectorAll('.logo-text strong,.footer-wrapper h3').forEach(el=>{ if(el) el.textContent=s.companyName; });
  }
  if(s.logoUrl){ const logo=await resolveMedia(s.logoUrl); activeLogoResolved=logo||''; if(logo)document.querySelectorAll('.logo img,[data-brand-logo]').forEach(img=>{if(!img.dataset.cmsOriginalSrc)img.dataset.cmsOriginalSrc=img.getAttribute('src')||'';img.src=logo;}); } else activeLogoResolved='';
  globalImageRules=Array.isArray(s.imageReplacements)?s.imageReplacements:[];
  await applyGlobalImageReplacements(document); installGlobalImageObserver();
  if(s.whatsapp){
    const phone=normalizeWhatsapp(s.whatsapp);
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{
      try{const old=new URL(a.href); const text=old.searchParams.get('text'); a.href=`https://wa.me/${phone}${text?'?text='+encodeURIComponent(text):''}`;}catch{}
    });
    document.querySelectorAll('.cms-floating-contact').forEach(el=>el.remove());
  }
  if(s.instagram){ document.querySelectorAll('a[href*="instagram.com"]').forEach(a=>a.href=s.instagram); }
}
function safeSelector(sel){ try{return [...document.querySelectorAll(sel)]}catch{return []} }
const overrideStyleMap=new Map();
function cssUrlValue(v){return String(v||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\r\n]/g,'');}
function backgroundSizeValue(v){return v==='fill'?'100% 100%':v;}
function backgroundImageValue(o,value){const u=cssUrlValue(value);return o.backgroundTemplate&&o.backgroundTemplate.includes('__CMS_IMAGE__')?o.backgroundTemplate.replace('__CMS_IMAGE__',u):`url("${u}")`;}
function setOverrideRule(o,css){const id=`cms-override-${String(o.id||Math.random()).replace(/[^a-zA-Z0-9_-]/g,'')}`;let style=document.getElementById(id);if(!style){style=document.createElement('style');style.id=id;style.dataset.cmsOverride=o.id||'';document.head.appendChild(style)}style.textContent=css;overrideStyleMap.set(o.id,id);}
async function applyOverride(o){
  if(!o||o.enabled===false||!o.selector) return;
  const mode=o.mode||'text'; const pseudo=/::(?:before|after)$/.test(o.selector);
  if(pseudo){
    if(mode==='background'){
      const value=await resolveMedia(o.value??'');const extra=[o.fit?`background-size:${backgroundSizeValue(o.fit)} !important;`:'',o.position?`background-position:${o.position} !important;`:''].join('');
      setOverrideRule(o,`${o.selector}{background-image:${backgroundImageValue(o,value)} !important;${extra}}`);return;
    }
    if(mode==='style'&&o.attribute){setOverrideRule(o,`${o.selector}{${o.attribute}:${o.value??''} !important;}`);return;}
  }
  for(const el of safeSelector(o.selector)){
    if(mode==='text') el.textContent=o.value??'';
    else if(mode==='html') el.innerHTML=o.value??'';
    else if(mode==='src' && 'src' in el){if(!el.dataset.cmsOriginalSrc)el.dataset.cmsOriginalSrc=el.getAttribute('src')||el.src||'';const value=await resolveMedia(o.value??'');if(value)el.src=value;}
    else if(mode==='background'){const value=await resolveMedia(o.value??'');if(value)el.style.setProperty('background-image',backgroundImageValue(o,value),'important');}
    else if(mode==='href' && 'href' in el){const href=String(o.value??'').trim();if(/^(?:https?:\/\/|mailto:|tel:|#|\.\.?\/|[A-Za-z0-9_-]+\.html(?:[?#].*)?)/i.test(href))el.href=href;}
    else if(mode==='placeholder' && 'placeholder' in el) el.placeholder=o.value??'';
    else if(mode==='attribute' && o.attribute) el.setAttribute(o.attribute,o.value??'');
    else if(mode==='style' && o.attribute) el.style.setProperty(o.attribute,o.value??'');
    else if(mode==='class') el.classList.toggle(String(o.value||o.attribute),o.active!==false);
    if(o.alt && el.tagName==='IMG') el.alt=o.alt;
    if(o.fit){if(el.tagName==='IMG')el.style.setProperty('object-fit',o.fit,'important');else el.style.setProperty('background-size',backgroundSizeValue(o.fit),'important');}
    if(o.aspectRatio&&el.tagName==='IMG')el.style.setProperty('aspect-ratio',o.aspectRatio,'important');
    if(o.position){if(el.tagName==='IMG')el.style.setProperty('object-position',o.position,'important');else el.style.setProperty('background-position',o.position,'important');}
    if(o.title) el.setAttribute('title',o.title);
  }
}
function listenSettings(){
  onSnapshot(doc(db,...company('site_settings','config')),async(snap)=>{setConnected(true); try{if(snap.exists())await applyGlobalSettings(snap.data())}finally{markInitialReady('settings')}},()=>{setConnected(false);markInitialReady('settings')});
}
async function applyCachedOverrides(){ await Promise.all(cachedOverrides.map(applyOverride)); }
function listenOverrides(){
  const q=query(collection(db,...company('site_overrides')),where('page','in',[PAGE,'*']));
  onSnapshot(q,async(snap)=>{
    setConnected(true);
    const next=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.enabled!==false).sort((a,b)=>(a.priority||0)-(b.priority||0));
    const nextIds=new Set(next.map(x=>x.id));document.querySelectorAll('style[data-cms-override]').forEach(s=>{if(!nextIds.has(s.dataset.cmsOverride))s.remove()});cachedOverrides=next;
    await applyCachedOverrides();markInitialReady('overrides');
  },()=>{setConnected(false);markInitialReady('overrides')});
}
function ensureHighlightsContainer(){
  let section=document.querySelector('[data-firestore-highlights]');
  if(section) return section;
  if(PAGE!=='index') return null;
  section=document.createElement('section');section.className='cms-highlights';section.dataset.firestoreHighlights='';
  section.innerHTML='<div class="container"><div class="section-title"><span>EM DESTAQUE</span><h2>Ofertas e novidades</h2><p>Seleções, novidades e oportunidades para você.</p></div><div class="cms-highlights-grid" data-cms-highlight-grid></div></div>';
  const anchor=document.querySelector('#produtos');
  if(anchor) anchor.parentNode.insertBefore(section,anchor); else document.body.appendChild(section);
  return section;
}
async function resolveHighlightRows(rows){return await Promise.all(rows.map(async x=>({...x,image:x.image?await resolveMedia(x.image):'',storyImage1:x.storyImage1?await resolveMedia(x.storyImage1):'',storyImage2:x.storyImage2?await resolveMedia(x.storyImage2):'',storyImage3:x.storyImage3?await resolveMedia(x.storyImage3):''})));}
function renderNativeStories(rows){
  const section=document.querySelector('#stories'),wrap=section?.querySelector('.stories-wrapper');
  if(!section||!wrap||!rows.length)return false;
  wrap.innerHTML=rows.map((x,i)=>{const cover=x.image||x.storyImage1||KP_EMPTY_IMAGE;return `<button class="story-btn" data-story="${i}" data-highlight-id="${escapeHTML(x.id)}" aria-label="Ver destaque ${escapeHTML(x.title||'Destaque')}"><div class="story-ring"><img src="${escapeHTML(cover)}" alt="${escapeHTML(x.title||'Destaque')}" loading="lazy" decoding="async"></div><div class="story-name">${escapeHTML(x.title||'Destaque')}</div>${x.badge?`<span class="story-badge">${escapeHTML(x.badge)}</span>`:''}</button>`}).join('');
  section.dataset.cmsManaged='1';
  window.dispatchEvent(new CustomEvent('kleimpaul:stories',{detail:{rows}}));
  return true;
}
function listenHighlights(){
  if(PAGE!=='index') return;
  onSnapshot(collection(db,...company('highlights')),async(snap)=>{
    let rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(PAGE!=='retentores') rows=rows.filter(x=>x.active!==false);
    rows.sort((a,b)=>(a.order||0)-(b.order||0));
    rows=await resolveHighlightRows(rows);
    if(renderNativeStories(rows)){document.querySelector('[data-firestore-highlights]')?.remove();setTimeout(()=>{applyCachedOverrides();applyGlobalImageReplacements(document)},0);return;}
    if(!rows.length)return; // mantém os destaques originais como fallback quando o banco está vazio
    const section=ensureHighlightsContainer(); if(!section)return;
    const grid=section.querySelector('[data-cms-highlight-grid]');
    grid.innerHTML=rows.map(x=>`<a class="cms-highlight" data-highlight-id="${escapeHTML(x.id)}" href="${escapeHTML(x.link||'#')}" ${/^https?:/i.test(x.link||'')?'target="_blank" rel="noopener"':''}>${x.image?`<img src="${escapeHTML(x.image)}" alt="${escapeHTML(x.title||'Destaque')}" loading="lazy" decoding="async">`:''}<div class="cms-highlight-content">${x.badge?`<span class="cms-highlight-badge">${escapeHTML(x.badge)}</span>`:''}<h3>${escapeHTML(x.title||'Destaque')}</h3>${x.subtitle?`<p>${escapeHTML(x.subtitle)}</p>`:''}</div></a>`).join('');
    setTimeout(()=>{applyCachedOverrides();applyGlobalImageReplacements(document)},0);
  });
}
function ensureCatalogSection(){
  let section=document.querySelector('[data-firestore-catalog]');
  if(section)return section;
  section=document.createElement('section');section.className='cms-catalog';section.dataset.firestoreCatalog='';
  section.innerHTML=`<div class="container"><div class="cms-catalog-header"><div><h2>Catálogo atualizado</h2><p>Confira opções, especificações e detalhes da categoria.</p></div></div><div class="cms-catalog-grid" data-cms-catalog-grid></div></div>`;
  const hero=document.querySelector('.hero-product,.hero');
  const assist=document.querySelector('.cms-category-assist');
  if(assist && assist.parentNode) assist.insertAdjacentElement('afterend',section);
  else if(hero && hero.parentNode) hero.insertAdjacentElement('afterend',section);
  else document.body.appendChild(section);
  return section;
}
function specArray(x){
  if(Array.isArray(x.specs)) return x.specs;
  if(Array.isArray(x.info)) return x.info.map(i=>({label:i.label,value:i.value}));
  return [];
}
function renderCatalogRows(rows){
  if(PAGE==='retentores'){
    window.dispatchEvent(new CustomEvent('kleimpaul:catalog',{detail:{category:PAGE,rows}}));
    setTimeout(()=>{applyCachedOverrides();applyGlobalImageReplacements(document)},0);
    return;
  }
  if(PAGE==='motosserras' && typeof window.kleimpaulSetMotosserras==='function'){
    window.kleimpaulSetMotosserras(rows.map((x,i)=>({id:x.slug||x.id||i+1,name:x.name||x.title||'Produto',price:Number(x.price||0),power:Number(x.power||0),image:x.image||KP_EMPTY_IMAGE,info:specArray(x)})));
    window.dispatchEvent(new CustomEvent('kleimpaul:catalog',{detail:{category:PAGE,rows}}));
    setTimeout(()=>{applyCachedOverrides();applyGlobalImageReplacements(document)},0);
    return;
  }
  const section=ensureCatalogSection(); const grid=section.querySelector('[data-cms-catalog-grid]');
  if(!rows.length){section.style.display='none';window.dispatchEvent(new CustomEvent('kleimpaul:catalog',{detail:{category:PAGE,rows:[]}}));return} section.style.display='';
  grid.innerHTML=rows.map(x=>{
    const specs=specArray(x);
    const imageSrc=x.image||KP_EMPTY_IMAGE;
    return `<article class="cms-catalog-card" data-catalog-id="${escapeHTML(x.id)}"><div class="cms-catalog-media ${x.image?'':'is-empty'}"><img src="${escapeHTML(imageSrc)}" data-cms-image-slot="catalog:${escapeHTML(x.id)}" alt="${escapeHTML(x.name||'Produto')}" loading="lazy" decoding="async">${x.image?'':'<span class="cms-catalog-empty-media"><i class="fa-solid fa-image"></i><b>Imagem disponível no painel</b></span>'}</div><div class="cms-catalog-body">${x.badge?`<span class="cms-catalog-tag">${escapeHTML(x.badge)}</span>`:''}<h3>${escapeHTML(x.name||'Produto')}</h3>${x.description?`<p>${escapeHTML(x.description)}</p>`:''}${x.price?`<strong class="cms-price">${money(x.price)}</strong>`:''}${specs.length?`<div class="cms-specs">${specs.map(s=>`<span>${escapeHTML(s.label)}: ${escapeHTML(s.value)}</span>`).join('')}</div>`:''}</div></article>`;
  }).join('');
  window.dispatchEvent(new CustomEvent('kleimpaul:catalog',{detail:{category:PAGE,rows}}));
  setTimeout(applyCachedOverrides,0);
}
function listenCatalog(){
  if(PAGE==='index'||PAGE==='retentores') return;
  const q=query(collection(db,...company('catalog_items')),where('category','==',PAGE));
  onSnapshot(q,async(snap)=>{
    let rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false).sort((a,b)=>(a.order||0)-(b.order||0));
    rows=await resolveRowsImages(rows);
    renderCatalogRows(rows);
  });
}
async function getSearchCatalog(){
  if(!searchCatalogPromise){
    searchCatalogPromise=getDocs(collection(db,...company('catalog_items'))).then(async snap=>{
      let rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false&&x.category!=='retentores');
      rows=await resolveRowsImages(rows);
      return rows;
    }).catch(()=>[]);
  }
  return searchCatalogPromise;
}
window.KleimpaulCMS.getSearchCatalog=getSearchCatalog;

function setupProfessionalTheme(){
  const body=document.body;if(!body)return;
  const current=localStorage.getItem('theme');
  const theme=current==='light'||current==='dark'?current:(body.classList.contains('light')?'light':'dark');
  body.classList.remove('light','dark');body.classList.add(theme);
  const setTheme=t=>{body.classList.remove('light','dark');body.classList.add(t);localStorage.setItem('theme',t);const btn=document.getElementById('cmsThemeSwitch');if(btn){btn.innerHTML=`<i class="fa-solid ${t==='dark'?'fa-sun':'fa-moon'}"></i>`;btn.title=t==='dark'?'Ativar modo claro':'Ativar modo escuro';btn.setAttribute('aria-label',btn.title)}const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=t==='dark'?'#070b11':'#f5f7fa';window.dispatchEvent(new CustomEvent('kleimpaul:theme',{detail:{theme:t}}));};
  const existing=document.getElementById('themeToggle');
  if(existing){existing.title='Alternar tema';existing.addEventListener('click',()=>setTimeout(()=>setTheme(body.classList.contains('light')?'light':'dark'),0));return;}
  const nav=document.querySelector('header .nav,header .navbar');if(!nav)return;
  const btn=document.createElement('button');btn.type='button';btn.id='cmsThemeSwitch';btn.className='cms-theme-switch';nav.insertBefore(btn,nav.querySelector('.back')||nav.lastElementChild);btn.onclick=()=>setTheme(body.classList.contains('dark')?'light':'dark');setTheme(theme);
}

window.addEventListener('kleimpaul:ui-ready',applyCachedOverrides);
setupProfessionalTheme();listenSettings();listenOverrides();listenHighlights();listenCatalog();
