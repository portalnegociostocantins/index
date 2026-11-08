/* ============================================================
   admin.js — painel para vincular empresas e negócios ao Portal Negócios Tocantins
   Fluxo: editar aqui → "Publicar (gerar .ZIP)" → subir os arquivos no GitHub.
   ============================================================ */
(function () {
    'use strict';

    const $ = (s, r) => (r || document).querySelector(s);
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);
    const clone = (v) => JSON.parse(JSON.stringify(v));

    const KEY = 'portal_empresas_rascunho';
    const SESSION = 'portal_admin_ok';
    const CAT = {}; CATEGORIAS.forEach(c => { CAT[c.id] = c; });
    const MUNI = {}; MUNICIPIOS_TO.forEach(m => { MUNI[norm(m)] = m; });

    /* ---------- SHA-256 (protege a senha do painel) ---------- */
    function sha256(message) {
        const bytes = Array.from(new TextEncoder().encode(message));
        const K = [], H0 = [];
        const isPrime = n => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
        for (let c = 2, n = 0; n < 64; c++) {
            if (!isPrime(c)) continue;
            if (n < 8) H0[n] = (Math.pow(c, 1 / 2) % 1) * 4294967296 | 0;
            K[n++] = (Math.pow(c, 1 / 3) % 1) * 4294967296 | 0;
        }
        const bitLen = bytes.length * 8;
        bytes.push(0x80);
        while (bytes.length % 64 !== 56) bytes.push(0);
        [Math.floor(bitLen / 4294967296), bitLen >>> 0].forEach(v => bytes.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255));
        const rotr = (x, n) => (x >>> n) | (x << (32 - n));
        let H = H0.slice();
        for (let i = 0; i < bytes.length; i += 64) {
            const w = new Array(64);
            for (let t = 0; t < 16; t++) w[t] = (bytes[i + 4 * t] << 24) | (bytes[i + 4 * t + 1] << 16) | (bytes[i + 4 * t + 2] << 8) | bytes[i + 4 * t + 3];
            for (let t = 16; t < 64; t++) {
                const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
                const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
                w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
            }
            let [a, b, c, d, e, f, g, h] = H;
            for (let t = 0; t < 64; t++) {
                const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
                const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
                h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            H = [(H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0, (H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h) | 0];
        }
        return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
    }

    /* ---------- Estado e rascunho ---------- */
    let E, passHash = ADMIN_PASS_HASH, selId = null, dirty = false, saveTimer = null;

    (function load() {
        E = clone(EMPRESAS);
        try {
            const d = JSON.parse(localStorage.getItem(KEY));
            if (d && d.basedOn === EMPRESAS_VERSION && Array.isArray(d.empresas)) {
                E = d.empresas; passHash = d.passHash || ADMIN_PASS_HASH; dirty = true;
            }
        } catch (e) { /* sem rascunho */ }
    })();

    function persist() {
        try { localStorage.setItem(KEY, JSON.stringify({ basedOn: EMPRESAS_VERSION, savedAt: Date.now(), empresas: E, passHash })); return true; }
        catch (e) { return false; }
    }
    function touched() {
        dirty = true;
        setStatus();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { if (!persist()) toast('Fotos pesadas: o rascunho não coube no navegador. Publique o .ZIP para não perder.'); renderSummary(); }, 300);
    }
    function setStatus() {
        const s = $('#status');
        s.className = 'a-status ' + (dirty ? 'dirty' : 'ok');
        s.innerHTML = dirty ? '<i class="fas fa-circle-exclamation"></i> Alterações ainda não publicadas — clique em "Publicar"' : '<i class="fas fa-circle-check"></i> Tudo em dia com o que está publicado';
        const bm = $('#save-bar-msg');
        if (bm) { bm.className = 'msg ' + (dirty ? 'dirty' : 'ok'); bm.innerHTML = dirty ? '<i class="fas fa-circle-exclamation"></i> Há alterações não salvas — clique em "Salvar alterações"' : '<i class="fas fa-circle-check"></i> Nenhuma alteração pendente'; }
    }

    /* ---------- Listas auxiliares ---------- */
    $('#dl-muni').innerHTML = MUNICIPIOS_TO.map(m => `<option value="${esc(m)}">`).join('');
    function fillSubList(cat) {
        $('#dl-sub').innerHTML = ((CAT[cat] || {}).sub || []).map(s => `<option value="${esc(s)}">`).join('');
    }
    const byId = (id) => E.find(e => e.id === id);
    const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const avatar = (e) => e.logo ? `<img src="${esc(e.logo)}" alt="">` : esc(initials(e.nome));

    /* ---------- Resumo (o que aparece no filtro Local) ---------- */
    function renderSummary() {
        const act = E.filter(e => e.ativo !== false);
        const map = new Map();
        act.forEach(e => { const k = MUNI[norm(e.municipio)] || e.municipio; map.set(k, (map.get(k) || 0) + 1); });
        const arr = Array.from(map).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
        $('#summary').innerHTML = `<strong>${plural(act.length, 'empresa ativa', 'empresas ativas')}</strong> em <strong>${plural(arr.length, 'município', 'municípios')}</strong>.<br>
            O campo “Local” do portal mostra:
            <div class="sum-chips">${arr.map(([m, n]) => `<span>${esc(m)} (${n})</span>`).join('') || '<em>nenhum ainda</em>'}</div>`;
        const sel = $('#f-muni'), cur = sel.value;
        sel.innerHTML = '<option value="">Todos os municípios</option>' + Array.from(new Set(E.map(e => e.municipio))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(m => `<option ${m === cur ? 'selected' : ''}>${esc(m)}</option>`).join('');
    }

    /* ---------- Lista de empresas ---------- */
    function renderList() {
        const t = norm($('#f-text').value), m = $('#f-muni').value;
        const list = E.filter(e => (!m || e.municipio === m) && (!t || norm([e.nome, e.municipio, e.sub, e.bairro].join(' ')).indexOf(t) > -1));
        $('#biz-list').innerHTML = list.length ? list.map(e => `
            <li><button type="button" class="biz-item ${e.id === selId ? 'active' : ''} ${e.ativo === false ? 'off' : ''}" data-id="${e.id}">
                <span class="avatar">${avatar(e)}</span>
                <span class="t"><strong>${esc(e.nome || 'Sem nome')}</strong><small>${esc(e.municipio || '—')} · ${esc((CAT[e.categoria] || {}).nome || '')}</small></span>
                <span class="tags">${e.destaque ? '<span class="tag star">★</span>' : ''}${e.pagina ? '<span class="tag link"><i class="fas fa-link"></i></span>' : ''}${e.ativo === false ? '<span class="tag">oculta</span>' : ''}</span>
            </button></li>`).join('') : `<li class="list-empty">${E.length ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada ainda.'}</li>`;
    }

    /* ---------- Editor ---------- */
    const field = (label, inner, o) => `<div class="f ${o && o.full ? 'full' : ''}"><label>${label}</label>${inner}${o && o.hint ? `<small class="hint">${o.hint}</small>` : ''}</div>`;
    const input = (k, v, o) => `<input class="in" data-f="${k}" type="${(o && o.type) || 'text'}" value="${esc(v)}" ${o && o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o && o.list ? `list="${o.list}"` : ''} ${o && o.mode ? `inputmode="${o.mode}"` : ''}>`;

    function renderEditor() {
        const e = byId(selId);
        const box = $('#editor');
        if (!e) {
            box.innerHTML = `<div class="empty-ed"><i class="fas fa-store"></i><h2>Selecione ou crie uma empresa</h2><p>Escolha uma empresa na lista ao lado ou clique em “Nova empresa” para vincular um novo parceiro ao portal.</p></div>`;
            return;
        }
        fillSubList(e.categoria);
        box.innerHTML = `
        <div class="ed-head">
            <div><h2 id="ed-title">${esc(e.nome || 'Nova empresa')}</h2><p>Id ${e.id} · as alterações aparecem no portal depois que você publicar.</p></div>
            <div class="ed-actions">
                ${e.pagina ? `<a class="btn-sm" href="${esc(e.pagina)}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> Abrir página</a>` : ''}
                <button type="button" class="btn-sm" data-act="dup"><i class="fas fa-copy"></i> Duplicar</button>
                <button type="button" class="btn-sm danger" data-act="del"><i class="fas fa-trash-can"></i> Excluir</button>
            </div>
        </div>

        <div class="card page-box">
            <h3><i class="fas fa-link"></i> Página da empresa (landing page)</h3>
            ${field('Link da página no GitHub (ou site próprio)', input('pagina', e.pagina, { type: 'url', ph: 'https://portalnegociostocantins.github.io/nome-da-empresa/' }), { full: true, hint: 'Vira o botão “Ver página” no cartão da empresa no portal.' })}
        </div>

        <div class="card">
            <h3><i class="fas fa-store"></i> Dados principais</h3>
            <div class="grid">
                ${field('Nome da empresa', input('nome', e.nome), { full: true })}
                ${field('Categoria', `<select class="in" data-f="categoria">${CATEGORIAS.map(c => `<option value="${c.id}" ${c.id === e.categoria ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>`)}
                ${field('Tipo / serviço', input('sub', e.sub, { list: 'dl-sub', ph: 'Ex.: Barbearias' }), { hint: 'Escolha uma sugestão ou escreva o seu.' })}
                ${field('Município', input('municipio', e.municipio, { list: 'dl-muni', ph: 'Ex.: Palmas' }) + '<small class="hint" id="muni-hint"></small>')}
                ${field('Bairro (opcional)', input('bairro', e.bairro))}
                ${field('Descrição curta', `<textarea class="in" data-f="descricao" rows="3">${esc(e.descricao)}</textarea>`, { full: true })}
            </div>
        </div>

        <div class="card">
            <h3><i class="fas fa-address-book"></i> Contatos</h3>
            <div class="grid">
                ${field('WhatsApp (só números com DDD)', input('whatsapp', e.whatsapp, { ph: '63999999999', mode: 'numeric' }))}
                ${field('Telefone (só números com DDD)', input('telefone', e.telefone, { ph: '6332131234', mode: 'numeric' }))}
                ${field('Instagram (link)', input('instagram', e.instagram, { type: 'url', ph: 'https://instagram.com/...' }))}
                ${field('Site próprio (link)', input('site', e.site, { type: 'url', ph: 'https://...' }))}
            </div>
        </div>

        <div class="card">
            <h3><i class="fas fa-image"></i> Logo e visibilidade</h3>
            <div class="f"><label>Logo (opcional)</label>
                <div class="logo-row"><span class="avatar" id="logo-prev">${avatar(e)}</span>
                    <div class="logo-btns">
                        <label class="btn-sm"><i class="fas fa-upload"></i> Enviar logo<input type="file" accept="image/*" hidden id="logo-file"></label>
                        ${e.logo ? '<button type="button" class="btn-sm danger" data-act="logo-clear"><i class="fas fa-xmark"></i> Remover</button>' : ''}
                    </div></div>
                <small class="hint">${e.logo && e.logo.indexOf('data:') === 0 ? 'Logo novo: ao publicar, será salvo como arquivo na pasta <b>imagens/</b>.' : 'Toda logo fica na pasta <b>imagens/</b> do site. Ao publicar, a logo enviada é salva lá automaticamente.'}</small>
                <input class="in" data-f="logo" value="${e.logo && e.logo.indexOf('data:') === 0 ? '' : esc(e.logo)}" placeholder="ou digite o caminho: imagens/minha-logo.png" style="margin-top:8px"></div>
            <div class="f"><label class="sw"><input type="checkbox" data-f="ativo" ${e.ativo !== false ? 'checked' : ''}><span class="sw-ui"></span><span>Empresa ativa (aparece no portal e conta no filtro “Local”)</span></label></div>
            <div class="f"><label class="sw"><input type="checkbox" data-f="destaque" ${e.destaque ? 'checked' : ''}><span class="sw-ui"></span><span>Mostrar em “Empresas em destaque” na página inicial</span></label></div>
        </div>`;
        updateMuniHint(e);
    }

    function updateMuniHint(e) {
        const h = $('#muni-hint'); if (!h) return;
        const ok = !!MUNI[norm(e.municipio)];
        h.className = 'hint ' + (ok ? 'ok' : 'warn');
        h.textContent = !e.municipio ? 'Informe o município.' : ok ? (e.ativo === false ? 'Município reconhecido (empresa oculta não aparece no filtro).' : '✔ Aparecerá no filtro “Local” do portal.') : 'Município não reconhecido: escolha um da lista de sugestões.';
    }

    /* ---------- Eventos ---------- */
    $('#editor').addEventListener('input', (ev) => {
        const el = ev.target.closest('[data-f]'); if (!el) return;
        const e = byId(selId); if (!e) return;
        const k = el.dataset.f;
        e[k] = el.type === 'checkbox' ? el.checked : el.value;
        if (k === 'municipio' && MUNI[norm(e.municipio)] && norm(el.value) === norm(MUNI[norm(e.municipio)])) { /* mantém como digitado */ }
        if (k === 'whatsapp' || k === 'telefone') { e[k] = String(el.value).replace(/\D/g, ''); }
        if (k === 'nome') $('#ed-title').textContent = e.nome || 'Nova empresa';
        if (k === 'categoria') { fillSubList(e.categoria); }
        if (k === 'municipio' || k === 'ativo') updateMuniHint(e);
        renderList(); touched();
    });
    $('#editor').addEventListener('change', async (ev) => {
        const t = ev.target;
        if (t.dataset.f === 'municipio') {
            const e = byId(selId); const ok = MUNI[norm(t.value)];
            if (e && ok) { e.municipio = ok; t.value = ok; updateMuniHint(e); renderList(); touched(); }
        }
        if (t.id === 'logo-file' && t.files[0]) {
            try { const e = byId(selId); e.logo = await compress(t.files[0], 400); touched(); renderEditor(); renderList(); }
            catch (err) { toast('Não consegui ler essa imagem.'); }
        }
    });
    $('#editor').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-act]'); if (!b) return;
        const e = byId(selId); if (!e) return;
        if (b.dataset.act === 'logo-clear') { e.logo = ''; touched(); renderEditor(); renderList(); }
        if (b.dataset.act === 'dup') {
            const c = clone(e); c.id = nextId(); c.nome += ' (cópia)'; E.push(c); selId = c.id; touched(); renderList(); renderEditor(); renderSummary();
        }
        if (b.dataset.act === 'del') {
            if (!confirm('Excluir “' + e.nome + '” do portal? (Você ainda pode descartar as alterações antes de publicar.)')) return;
            E = E.filter(x => x.id !== e.id); selId = null; touched(); renderList(); renderEditor(); renderSummary();
        }
    });
    $('#biz-list').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-id]'); if (!b) return;
        selId = Number(b.dataset.id); renderList(); renderEditor();
        if (window.innerWidth <= 900) $('#editor').scrollIntoView({ behavior: 'smooth' });
    });
    $('#f-text').addEventListener('input', renderList);
    $('#f-muni').addEventListener('change', renderList);
    $('#btn-new').addEventListener('click', () => {
        const e = { id: nextId(), nome: 'Nova empresa', categoria: 'restaurantes', sub: '', municipio: 'Palmas', bairro: '', descricao: '', whatsapp: '', telefone: '', instagram: '', site: '', pagina: '', logo: '', destaque: false, ativo: true };
        E.push(e); selId = e.id; touched(); renderList(); renderEditor(); renderSummary();
        if (window.innerWidth <= 900) $('#editor').scrollIntoView({ behavior: 'smooth' });
        const n = $('[data-f="nome"]'); if (n) { n.focus(); n.select(); }
    });
    function nextId() { return E.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0) + 1; }

    /* ---------- Imagem ---------- */
    function compress(file, maxW) {
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onerror = reject;
            fr.onload = () => {
                const img = new Image(); img.onerror = reject;
                img.onload = () => {
                    const k = Math.min(1, maxW / img.width, maxW / img.height);
                    const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
                    const c = document.createElement('canvas'); c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(c.toDataURL('image/png'));
                };
                img.src = fr.result;
            };
            fr.readAsDataURL(file);
        });
    }

    /* ---------- Publicar ---------- */
    function download(blob, name) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    }
    const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'logo';

    function prepareExport() {
        const list = clone(E), files = [];
        list.forEach(e => {
            if (e.logo && e.logo.indexOf('data:image') === 0) {
                const comma = e.logo.indexOf(',');
                const png = e.logo.slice(0, comma).indexOf('png') > -1;
                const name = `logo-${slug(e.nome)}-${e.id}.${png ? 'png' : 'jpg'}`;
                files.push({ name, base64: e.logo.slice(comma + 1) });
                e.logo = 'imagens/' + name;
            }
        });
        return { list, files };
    }
    function buildEmpresasJs(list) {
        return `/* ============================================================
   empresas.js — empresas e negócios parceiros do Portal Negócios Tocantins
   GERADO pelo painel admin.html em ${new Date().toLocaleString('pt-BR')}.
   O campo "Local" do portal lista só os municípios que aparecem aqui
   (empresas com ativo: true).
   ============================================================ */
const EMPRESAS_VERSION = ${JSON.stringify(new Date().toISOString())};
const ADMIN_PASS_HASH = ${JSON.stringify(passHash)};
const EMPRESAS = ${JSON.stringify(list, null, 4)};
`;
    }
    function problemas() {
        const p = [];
        E.forEach(e => {
            if (!String(e.nome || '').trim()) p.push('Empresa sem nome (id ' + e.id + ')');
            if (!MUNI[norm(e.municipio)]) p.push((e.nome || 'Id ' + e.id) + ': município “' + (e.municipio || '') + '” não reconhecido');
            if (e.pagina && !/^https?:\/\//i.test(e.pagina)) p.push((e.nome || 'Id ' + e.id) + ': o link da página deve começar com https://');
        });
        return p;
    }

    async function publish() {
        const pr = problemas();
        if (pr.length && !confirm('Atenção:\n\n• ' + pr.join('\n• ') + '\n\nPublicar mesmo assim?')) return;
        const btn = $('#btn-publish'), label = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Gerando…</span>';
        try {
            persist();
            const { list, files } = prepareExport();
            const js = buildEmpresasJs(list);
            if (typeof JSZip === 'undefined') {
                download(new Blob([js], { type: 'text/javascript' }), 'empresas.js');
                modal('Baixei só o empresas.js', '<p>Não consegui carregar a biblioteca de ZIP (verifique a internet). O <code>empresas.js</code> tem as alterações, mas logos enviados não foram incluídos.</p>');
                return;
            }
            const zip = new JSZip();
            zip.file('empresas.js', js);
            const img = zip.folder('imagens');
            files.forEach(f => img.file(f.name, f.base64, { base64: true }));
            // logos que já estão na pasta imagens/
            const have = new Set(files.map(f => 'imagens/' + f.name));
            for (const e of list) {
                if (e.logo && /^imagens\//.test(e.logo) && !have.has(e.logo)) {
                    try { const r = await fetch(e.logo); if (r.ok) zip.file(e.logo, await r.blob()); } catch (x) { /* ignora */ }
                }
            }
            const project = ['index.html', 'style.css', 'app.js', 'config.js', 'municipios.js', 'municipios_tocantins.txt', 'admin.html', 'admin.css', 'admin.js', 'README.md'];
            let got = 0;
            for (const n of project) {
                try { const r = await fetch(n); if (r.ok) { zip.file(n, await r.text()); got++; } } catch (x) { /* ignora */ }
            }
            const full = got >= 8;
            zip.file('LEIA-ME_ATUALIZACAO.txt', full ? 'PACOTE COMPLETO. Suba todos os arquivos (e a pasta imagens/) para o GitHub.\n' : 'PACOTE DE ATUALIZAÇÃO. Suba apenas empresas.js e a pasta imagens/ para o GitHub, substituindo os atuais.\n');
            download(await zip.generateAsync({ type: 'blob' }), 'portal-negocios-tocantins-atualizado.zip');
            dirty = false; setStatus();
            modal(full ? 'ZIP completo gerado!' : 'ZIP de atualização gerado!', `<p>O arquivo <code>portal-negocios-tocantins-atualizado.zip</code> foi baixado.</p>
                <ol><li>Descompacte o ZIP.</li>
                <li>${full ? 'Envie <b>todos os arquivos e a pasta <code>imagens/</code></b> para o repositório do portal no GitHub.' : 'Envie o <code>empresas.js</code> (e a pasta <code>imagens/</code>, se houver logos) para o repositório do portal no GitHub, substituindo os atuais.'}</li>
                <li>Aguarde alguns instantes e atualize o portal (Ctrl+F5).</li></ol>
                <p>Só o <code>empresas.js</code> muda no dia a dia: o campo “Local” é atualizado sozinho com os municípios das empresas ativas.</p>`);
        } catch (err) {
            console.error(err);
            modal('Algo deu errado', '<p>Não consegui gerar o ZIP. Use <b>Ferramentas → Baixar backup</b> para não perder o trabalho.</p>');
        } finally { btn.disabled = false; btn.innerHTML = label; }
    }

    /* ---------- Ferramentas, modal, toast ---------- */
    function modal(title, html) {
        const m = $('#modal');
        m.innerHTML = `<div class="modal-box"><h2>${esc(title)}</h2>${html}<button type="button" class="btn-primary block" id="modal-ok" style="margin-top:14px">Fechar</button></div>`;
        m.hidden = false;
        $('#modal-ok').addEventListener('click', () => { m.hidden = true; });
    }
    function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }

    $('#btn-tools').addEventListener('click', () => {
        modal('Ferramentas', `
            <div class="row">
                <button type="button" class="btn-sm" id="t-export"><i class="fas fa-download"></i> Baixar backup (.json)</button>
                <label class="btn-sm"><i class="fas fa-upload"></i> Carregar backup<input type="file" accept=".json,application/json" hidden id="t-import"></label>
                <button type="button" class="btn-sm danger" id="t-discard"><i class="fas fa-rotate-left"></i> Descartar alterações não publicadas</button>
            </div>
            <div class="f"><label>Trocar senha do painel</label>
                <input class="in" type="password" id="pw1" placeholder="Nova senha (mín. 6 caracteres)" autocomplete="new-password" style="margin-bottom:8px">
                <input class="in" type="password" id="pw2" placeholder="Repita a nova senha" autocomplete="new-password" style="margin-bottom:8px">
                <button type="button" class="btn-sm" id="t-pass"><i class="fas fa-key"></i> Definir nova senha</button>
                <small class="hint">Vale no site depois de publicar. Essa senha só protege o editor, o portal é público.</small></div>`);
        $('#t-export').onclick = () => download(new Blob([JSON.stringify(E, null, 2)], { type: 'application/json' }), 'empresas-backup.json');
        $('#t-import').onchange = (ev) => {
            const f = ev.target.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                try { const d = JSON.parse(r.result); if (!Array.isArray(d)) throw 0; E = d; selId = null; touched(); renderList(); renderEditor(); renderSummary(); $('#modal').hidden = true; toast('Backup carregado.'); }
                catch (x) { toast('Arquivo de backup inválido.'); }
            };
            r.readAsText(f);
        };
        $('#t-discard').onclick = () => { if (confirm('Descartar todas as alterações não publicadas?')) { try { localStorage.removeItem(KEY); } catch (x) { /* ignora */ } dirty = false; location.reload(); } };
        $('#t-pass').onclick = () => {
            const a = $('#pw1').value, b = $('#pw2').value;
            if (a.length < 6) return toast('A senha precisa ter pelo menos 6 caracteres.');
            if (a !== b) return toast('As senhas não são iguais.');
            passHash = sha256(a); touched(); $('#modal').hidden = true; toast('Nova senha definida. Publique para valer no site.');
        };
    });

    /* ---------- Login ---------- */
    function openDash() {
        $('#auth').hidden = true; $('#dash').hidden = false;
        setStatus(); renderSummary(); renderList(); renderEditor();
        if (E.length && !selId) { selId = E[0].id; renderList(); renderEditor(); }
    }
    $('#auth-form').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const h = sha256($('#admin-password').value);
        if (h === ADMIN_PASS_HASH || h === passHash) { try { sessionStorage.setItem(SESSION, '1'); } catch (x) { /* ignora */ } openDash(); }
        else $('#login-error').textContent = 'Senha incorreta.';
    });
    $('#btn-logout').addEventListener('click', () => {
        if (dirty && !confirm('Há alterações não publicadas (ficam salvas como rascunho neste navegador). Sair mesmo assim?')) return;
        try { sessionStorage.removeItem(SESSION); } catch (x) { /* ignora */ }
        location.reload();
    });
    $('#btn-publish').addEventListener('click', publish);
    $('#btn-save').addEventListener('click', async () => {
        const b = $('#btn-save'); b.disabled = true;
        clearTimeout(saveTimer); persist();
        try { await publish(); } finally { b.disabled = false; }
    });
    window.addEventListener('beforeunload', (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });

    let logged = false;
    try { logged = sessionStorage.getItem(SESSION) === '1'; } catch (x) { /* ignora */ }
    if (logged) openDash();
})();
