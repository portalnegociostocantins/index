/* ============================================================
   config.js — configurações gerais do Portal Negócios Tocantins
   ============================================================ */
const CONFIG = {
    nome: "Portal Negócios Tocantins",
    titulo: "Empresas, serviços e profissionais do Tocantins",
    subtitulo: "Tudo o que você precisa em um único lugar. Busque já!",

    // Links do topo (deixe "" para esconder o botão)
    linkEntrar: "",
    linkCadastrar: "#cadastrar",
    whatsappPortal: "",          // WhatsApp do portal, só números com DDD (ex.: 63999999999)
    emailPortal: "portalnegociostocantins@gmail.com",

    // true mostra a faixa "modo demonstração" e a etiqueta EXEMPLO nos cartões (use só para testes)
    modoDemo: false
};

/* Categorias principais (as 4 primeiras aparecem como cartões grandes no topo) */
const CATEGORIAS = [
    { id: "restaurantes", nome: "Bares e Restaurantes", icone: "fa-utensils", destaque: true,
      sub: ["Restaurantes", "Lanchonetes", "Pizzarias", "Bares", "Padarias e Confeitarias", "Churrascarias"] },
    { id: "lojas", nome: "Lojas e Mercados", icone: "fa-cart-shopping", destaque: true,
      sub: ["Supermercados", "Roupas e Calçados", "Material de Construção", "Eletrônicos", "Papelarias", "Agropecuárias"] },
    { id: "beleza", nome: "Beleza e Estética", icone: "fa-scissors", destaque: true,
      sub: ["Salões de Beleza", "Barbearias", "Clínicas de Estética", "Manicure e Pedicure", "Studios de Sobrancelha"] },
    { id: "servicos", nome: "Serviços Especializados", icone: "fa-user-tie", destaque: true,
      sub: ["Advogados", "Contadores", "Engenharia e Arquitetura", "Consultoria", "Despachantes", "Marketing e Design"] },
    { id: "saude", nome: "Saúde e Bem-estar", icone: "fa-heart-pulse",
      sub: ["Clínicas", "Dentistas", "Farmácias", "Laboratórios", "Academias", "Psicologia"] },
    { id: "automotivo", nome: "Automotivo", icone: "fa-car",
      sub: ["Oficinas Mecânicas", "Autopeças", "Lava-jatos", "Concessionárias", "Borracharias", "Amortecedores e Embreagens"] },
    { id: "construcao", nome: "Construção e Reformas", icone: "fa-helmet-safety",
      sub: ["Construtoras", "Pedreiros", "Elétrica e Hidráulica", "Marcenaria", "Pintura", "Vidraçarias"] },
    { id: "educacao", nome: "Educação e Cursos", icone: "fa-graduation-cap",
      sub: ["Escolas", "Cursos Profissionalizantes", "Idiomas", "Reforço Escolar", "Faculdades"] },
    { id: "eventos", nome: "Eventos e Festas", icone: "fa-champagne-glasses",
      sub: ["Buffets", "Decoração", "Fotografia e Vídeo", "Som e Iluminação", "Espaços para Eventos"] },
    { id: "turismo", nome: "Hotéis e Turismo", icone: "fa-umbrella-beach",
      sub: ["Hotéis e Pousadas", "Agências de Viagem", "Passeios", "Transporte Turístico"] },
    { id: "agro", nome: "Agro e Pecuária", icone: "fa-tractor",
      sub: ["Insumos", "Máquinas Agrícolas", "Veterinários", "Sementes", "Armazéns"] },
    { id: "pets", nome: "Pet Shops e Veterinários", icone: "fa-paw",
      sub: ["Pet Shops", "Clínicas Veterinárias", "Banho e Tosa", "Hotelzinho Pet"] }
];
