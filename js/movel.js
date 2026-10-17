// Versão de telemóvel (≤ 760 px): mapa em ecrã inteiro e um painel inferior
// deslizante com três separadores — Mapas, Ponto e Análise.
//
// Não há DOM duplicado: os blocos que já existem (cabeçalho, camadas, créditos,
// ponto e análise) mudam de sítio para a barra de cima e para o painel quando o
// ecrã é estreito, e voltam ao lugar original quando deixa de ser (rodar o
// telemóvel, redimensionar a janela). Uma marca (comentário HTML) guarda o
// lugar de cada um. A classe .movel no <html> liga o arranjo em estilo.css: sem
// JavaScript fica o arranjo em coluna do @media (max-width: 760px).
//
// As funções puras (alturas, encaixe, velocidade, estados, teclas) testam-se em
// tests/app/movel.test.mjs; criarMovel() só corre no browser.

export const LIMITE_MOVEL = "(max-width: 760px)";     // o mesmo limite do @media de estilo.css
export const ESTADOS_GAVETA = ["recolhido", "meio", "cheio"];
const FRACAO_MEIO = 0.45;          // painel a meia altura: 45 % da janela
const FRACAO_CHEIO = 0.88;         // quase ecrã inteiro: fica uma faixa do mapa à vista
const LIMIAR_VELOCIDADE = 0.3;     // px/ms: acima disto o largar é um gesto (passa ao estado seguinte)
const JANELA_VELOCIDADE_MS = 100;  // a velocidade mede-se nos últimos 100 ms do arrasto
const LIMIAR_TOQUE_PX = 6;         // menos do que isto não é um arrasto, é um toque
const MARGEM_PONTO_PX = 48;        // o ponto escolhido fica pelo menos a esta distância das bordas visíveis

// Alturas (px) dos três estados. O recolhido mede-se (pega + separadores + uma
// linha); nunca decrescem, mesmo numa janela muito baixa.
export function alturasGaveta(alturaJanela, alturaRecolhido) {
  const recolhido = Math.min(Math.round(alturaRecolhido), Math.round(alturaJanela));
  const meio = Math.max(recolhido, Math.round(alturaJanela * FRACAO_MEIO));
  const cheio = Math.max(meio, Math.round(alturaJanela * FRACAO_CHEIO));
  return { recolhido, meio, cheio };
}

export const limitarAltura = (altura, alturas) => Math.min(alturas.cheio, Math.max(alturas.recolhido, altura));

// Estado onde o painel encaixa ao largar (velocidade em px/ms, positiva a
// subir). Um gesto rápido vai para o estado seguinte no sentido do gesto (ou
// fica no extremo); um arrasto lento encaixa no estado mais próximo.
export function encaixar(altura, velocidade, alturas) {
  if (Math.abs(velocidade) >= LIMIAR_VELOCIDADE) {
    const sentido = velocidade > 0
      ? ESTADOS_GAVETA.filter((e) => alturas[e] > altura)
      : ESTADOS_GAVETA.filter((e) => alturas[e] < altura).reverse();
    return sentido[0] ?? (velocidade > 0 ? ESTADOS_GAVETA.at(-1) : ESTADOS_GAVETA[0]);
  }
  let melhor = ESTADOS_GAVETA[0];
  for (const e of ESTADOS_GAVETA) {
    if (Math.abs(alturas[e] - altura) < Math.abs(alturas[melhor] - altura)) melhor = e;
  }
  return melhor;
}

// Velocidade (px/ms) nas amostras [{t, altura}] dos últimos `janelaMs`. Se o
// dedo parou antes de largar, só resta uma amostra recente e a velocidade é 0.
export function velocidadeDoArrasto(amostras, janelaMs = JANELA_VELOCIDADE_MS) {
  if (amostras.length < 2) return 0;
  const ultima = amostras.at(-1);
  const primeira = amostras.find((a) => ultima.t - a.t <= janelaMs);
  const dt = ultima.t - primeira.t;
  return dt > 0 ? (ultima.altura - primeira.altura) / dt : 0;
}

// Um movimento do dedo no cabeçalho do painel (dx, dy em px desde o toque) é
// um arrasto quando passa o limiar na vertical e é mais vertical do que
// horizontal; abaixo disso continua a ser um toque (num separador, na pega).
export const eArrasto = (dx, dy) => Math.abs(dy) >= LIMIAR_TOQUE_PX && Math.abs(dy) > Math.abs(dx);

// Tocar na pega: recolhido → meio → cheio → recolhido.
export function estadoSeguinte(estado) {
  const k = ESTADOS_GAVETA.indexOf(estado);
  return ESTADOS_GAVETA[(k + 1) % ESTADOS_GAVETA.length];
}

// Setas na pega (sentido +1 sobe, −1 desce), sem dar a volta.
export function estadoVizinho(estado, sentido) {
  const k = ESTADOS_GAVETA.indexOf(estado) + sentido;
  return ESTADOS_GAVETA[Math.min(ESTADOS_GAVETA.length - 1, Math.max(0, k))];
}

const ROTULOS_PEGA = {
  recolhido: "Painel recolhido. Abrir a meia altura",
  meio: "Painel a meia altura. Abrir em ecrã inteiro",
  cheio: "Painel em ecrã inteiro. Recolher",
};
export const rotuloPega = (estado) => ROTULOS_PEGA[estado];

// Separadores (padrão WAI-ARIA): setas com volta, Home e End, saltando os
// desativados. Devolve o índice novo, ou null se a tecla não é destas.
export function separadorPorTecla(indice, tecla, ativos) {
  const n = ativos.length;
  const procurar = (inicio, passo) => {
    for (let k = 0, i = inicio; k < n; k++, i = (i + passo + n) % n) if (ativos[i]) return i;
    return null;
  };
  switch (tecla) {
    case "ArrowRight": return procurar((indice + 1) % n, 1);
    case "ArrowLeft": return procurar((indice - 1 + n) % n, -1);
    case "Home": return procurar(0, 1);
    case "End": return procurar(n - 1, -1);
    default: return null;
  }
}

// Deslocamento [dx, dy] para L.Map.panBy que leva o ponto (píxeis do mapa) ao
// centro da área visível, ou [0, 0] se já está à vista (com a margem).
export function deslocamentoParaVisivel(ponto, area, margem = MARGEM_PONTO_PX) {
  const dentro = ponto.x >= area.esquerda + margem && ponto.x <= area.direita - margem &&
                 ponto.y >= area.topo + margem && ponto.y <= area.fundo - margem;
  if (dentro) return [0, 0];
  return [Math.round(ponto.x - (area.esquerda + area.direita) / 2),
          Math.round(ponto.y - (area.topo + area.fundo) / 2)];
}

// Mensagem do painel do ponto antes de se escolher um lugar.
export function indicacao(movel) {
  return movel
    ? "Toque no mapa para ver os índices desse lugar."
    : "Clique no mapa para ver os índices desse lugar. Com o teclado: foque o mapa, desloque-o com as setas e carregue em Enter.";
}

// --- Browser ------------------------------------------------------------------
// Liga o arranjo de telemóvel quando o ecrã é estreito. Devolve a interface
// que o main.js usa: ativo(), usarMapa(), aoEscolherPonto(), margensMapa() e
// aoMudar(fn) (chamada com true/false quando o arranjo muda).
export function criarMovel() {
  const $ = (id) => document.getElementById(id);
  const raiz = document.documentElement;
  const consulta = window.matchMedia(LIMITE_MOVEL);
  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gaveta = $("gaveta");
  const cabecalho = gaveta.querySelector(".gaveta__cabecalho");   // pega + separadores + linha: arrasta-se por aqui
  const pega = $("gaveta-pega");
  const linha = $("gaveta-linha");
  const corpo = $("gaveta-corpo");
  const lista = gaveta.querySelector('[role="tablist"]');
  const separadores = [...lista.querySelectorAll('[role="tab"]')];
  const paineis = separadores.map((s) => $(s.getAttribute("aria-controls")));
  const [MAPAS, PONTO, ANALISE] = [0, 1, 2];
  const analise = $("analise");
  const verAnalise = $("ver-analise");
  const barra = $("barra-movel");
  const controlosDeBaixo = () => document.querySelectorAll("#mapa .leaflet-bottom");

  // Blocos que mudam de sítio, pela ordem em que entram em cada destino.
  const blocos = [
    { no: document.querySelector(".folha__cabecalho"), destino: barra, antes: null },
    { no: $("camadas").closest("section"), destino: $("painel-mapas"), antes: null },
    { no: document.querySelector(".creditos"), destino: $("painel-mapas"), antes: null },
    { no: $("ponto").closest("section"), destino: $("painel-ponto"), antes: verAnalise.parentElement },
    { no: analise, destino: $("painel-analise"), antes: null },
  ];
  const marcas = blocos.map(({ no }) => {
    const marca = document.createComment(" lugar original (movel.js) ");
    no.before(marca);
    return marca;
  });

  let ativo = false;
  let estado = "recolhido";
  let alturas = null;
  let mapa = null;
  let separador = MAPAS;
  let arrasto = null;          // toque no cabeçalho em curso (pode vir a ser um arrasto)
  let engolirClique = false;   // o "click" que o browser possa enviar no fim de um arrasto não é um toque
  const ouvintes = [];

  function redimensionarGraficos() {
    for (const id of ["grafico-serie", "grafico-walter"]) window.Chart?.getChart($(id))?.resize();
  }

  function medir() {
    const px = (v) => parseFloat(v) || 0;
    const estilo = getComputedStyle(gaveta);
    const recolhido = px(estilo.borderTopWidth) + pega.offsetHeight + lista.offsetHeight +
      px(getComputedStyle(linha).height) + px(estilo.paddingBottom);
    alturas = alturasGaveta(window.innerHeight, recolhido);
  }

  // Durante o arrasto só se mexe na gaveta e nos controlos de baixo do mapa
  // (estilo em linha): mudar a variável na raiz recalcularia o estilo da página
  // inteira a cada movimento do dedo. A variável muda só ao encaixar.
  function seguirDedo(px) {
    gaveta.style.height = `${px}px`;
    for (const c of controlosDeBaixo()) c.style.bottom = `${px}px`;
  }
  function largarEstiloEmLinha() {
    gaveta.style.removeProperty("height");
    for (const c of controlosDeBaixo()) c.style.removeProperty("bottom");
  }

  function definirEstado(novo) {
    estado = novo;
    gaveta.dataset.estado = novo;
    raiz.dataset.gaveta = novo;
    raiz.style.setProperty("--gaveta-altura", `${alturas[novo]}px`);
    largarEstiloEmLinha();
    pega.setAttribute("aria-expanded", String(novo !== "recolhido"));
    pega.setAttribute("aria-label", rotuloPega(novo));
    mapa?.invalidateSize({ pan: false });
  }

  function mostrarSeparador(i, { focar = false } = {}) {
    separador = i;
    separadores.forEach((s, k) => {
      s.setAttribute("aria-selected", String(k === i));
      s.tabIndex = k === i ? 0 : -1;
    });
    paineis.forEach((p, k) => { p.hidden = k !== i; });
    corpo.scrollTop = 0;
    if (focar) separadores[i].focus();
    // Os gráficos desenhados com o separador escondido ficaram com tamanho 0.
    if (i === ANALISE) redimensionarGraficos();
  }

  // Escolher um separador com o painel recolhido abre-o a meia altura.
  function escolherSeparador(i, opcoes) {
    mostrarSeparador(i, opcoes);
    if (estado === "recolhido") definirEstado("meio");
  }

  // O separador Análise (e o botão "Ver análise") só com a análise aberta.
  function atualizarAnalise() {
    const pode = !analise.hidden;
    separadores[ANALISE].disabled = !pode;
    verAnalise.hidden = !pode;
    if (!pode && separador === ANALISE) mostrarSeparador(PONTO);
  }

  // Linha do painel recolhido: a classe do ponto, ou a mensagem do painel do
  // ponto (indicação, "a carregar", erro) — o estado fica sempre à vista.
  function atualizarLinha() {
    const ponto = $("ponto");
    const classe = ponto.querySelector(".classe");
    linha.textContent = (classe ?? ponto).textContent.replace(/\s+/g, " ").trim();
  }

  function aplicarArranjo() {
    if (consulta.matches === ativo) return;
    ativo = consulta.matches;
    // Mudar um nó de sítio tira-lhe o foco: guarda-se e repõe-se depois.
    const foco = document.activeElement;
    if (ativo) {
      for (const b of blocos) b.destino.insertBefore(b.no, b.antes);
      raiz.classList.add("movel");
      medir();
      // Com o foco num bloco que foi para o painel, abre-se esse separador.
      const painelDoFoco = paineis.findIndex((p) => p.contains(foco));
      mostrarSeparador(painelDoFoco >= 0 ? painelDoFoco : (analise.hidden ? MAPAS : PONTO));
      definirEstado(painelDoFoco >= 0 ? "meio" : "recolhido");
    } else {
      blocos.forEach((b, k) => marcas[k].after(b.no));
      raiz.classList.remove("movel", "a-arrastar-gaveta");
      delete raiz.dataset.gaveta;
      raiz.style.removeProperty("--gaveta-altura");
      largarEstiloEmLinha();
      mapa?.invalidateSize({ pan: false });
    }
    if (foco && foco !== document.body) {
      // A pega e os separadores desaparecem no computador: o foco vai para o mapa.
      const alvo = !ativo && gaveta.contains(foco) ? $("mapa") : foco;
      if (alvo.isConnected) alvo.focus({ preventScroll: true });
    }
    redimensionarGraficos();
    for (const f of ouvintes) f(ativo);
  }

  // --- Cabeçalho do painel: arrastar (Pointer Events), tocar, teclado --------
  // O arrasto começa na pega, nos separadores ou na linha; até passar o limiar
  // (eArrasto) o gesto é um toque e o browser trata-o como um clique normal.
  function fimDoArrasto() {
    gaveta.classList.remove("gaveta--a-arrastar");
    raiz.classList.remove("a-arrastar-gaveta");
  }

  cabecalho.addEventListener("pointerdown", (ev) => {
    engolirClique = false;
    if (!ativo || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    const h = gaveta.getBoundingClientRect().height;     // a altura à vista, mesmo a meio de uma transição
    arrasto = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, h0: h, moveu: false, amostras: [{ t: ev.timeStamp, altura: h }] };
  });
  cabecalho.addEventListener("pointermove", (ev) => {
    if (!arrasto || ev.pointerId !== arrasto.id) return;
    const dy = arrasto.y0 - ev.clientY;                  // positivo = a subir
    if (!arrasto.moveu) {
      if (!eArrasto(ev.clientX - arrasto.x0, dy)) return;
      arrasto.moveu = true;
      cabecalho.setPointerCapture(ev.pointerId);
      gaveta.classList.add("gaveta--a-arrastar");        // sem transição enquanto segue o dedo
      raiz.classList.add("a-arrastar-gaveta");
    }
    const h = limitarAltura(arrasto.h0 + dy, alturas);
    seguirDedo(h);
    arrasto.amostras.push({ t: ev.timeStamp, altura: h });
    if (arrasto.amostras.length > 30) arrasto.amostras.shift();
  });
  function largar(ev) {
    if (!arrasto || ev.pointerId !== arrasto.id) return;
    const a = arrasto;
    arrasto = null;
    if (!a.moveu) return;                                // um toque: trata-o o "click"
    fimDoArrasto();
    const h = a.amostras.at(-1).altura;
    // A amostra do largar conta: se o dedo parou antes, a velocidade dá 0.
    const v = ev.type === "pointercancel" ? 0 : velocidadeDoArrasto([...a.amostras, { t: ev.timeStamp, altura: h }]);
    engolirClique = ev.type === "pointerup";             // repõe-se no próximo pointerdown
    definirEstado(encaixar(h, v, alturas));
  }
  cabecalho.addEventListener("pointerup", largar);
  cabecalho.addEventListener("pointercancel", largar);
  // O clique que fecha um arrasto não chega à pega nem aos separadores. Os
  // cliques do teclado (detail 0) passam sempre.
  cabecalho.addEventListener("click", (ev) => {
    if (!engolirClique || ev.detail === 0) return;
    engolirClique = false;
    ev.stopPropagation();
    ev.preventDefault();
  }, true);
  pega.addEventListener("click", () => {
    if (ativo) definirEstado(estadoSeguinte(estado));
  });
  pega.addEventListener("keydown", (ev) => {
    const sentido = { ArrowUp: 1, ArrowDown: -1 }[ev.key];
    if (!sentido || !ativo) return;
    ev.preventDefault();
    definirEstado(estadoVizinho(estado, sentido));
  });

  // --- Separadores -------------------------------------------------------------
  separadores.forEach((s, k) => s.addEventListener("click", () => escolherSeparador(k)));
  lista.addEventListener("keydown", (ev) => {
    const atual = separadores.indexOf(ev.target);
    if (atual < 0) return;
    const novo = separadorPorTecla(atual, ev.key, separadores.map((s) => !s.disabled));
    if (novo === null) return;
    ev.preventDefault();
    escolherSeparador(novo, { focar: true });
  });
  verAnalise.addEventListener("click", () => {
    mostrarSeparador(ANALISE, { focar: true });
    definirEstado("cheio");
  });

  new MutationObserver(atualizarAnalise).observe(analise, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(atualizarLinha).observe($("ponto"), { childList: true, subtree: true, characterData: true });
  atualizarAnalise();
  atualizarLinha();

  window.addEventListener("resize", () => {
    if (!ativo || arrasto?.moveu) return;
    medir();
    definirEstado(estado);
  });
  consulta.addEventListener("change", aplicarArranjo);
  aplicarArranjo();

  return {
    ativo: () => ativo,
    usarMapa(m) { mapa = m; },
    aoMudar(f) { ouvintes.push(f); },
    // Margens do fitBounds inicial: no telemóvel, sem o que a barra e o painel tapam.
    margensMapa() {
      return ativo
        ? { paddingTopLeft: [12, barra.offsetHeight + 12], paddingBottomRight: [12, alturas.recolhido + 12] }
        : { padding: [12, 12] };
    },
    // Ponto escolhido: o painel abre a meia altura no separador Ponto e o mapa
    // desloca-se se o ponto ficar tapado pela barra ou pelo painel.
    aoEscolherPonto(lat, lon) {
      if (!ativo) return;
      mostrarSeparador(PONTO);
      definirEstado("meio");
      if (!mapa) return;
      const tamanho = mapa.getSize();
      const area = { topo: barra.offsetHeight, fundo: tamanho.y - alturas.meio, esquerda: 0, direita: tamanho.x };
      const [dx, dy] = deslocamentoParaVisivel(mapa.latLngToContainerPoint([lat, lon]), area);
      if (dx || dy) mapa.panBy([dx, dy], { animate: !reduzirMovimento.matches });
    },
  };
}
