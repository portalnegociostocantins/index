/* ============================================================
   app.js — lógica do Portal Negócios Tocantins
   Dados: municipios.js, config.js (categorias), empresas.js (empresas)
   ============================================================ */
(function () {
    'use strict';

    const $ = (s, r) => (r || document).querySelector(s);
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);

    /* ---------- Dados ---------- */
    // ?preview=1 mostra o rascunho do painel admin (empresas ainda não publicadas)
    let LISTA = EMPRESAS, PREVIEW = false;
    if (new URLSearchParams(location.search).get('preview') === '1') {
        try {
            const d = JSON.parse(localStorage.getItem('portal_empresas_rascunho'));
            if (d && d.basedOn === EMPRESAS_VERSION && Array.isArray(d.empresas)) { LISTA = d.empresas; PREVIEW = true; }
        } catch (e) { /* sem rascunho */ }
    }
    const CAT = {};
    CATEGORIAS.forEach(c => { CAT[c.id] = c; });
    const MUNI_OK = new Set(MUNICIPIOS_TO.map(norm));
    const EMP = LISTA.filter(e => e.ativo !== false).map(e => {
        const cat = CAT[e.categoria] || { nome: '', icone: 'fa-shop' };
        if (!MUNI_OK.has(norm(e.municipio))) console.warn('Município não reconhecido em empresas.js:', e.municipio, '(empresa:', e.nome + ')');
        return Object.assign({}, e, { _hay: norm([e.nome, e.descricao, e.sub, cat.nome, e.municipio, e.bairro].join(' ')) });
    });

    const state = { q: '', local: '', cat: '', sub: '' };

    /* ---------- Filtro ---------- */
    // ignoreLocal=true: usado para descobrir quais municípios têm empresas para a busca atual
    function filtrar(ignoreLocal) {
        const tokens = norm(state.q).split(/\s+/).filter(Boolean);
        return EMP.filter(e =>
            (!state.cat || e.categoria === state.cat) &&
            (!state.sub || norm(e.sub) === norm(state.sub)) &&
            (ignoreLocal || !state.local || norm(e.municipio) === norm(state.local)) &&
            tokens.every(t => e._hay.indexOf(t) > -1)
        );
    }

    // Municípios que TÊM empresas cadastradas (respeitando categoria/palavra já escolhidas)
    function municipiosComEmpresas() {
        const map = new Map();
        filtrar(true).forEach(e => {
            const k = MUNICIPIOS_TO.find(m => norm(m) === norm(e.municipio)) || e.municipio;
            map.set(k, (map.get(k) || 0) + 1);
        });
        return Array.from(map, ([nome, qtd]) => ({ nome, qtd })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }

    function municipiosGlobais() {
        const saved = Object.assign({}, state);
        state.q = state.cat = state.sub = state.local = '';
        const r = municipiosComEmpresas();
        Object.assign(state, saved);
        return r;
    }

    /* ---------- URL (links compartilháveis) ---------- */
    function readURL() {
        const p = new URLSearchParams(location.search);
        state.q = p.get('q') || '';
        state.local = p.get('local') || '';
        state.cat = CAT[p.get('cat')] ? p.get('cat') : '';
        state.sub = p.get('sub') || '';
    }
    function writeURL() {
        const p = new URLSearchParams();
        ['q', 'local', 'cat', 'sub'].forEach(k => { if (state[k]) p.set(k, state[k]); });
        const qs = p.toString();
        try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* ignora */ }
    }

    /* ---------- Render: categorias, cidades, cartões ---------- */
    function renderStatic() {
        $('#hero-title').textContent = CONFIG.titulo;
        $('#hero-sub').textContent = CONFIG.subtitulo;
        $('#year').textContent = new Date().getFullYear();
        if (CONFIG.modoDemo) $('#demo-bar').hidden = false;
        if (PREVIEW) { const b = $('#demo-bar'); b.innerHTML = '<i class="fas fa-eye"></i> Prévia do painel: você está vendo alterações ainda não publicadas.'; b.hidden = false; }

        // mosaico do fundo do topo
        const icons = CATEGORIAS.map(c => c.icone);
        $('#hero-mosaic').innerHTML = Array.from({ length: 32 }, (_, i) => {
            const hue = [150, 160, 170, 140, 45][i % 5];
            return `<div class="mosaic-tile" style="background:hsl(${hue} ${30 + (i * 7) % 25}% ${14 + (i * 5) % 12}%)"><i class="fas ${icons[(i * 5) % icons.length]}"></i></div>`;
        }).join('');

        $('#hero-cats').innerHTML = CATEGORIAS.filter(c => c.destaque).map(c =>
            `<button type="button" class="cat-tile" data-cat="${c.id}"><i class="fas ${c.icone}"></i><span>${esc(c.nome)}</span></button>`).join('');

        $('#dd-menu').innerHTML = CATEGORIAS.map(c =>
            `<button type="button" data-cat="${c.id}"><i class="fas ${c.icone}"></i>${esc(c.nome)}</button>`).join('');

        $('#interest-grid').innerHTML = CATEGORIAS.map(c => `
            <div class="interest">
                <button type="button" class="interest-head" data-cat="${c.id}">
                    <span class="ico"><i class="fas ${c.icone}"></i></span>
                    <span><strong>${esc(c.nome)}</strong><small>${plural(EMP.filter(e => e.categoria === c.id).length, 'empresa', 'empresas')}</small></span>
                </button>
                <div class="sub-chips">${c.sub.map(s => `<button type="button" class="sub-chip" data-cat="${c.id}" data-sub="${esc(s)}">${esc(s)}</button>`).join('')}</div>
            </div>`).join('');

        // botões do topo / cadastro
        if (CONFIG.linkEntrar) { const b = $('#btn-entrar'); b.href = CONFIG.linkEntrar; b.hidden = false; }
        if (!CONFIG.linkCadastrar) $('#btn-cadastrar').hidden = true; else $('#btn-cadastrar').href = CONFIG.linkCadastrar;

        const wa = String(CONFIG.whatsappPortal || '').replace(/\D/g, '');
        const waUrl = wa ? 'https://wa.me/' + (wa.length <= 11 ? '55' + wa : wa) + '?text=' + encodeURIComponent('Olá! Quero cadastrar minha empresa no Portal Negócios Tocantins.') : '';
        const mail = CONFIG.emailPortal ? 'mailto:' + CONFIG.emailPortal + '?subject=' + encodeURIComponent('Cadastro de empresa - Portal Negócios Tocantins') : '';
        $('#cta-btns').innerHTML =
            (waUrl ? `<a class="btn btn-green" href="${esc(waUrl)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Cadastrar pelo WhatsApp</a>` : '') +
            (mail ? `<a class="btn ${waUrl ? 'btn-outline' : 'btn-green'}" href="${esc(mail)}"><i class="fas fa-envelope"></i> Cadastrar por e-mail</a>` : '');
        $('#footer-contact').innerHTML =
            (CONFIG.emailPortal ? `<span><i class="fas fa-envelope"></i><a href="mailto:${esc(CONFIG.emailPortal)}">${esc(CONFIG.emailPortal)}</a></span>` : '') +
            (wa ? `<span><i class="fab fa-whatsapp"></i><a href="${esc(waUrl)}" target="_blank" rel="noopener">WhatsApp</a></span>` : '');
    }

    function renderStats() {
        const m = municipiosGlobais();
        $('#search-count').textContent = EMP.length
            ? `${plural(EMP.length, 'empresa cadastrada', 'empresas cadastradas')} em ${plural(m.length, 'município', 'municípios')} do Tocantins`
            : 'Em breve: empresas de todo o Tocantins.';
        $('#city-chips').innerHTML = m.length
            ? m.map(x => `<button type="button" class="city-chip" data-local="${esc(x.nome)}"><i class="fas fa-location-dot"></i>${esc(x.nome)} <b>${x.qtd}</b></button>`).join('')
            : '<p class="panel-empty">Nenhum município com empresas cadastradas ainda.</p>';
    }

    function cardHtml(e) {
        const cat = CAT[e.categoria] || { nome: '', icone: 'fa-shop' };
        const wa = String(e.whatsapp || '').replace(/\D/g, '');
        const tel = String(e.telefone || '').replace(/\D/g, '');
        const acts = [
            wa ? `<a class="wa" href="https://wa.me/${wa.length <= 11 ? '55' + wa : wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : '',
            tel ? `<a href="tel:+${tel.length <= 11 ? '55' + tel : tel}"><i class="fas fa-phone"></i> Ligar</a>` : '',
            e.instagram ? `<a href="${esc(e.instagram)}" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Instagram</a>` : '',
            e.site ? `<a href="${esc(e.site)}" target="_blank" rel="noopener"><i class="fas fa-globe"></i> Site</a>` : ''
        ].join('');
        const pagina = e.pagina ? `<a class="page" href="${esc(e.pagina)}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> Ver página</a>` : '';
        return `<article class="biz">
            ${CONFIG.modoDemo ? '<span class="biz-demo">EXEMPLO</span>' : ''}${e.destaque ? '<i class="fas fa-star biz-star" title="Em destaque"></i>' : ''}
            <div class="biz-top"><div class="biz-avatar">${e.logo ? `<img src="${esc(e.logo)}" alt="">` : `<i class="fas ${cat.icone}"></i>`}</div>
                <div><h3>${esc(e.nome)}</h3><span class="biz-cat">${esc(e.sub || cat.nome)}</span></div></div>
            <div class="biz-loc"><i class="fas fa-location-dot"></i>${esc(e.municipio)}${e.bairro ? ' · ' + esc(e.bairro) : ''}</div>
            ${e.descricao ? `<p>${esc(e.descricao)}</p>` : ''}
            ${(pagina || acts) ? `<div class="biz-actions">${pagina}${acts}</div>` : ''}
        </article>`;
    }

    function renderFeatured() {
        const f = EMP.filter(e => e.destaque).slice(0, 6);
        $('#featured-grid').innerHTML = f.map(cardHtml).join('');
        $('#destaques').hidden = !f.length;
    }

    function hasFilter() { return !!(state.q || state.local || state.cat || state.sub); }

    function renderResults(scroll) {
        const sec = $('#resultados');
        const active = hasFilter();
        sec.hidden = !active;
        $('#destaques').hidden = active || !EMP.some(e => e.destaque);
        if (!active) return;

        const list = filtrar(false);
        $('#results-title').textContent = plural(list.length, 'empresa encontrada', 'empresas encontradas');
        $('#results-grid').innerHTML = list.map(cardHtml).join('');
        $('#results-empty').hidden = list.length > 0;

        const chips = [];
        if (state.q) chips.push(['q', `“${state.q}”`]);
        if (state.cat) chips.push(['cat', CAT[state.cat].nome]);
        if (state.sub) chips.push(['sub', state.sub]);
        if (state.local) chips.push(['local', state.local]);
        $('#active-chips').innerHTML = chips.map(([k, label]) =>
            `<span class="chip">${esc(label)}<button type="button" data-remove="${k}" aria-label="Remover filtro ${esc(label)}"><i class="fas fa-xmark"></i></button></span>`).join('');

        if (scroll) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function syncInputs() {
        $('#q').value = state.q;
        $('#local').value = state.local;
        $('#local-clear').hidden = !state.local;
    }

    function apply(scroll) {
        writeURL();
        syncInputs();
        renderResults(scroll);
    }

    /* ---------- Campo LOCAL (só municípios com empresas) ---------- */
    const localInput = $('#local'), localList = $('#local-list');
    let localOpts = [], localIdx = -1, localFilter = '';

    function buildLocalList() {
        const all = municipiosComEmpresas();
        const f = norm(localFilter);
        localOpts = all.filter(m => !f || norm(m.nome).indexOf(f) > -1)
            .sort((a, b) => (f ? (norm(b.nome).startsWith(f) - norm(a.nome).startsWith(f)) : 0));
        const total = all.reduce((s, m) => s + m.qtd, 0);
        let html = `<li class="panel-head" role="presentation">${all.length ? `Municípios com empresas cadastradas (${all.length})` : 'Municípios com empresas'}</li>`;
        if (!f) html += `<li role="option" id="lo-all" data-v="" aria-selected="${!state.local}"><span><i class="fas fa-earth-americas"></i> Todo o Tocantins</span><span class="opt-meta">${plural(total, 'empresa', 'empresas')}</span></li>`;
        html += localOpts.map((m, i) => `<li role="option" id="lo-${i}" data-v="${esc(m.nome)}" aria-selected="${norm(m.nome) === norm(state.local)}"><span>${esc(m.nome)}</span><span class="opt-meta">${plural(m.qtd, 'empresa', 'empresas')}</span></li>`).join('');
        if (!localOpts.length) {
            html += all.length
                ? `<li class="panel-empty" role="presentation">Nenhum município com empresas cadastradas corresponde a “${esc(localFilter)}”.</li>`
                : `<li class="panel-empty" role="presentation">Nenhum município tem empresas para esta busca.<br><button type="button" data-clear-all>Limpar busca e categoria</button></li>`;
        }
        localList.innerHTML = html;
        localIdx = -1;
    }
    function openLocal() {
        buildLocalList();
        localList.hidden = false;
        localInput.setAttribute('aria-expanded', 'true');
    }
    function closeLocal() {
        localList.hidden = true;
        localInput.setAttribute('aria-expanded', 'false');
        localInput.removeAttribute('aria-activedescendant');
        localFilter = '';
        localInput.value = state.local;
    }
    function pickLocal(v) {
        state.local = v;
        closeLocal();
        apply(true);
        if (!hasFilter()) syncInputs();
    }
    function moveLocal(d) {
        const items = Array.from(localList.querySelectorAll('[role="option"]'));
        if (!items.length) return;
        items.forEach(i => i.classList.remove('active'));
        localIdx = (localIdx + d + items.length) % items.length;
        const it = items[localIdx];
        it.classList.add('active');
        it.scrollIntoView({ block: 'nearest' });
        localInput.setAttribute('aria-activedescendant', it.id);
    }

    localInput.addEventListener('focus', () => { localInput.select(); openLocal(); });
    localInput.addEventListener('click', () => { if (localList.hidden) openLocal(); });
    localInput.addEventListener('blur', () => { if (!localList.hidden) closeLocal(); });
    localInput.addEventListener('input', () => { localFilter = localInput.value; if (localList.hidden) openLocal(); else buildLocalList(); });
    localInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (localList.hidden) openLocal(); moveLocal(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveLocal(-1); }
        else if (e.key === 'Escape') { closeLocal(); }
        else if (e.key === 'Enter') {
            const act = localList.querySelector('.active');
            if (!localList.hidden && (act || localOpts.length === 1)) {
                e.preventDefault();
                pickLocal(act ? act.dataset.v : localOpts[0].nome);
            }
        }
    });
    localList.addEventListener('mousedown', (e) => {
        e.preventDefault();                       // mantém o foco no input
        const li = e.target.closest('[role="option"]');
        if (li) pickLocal(li.dataset.v);
        if (e.target.closest('[data-clear-all]')) { state.q = state.cat = state.sub = state.local = ''; closeLocal(); apply(false); }
    });
    $('#local-clear').addEventListener('click', () => { state.local = ''; closeLocal(); apply(false); localInput.focus(); });

    /* ---------- Campo BUSCA com sugestões ---------- */
    const qInput = $('#q'), qList = $('#q-list');
    let qOpts = [], qIdx = -1;
    function buildSuggestions() {
        const t = norm(qInput.value);
        if (t.length < 2) { qList.hidden = true; return; }
        const out = [];
        CATEGORIAS.forEach(c => {
            if (norm(c.nome).indexOf(t) > -1) out.push({ tipo: 'Categoria', label: c.nome, cat: c.id });
            c.sub.forEach(s => { if (norm(s).indexOf(t) > -1) out.push({ tipo: 'Serviço', label: s, cat: c.id, sub: s }); });
        });
        EMP.forEach(e => { if (norm(e.nome).indexOf(t) > -1) out.push({ tipo: 'Empresa', label: e.nome, q: e.nome }); });
        qOpts = out.slice(0, 8);
        qList.innerHTML = qOpts.length
            ? qOpts.map((o, i) => `<li role="option" id="qo-${i}" data-i="${i}"><span>${esc(o.label)}</span><span class="opt-tag">${o.tipo}</span></li>`).join('')
            : '';
        qList.hidden = !qOpts.length;
        qIdx = -1;
    }
    function pickSuggestion(o) {
        qList.hidden = true;
        if (o.cat) { state.cat = o.cat; state.sub = o.sub || ''; state.q = ''; }
        else state.q = o.q;
        apply(true);
    }
    qInput.addEventListener('input', buildSuggestions);
    qInput.addEventListener('keydown', (e) => {
        const items = Array.from(qList.querySelectorAll('[role="option"]'));
        if (!qList.hidden && items.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            items.forEach(i => i.classList.remove('active'));
            qIdx = (qIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[qIdx].classList.add('active');
        } else if (e.key === 'Enter' && qIdx > -1 && !qList.hidden) {
            e.preventDefault(); pickSuggestion(qOpts[qIdx]);
        } else if (e.key === 'Escape') qList.hidden = true;
    });
    qList.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const li = e.target.closest('[role="option"]');
        if (li) pickSuggestion(qOpts[Number(li.dataset.i)]);
    });
    qInput.addEventListener('blur', () => { qList.hidden = true; });

    /* ---------- Eventos gerais ---------- */
    $('#search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        state.q = qInput.value.trim();
        qList.hidden = true;
        closeLocal();
        apply(true);
    });

    document.addEventListener('click', (e) => {
        const t = e.target;
        const catBtn = t.closest('[data-cat]');
        if (catBtn) {
            state.cat = catBtn.dataset.cat;
            state.sub = catBtn.dataset.sub || '';
            $('#dd-empresas').classList.remove('open');
            setNav(false);
            apply(true);
            return;
        }
        const city = t.closest('[data-local]');
        if (city) { state.local = city.dataset.local; apply(true); return; }
        const rm = t.closest('[data-remove]');
        if (rm) { state[rm.dataset.remove] = ''; if (rm.dataset.remove === 'cat') state.sub = ''; apply(false); return; }
        if (t.closest('#btn-clear') || t.closest('#btn-empty-clear')) { state.q = state.cat = state.sub = state.local = ''; apply(false); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

        const dd = t.closest('.dd-btn');
        if (dd) { const box = $('#dd-empresas'); const open = box.classList.toggle('open'); dd.setAttribute('aria-expanded', String(open)); return; }
        if (!t.closest('#dd-empresas')) $('#dd-empresas').classList.remove('open');

        if (t.closest('#nav-toggle')) { setNav(!$('#nav').classList.contains('open')); return; }
        if (t.closest('#nav a')) setNav(false);
        if (!t.closest('.field-local')) { if (!localList.hidden) closeLocal(); }
    });

    function setNav(open) {
        $('#nav').classList.toggle('open', open);
        const b = $('#nav-toggle');
        b.setAttribute('aria-expanded', String(open));
        b.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setNav(false); $('#dd-empresas').classList.remove('open'); } });
    window.addEventListener('scroll', () => $('#header').classList.toggle('scrolled', window.scrollY > 40), { passive: true });

    /* ---------- Início ---------- */
    readURL();
    renderStatic();
    renderStats();
    renderFeatured();
    syncInputs();
    renderResults(false);
})();
