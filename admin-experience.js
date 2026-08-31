/* Kleimpaul Admin — APEX Experience. Somente UX; não altera regras de negócio. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const go=id=>document.querySelector(`[data-go="${id}"]`)?.click();

  function dashboardCommandCenter(){
    const dash=$('[data-section="dashboard"]'), quick=$('.admin-quick-actions',dash||document);
    if(!dash||$('.ax-command-strip',dash))return;
    const strip=document.createElement('div');
    strip.className='ax-command-strip';
    strip.innerHTML=`
      <div class="ax-command-panel">
        <div><strong>Central de operação</strong><small>Atalhos rápidos: Alt+1 Dashboard · Alt+2 Oficina · Alt+3 Clientes · Alt+4 Estoque · Alt+5 Vendas</small></div>
        <div class="ax-live-clock"><b id="axClock">--:--</b><span id="axDate">carregando...</span></div>
      </div>
      <div class="ax-command-panel">
        <div><strong>Ambiente</strong><small>Visão rápida da operação</small></div>
        <div class="ax-health-dots"><span class="ax-health-dot"><i class="fa-solid fa-circle"></i> sessão ativa</span><span class="ax-health-dot"><i class="fa-solid fa-circle"></i> dados online</span><span class="ax-health-dot"><i class="fa-solid fa-circle"></i> backup disponível</span></div>
      </div>`;
    (quick||$('.grid',dash))?.insertAdjacentElement('afterend',strip);
    const tick=()=>{const d=new Date(),clock=$('#axClock'),date=$('#axDate');if(clock)clock.textContent=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});if(date)date.textContent=d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});};
    tick();setInterval(tick,30000);
  }

  function shortcutFeedback(text){
    let el=$('.ax-shortcut-toast');if(!el){el=document.createElement('div');el.className='ax-shortcut-toast';document.body.appendChild(el)}
    el.innerHTML=text;el.classList.add('show');clearTimeout(shortcutFeedback.t);shortcutFeedback.t=setTimeout(()=>el.classList.remove('show'),1400);
  }

  function keyboardNavigation(){
    document.addEventListener('keydown',e=>{
      if(e.altKey&&!e.ctrlKey&&!e.metaKey){
        const map={Digit1:'dashboard',Numpad1:'dashboard',Digit2:'orders',Numpad2:'orders',Digit3:'clients',Numpad3:'clients',Digit4:'inventory',Numpad4:'inventory',Digit5:'sales',Numpad5:'sales'};
        const id=map[e.code];if(id){e.preventDefault();go(id);shortcutFeedback(`<b>Atalho</b> · ${id==='orders'?'Oficina':id==='clients'?'Clientes':id==='inventory'?'Estoque':id==='sales'?'Vendas':'Dashboard'}`)}
      }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
        const active=document.querySelector('.section.active')?.dataset.section||'';
        const saveBySection={orders:'woSave',clients:'customerSave',sales:'saleSave',settings:'settingsSave',editor:'ovSave',highlights:'hiSave',catalog:'catSave',inventory:'invSave'};
        const id=saveBySection[active],btn=id?document.getElementById(id):null;
        if(btn){e.preventDefault();btn.click();shortcutFeedback('<b>Ctrl+S</b> · salvando tela atual');}
      }
      if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')){e.preventDefault();window.KleimpaulAdminSearch?.();}
    });
  }

  function enhanceSections(){
    $$('.section').forEach(section=>{
      const h=section.querySelector('.section-head:not(.compact) h2');
      if(h&&!h.dataset.axEnhanced){h.dataset.axEnhanced='1';h.setAttribute('data-title',h.textContent.trim())}
    });
  }



  function enhanceGlobalSearch(){
    const input=$('.admin-global-search input'),drop=$('.admin-search-drop');if(!input||!drop||input.dataset.axSearch)return;input.dataset.axSearch='1';
    const targets=[
      ['clients','customerSearch','Clientes','fa-users'],
      ['orders','woSearch','Oficina / O.S.','fa-screwdriver-wrench'],
      ['sales','saleSearch','Vendas & Notas','fa-receipt'],
      ['inventory','invSearch','Estoque','fa-boxes-stacked'],
      ['media','mediaSearch','Mídia','fa-images']
    ];
    const append=()=>{const q=input.value.trim();drop.querySelectorAll('[data-ax-deep-search]').forEach(x=>x.remove());if(!q)return;const frag=document.createDocumentFragment();targets.forEach(([section,field,label,icon])=>{const b=document.createElement('button');b.type='button';b.dataset.axDeepSearch=section;b.innerHTML=`<i class="fa-solid ${icon}"></i><span><strong>Buscar “${q.replace(/[<>]/g,'')}” em ${label}</strong><small>Abrir ${label} com este filtro</small></span><i class="fa-solid fa-arrow-right"></i>`;b.onclick=()=>{go(section);setTimeout(()=>{const el=document.getElementById(field);if(el){el.value=q;el.dispatchEvent(new Event('input',{bubbles:true}));el.focus()}},180);drop.classList.remove('show')};frag.appendChild(b)});drop.appendChild(frag)};
    input.addEventListener('input',()=>setTimeout(append,0));input.addEventListener('focus',()=>setTimeout(append,0));
  }

  function contextAction(){
    const actions=$('.top-actions');if(!actions||$('#axContextAction'))return;
    const b=document.createElement('button');b.id='axContextAction';b.type='button';b.className='btn sm ax-context-action';b.innerHTML='<i class="fa-solid fa-plus"></i><span>Novo</span>';
    const print=$('#adminPrintSection');actions.insertBefore(b,print||actions.firstChild);
    const map={orders:['Novo atendimento','woNew'],clients:['Novo cliente','customerClear'],sales:['Nova venda','saleNew'],inventory:['Novo item','invClear'],catalog:['Novo produto','catClear'],highlights:['Novo destaque','hiClear']};
    const refresh=()=>{const active=$('.section.active')?.dataset.section||'dashboard',cfg=map[active];b.hidden=!cfg;if(cfg){$('span',b).textContent=cfg[0];b.dataset.target=cfg[1]||'';}};
    b.onclick=()=>{const t=document.getElementById(b.dataset.target||'');t?.click();if(t)shortcutFeedback(`<b>Novo</b> · ${$('span',b)?.textContent||'registro'}`)};
    document.addEventListener('click',e=>{if(e.target.closest?.('#nav button[data-go]'))setTimeout(refresh,20)});refresh();
    document.addEventListener('keydown',e=>{if(e.altKey&&e.key.toLowerCase()==='n'){const active=$('.section.active')?.dataset.section,cfg=map[active];if(cfg){e.preventDefault();document.getElementById(cfg[1])?.click();shortcutFeedback(`<b>Alt+N</b> · ${cfg[0]}`)}}});
  }

  function orderDraftFeedback(){
    const section=$('[data-section="orders"]'),state=$('#woEditState');if(!section||!state||section.dataset.axDraft)return;section.dataset.axDraft='1';
    let t=0;section.addEventListener('input',e=>{if(!e.target.closest('input,textarea,select'))return;clearTimeout(t);if(!$('#woId')?.value)state.textContent='EDITANDO…';t=setTimeout(()=>{if(!$('#woId')?.value)state.textContent='RASCUNHO LOCAL';},850)});
  }

  function preserveWorkspaceFocus(){
    document.addEventListener('click',e=>{
      const nav=e.target.closest?.('#nav button[data-go]');if(!nav)return;
      try{localStorage.setItem('kleimpaul_last_section',nav.dataset.go||'dashboard')}catch{}
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }

  function smartTables(){
    // Títulos e navegação de teclado sem tocar nos dados.
    $$('.table-wrap').forEach(w=>{if(w.dataset.axTable)return;w.dataset.axTable='1';w.setAttribute('tabindex','0')});
  }


  function workspaceTools(){
    const actions=$('.top-actions');if(!actions||$('.kp-workspace-tools'))return;
    const wrap=document.createElement('div');wrap.className='kp-workspace-tools';
    wrap.innerHTML=`<button class="kp-workspace-btn" data-kp-tool="density" title="Alternar densidade (Alt+D)" type="button"><i class="fa-solid fa-table-cells"></i></button><button class="kp-workspace-btn" data-kp-tool="export" title="Exportar tabela da tela (Alt+E)" type="button"><i class="fa-solid fa-file-csv"></i></button><button class="kp-workspace-btn" data-kp-tool="focus" title="Modo foco (Alt+F)" type="button"><i class="fa-solid fa-expand"></i></button><button class="kp-workspace-btn" data-kp-tool="fullscreen" title="Tela cheia" type="button"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>`;
    const user=$('.admin-user-chip',actions);actions.insertBefore(wrap,user||actions.firstChild);
    try{if(localStorage.getItem('kp_admin_density')==='compact')document.body.classList.add('kp-density-compact')}catch{}
    const toggleDensity=()=>{const on=document.body.classList.toggle('kp-density-compact');try{localStorage.setItem('kp_admin_density',on?'compact':'comfortable')}catch{}shortcutFeedback(`<b>Visual</b> · ${on?'compacto':'confortável'}`)};
    const toggleFocus=()=>{const on=document.body.classList.toggle('kp-focus-mode');shortcutFeedback(`<b>Modo foco</b> · ${on?'ativado':'desativado'}`)};
    const exportTable=()=>{const section=$('.section.active'),table=section?.querySelector('table');if(!table){shortcutFeedback('<b>Exportar</b> · esta tela não possui tabela');return}const rows=[...table.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(td=>'"'+String(td.innerText||'').replace(/\s+/g,' ').trim().replace(/"/g,'""')+'"').join(';')).join('\n');const blob=new Blob(['\ufeff'+rows],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kleimpaul-${section.dataset.section||'dados'}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);shortcutFeedback('<b>Exportar</b> · CSV gerado');};
    wrap.querySelector('[data-kp-tool="density"]').onclick=toggleDensity;
    wrap.querySelector('[data-kp-tool="export"]').onclick=exportTable;
    wrap.querySelector('[data-kp-tool="focus"]').onclick=toggleFocus;
    wrap.querySelector('[data-kp-tool="fullscreen"]').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{shortcutFeedback('<b>Tela cheia</b> · indisponível neste navegador')}};
    document.addEventListener('keydown',e=>{if(e.altKey&&e.key.toLowerCase()==='d'){e.preventDefault();toggleDensity()}if(e.altKey&&e.key.toLowerCase()==='e'){e.preventDefault();exportTable()}if(e.altKey&&e.key.toLowerCase()==='f'){e.preventDefault();toggleFocus()}});
  }

  function settingsStudio(){
    const top=$('#settingsSaveTop'),save=$('#settingsSave');if(top&&save&&!top.dataset.bound){top.dataset.bound='1';top.onclick=()=>save.click();}
    const bg=$('#setBackground'),preview=$('#setBackgroundPreview');
    const syncPreview=()=>{if(!preview||!bg)return;const raw=bg.value.trim();let src='';if(/^media:/i.test(raw)){const option=$('#setBackgroundLibrary')?.querySelector(`option[value="${CSS.escape(raw)}"]`);src=option?.dataset?.src||''}else if(/^(?:https?:|data:image|blob:)/i.test(raw))src=raw;if(src)preview.src=src;};
    bg?.addEventListener('change',syncPreview);
  }

  function adaptiveTopbar(){
    const update=()=>document.documentElement.style.setProperty('--kp-vh',`${window.innerHeight*.01}px`);
    update();window.addEventListener('resize',update,{passive:true});
  }

  function init(){dashboardCommandCenter();keyboardNavigation();enhanceSections();enhanceGlobalSearch();contextAction();orderDraftFeedback();preserveWorkspaceFocus();smartTables();workspaceTools();settingsStudio();adaptiveTopbar();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,80),{once:true});else setTimeout(init,80);
  new MutationObserver(()=>{dashboardCommandCenter();enhanceSections();smartTables()}).observe(document.documentElement,{childList:true,subtree:true});
})();
