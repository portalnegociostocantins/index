# Portal Negócios Tocantins — página inicial

Abra `index.html` (ou publique a pasta inteira no GitHub Pages).

- `empresas.js`: empresas cadastradas. O campo **Local** lista só os municípios que aparecem aqui.
  Os itens atuais são EXEMPLOS fictícios; troque pelos reais e ponha `modoDemo: false` em `config.js`.
- `config.js`: textos do topo, links, e-mail/WhatsApp do portal e categorias.
- `municipios.js` / `municipios_tocantins.txt`: lista dos 139 municípios (usada para validar o nome do município de cada empresa).

---

## Admin das empresas (admin.html)

Abra `admin.html` (senha inicial: a mesma dos outros sites — **troque em Ferramentas → Trocar senha**).

1. **Nova empresa** → preencha nome, categoria, tipo, município (lista dos 139), contatos e o **link da página dela no GitHub**
   (ex.: `https://portalnegociostocantins.github.io/jhonybarber/`). O link vira o botão "Ver página" no cartão.
2. Veja o resultado em **Ver portal (prévia)** antes de publicar.
3. **Publicar (gerar .ZIP)** → suba o `empresas.js` (e a pasta `imagens/`, se enviou logos) para o GitHub do portal.
4. O campo **Local** do portal passa a mostrar sozinho os municípios das empresas ativas.

Empresas "ocultas" (ativo desligado) não aparecem no portal nem no filtro Local.
