(()=>{
const $=id=>document.getElementById(id);
const SABO='https://catalogo.sabo.com.br/';
const ARCA='https://www.arcaretentores.com.br/busca-de-produtos';
const PDF='https://www.rolcamp.com.br/catalogos/retentores/arca/catalogo-arca-retentores.pdf';
const views={
  sabo:{page:194,label:'SABÓ × ARCA',title:'Equivalência de códigos'},
  medidas:{page:227,label:'MEDIDAS',title:'Tabela de medidas'}
};
let toastTimer;
function toast(msg){const el=$('retToast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}
function clean(v){return String(v||'').trim()}
function searchText(){const sabo=clean($('retSaboQuery')?.value);const arca=clean($('retArcaQuery')?.value);const e=clean($('retEixoQuery')?.value);const a=clean($('retAlojQuery')?.value);const h=clean($('retAlturaQuery')?.value);return [sabo&&`Sabó ${sabo}`,arca&&`ARCA/ref. ${arca}`,e&&`eixo ${e}`,a&&`alojamento ${a}`,h&&`altura ${h}`].filter(Boolean).join(' | ')}
async function copyQuery(){const q=searchText();if(!q)return false;try{await navigator.clipboard.writeText(q);toast('Pesquisa copiada');return true}catch(_){return false}}
async function openCatalog(url){await copyQuery();window.open(url,'_blank','noopener,noreferrer')}
$('retSearchSabo')?.addEventListener('click',()=>openCatalog(SABO));
$('retSearchArca')?.addEventListener('click',()=>openCatalog(ARCA));
function pdfNum(v){const raw=clean(v).replace(',','.');if(!raw)return '';const n=Number(raw);return Number.isFinite(n)?n.toFixed(2).replace('.',','):clean(v)}
function openView(key){const v=views[key]||views.sabo;const code=clean($('retSaboQuery')?.value)||clean($('retArcaQuery')?.value);const dims=[pdfNum($('retEixoQuery')?.value),pdfNum($('retAlojQuery')?.value),pdfNum($('retAlturaQuery')?.value)].filter(Boolean);const term=key==='medidas'&&dims.length===3?dims.join(' X '):code;const frag=`#page=${v.page}&zoom=page-width${term?`&search=${encodeURIComponent(term)}`:''}`;if($('retPdfFrame'))$('retPdfFrame').src=PDF+frag;if($('retOpenExternal'))$('retOpenExternal').href=PDF+frag;if($('retViewerEyebrow'))$('retViewerEyebrow').textContent=v.label;if($('retViewerTitle'))$('retViewerTitle').textContent=v.title;const modal=$('retViewerModal');if(modal){modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}}
function closeView(){const modal=$('retViewerModal');if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow=''}
document.querySelectorAll('[data-ret-view]').forEach(el=>el.addEventListener('click',()=>openView(el.dataset.retView)));
document.querySelectorAll('[data-ret-close]').forEach(el=>el.addEventListener('click',closeView));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeView();if(e.key==='Enter'&&document.activeElement?.closest?.('.ret-search-card'))openView('sabo')});
})();
