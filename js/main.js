// Arranque: carrega os dados, desenha o mapa, liga a escolha de camadas, a
// legenda, o painel do ponto e a janela "Sobre".
import { CAMADAS, CAMADAS_POR_VIR, DADOS, MAPAS_BASE, OPACIDADE_CELULAS, SERIES, VISTA_INICIAL } from "./config.js";
import { celulaEm } from "./geometria.js";
import { carregarCelula, descricaoGrafico, desenharGrafico, mapaDifereDaMedia, numero, ROTULO_REFERENCIA, resumo } from "./serie.js";
import { ajustarAltitude, altitudeEm, desenharWalterLieth, grelhaDeAltitude, resumoClima, tabelaMensal } from "./walter.js";
import { codigosPresentes, corSobreClaro, criarSimbologia, formatarNumero } from "./simbologia.js";
import { descodificar, imagem, pintar } from "./suave.js";

const $ = (id) => document.getElementById(id);
const PASTA_CLIMA = "dados/clima";            // clima mensal por célula: dados/clima/linha_<j>.json
const GRELHA_ALTITUDE = "dados/altitude.bin";  // altitude do DEM (500 m, EPSG:3857) para o ajuste do diagrama
// Contorno da célula escolhida: branco por baixo e escuro por cima, para se
// ver em qualquer mapa base (claro, escuro, satélite).
const DESTAQUE = [
  { fill: false, color: "#ffffff", weight: 4, opacity: 1 },
  { fill: false, color: "#1e2a2f", weight: 2, opacity: 1 },
];
// Ecrã em que o painel de análise fica por baixo do mapa (ver estilo.css).
const ECRA_EM_COLUNA = window.matchMedia("(max-width: 1180px)");
const TEMA_ESCURO = window.matchMedia("(prefers-color-scheme: dark)");

// Pequeno construtor de elementos: o texto entra sempre como texto (nunca HTML).
function el(tag, atributos = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) {
    if (k === "class") e.className = v;
    else if (k === "style") e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  e.append(...filhos.filter((f) => f !== null && f !== undefined));
  return e;
}

function mensagem(texto) {
  $("ponto").replaceChildren(el("p", { class: "vazio" }, texto));
}

async function carregar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`não consegui ler ${url} (${r.status})`);
  return r.json();
}

// As camadas que precisam da precipitação só existem com a classificação exportada.
const disponivel = (c, metadados) => !c.precipitacao || Boolean(metadados.precipitacao);

function desenharEscolha(aoEscolher, inicial, metadados) {
  const lista = $("camadas");
  CAMADAS.forEach((c) => {
    if (!disponivel(c, metadados)) {
      const entrada = el("input", { type: "radio", name: "camada" });
      entrada.disabled = true;
      lista.append(el("label", { class: "camada camada--inativa" }, entrada,
        el("span", { class: "camada__nome" }, c.nome), el("span", { class: "camada__nota" }, "Precisa da precipitação (a descarregar).")));
      return;
    }
    const entrada = el("input", { type: "radio", name: "camada", value: c.id });
    entrada.checked = c === inicial;
    entrada.addEventListener("change", () => aoEscolher(c));
    lista.append(el("label", { class: "camada" }, entrada, el("span", { class: "camada__nome" }, c.nome)));
  });
  for (const c of CAMADAS_POR_VIR) {
    const entrada = el("input", { type: "radio", name: "camada" });
    entrada.disabled = true;
    lista.append(el("label", { class: "camada camada--inativa" }, entrada,
      el("span", { class: "camada__nome" }, c.nome), el("span", { class: "camada__nota" }, c.nota)));
  }
}

// Precipitação ainda de ensaio (não é a normal 1991–2020): texto do aviso, ou null.
function avisoEnsaio(metadados) {
  const p = metadados.precipitacao;
  return p?.ensaio ? `Precipitação provisória: ensaio ${p.periodo}, não é a normal 1991–2020.` : null;
}

function descricao(camada, metadados) {
  const texto = camada.descricao.replace("{temperatura_media}", metadados.decisoes.temperatura_media);
  const aviso = camada.precipitacao ? avisoEnsaio(metadados) : null;
  return aviso ? `${texto} ${aviso}` : texto;
}

// Legenda no canto inferior direito do mapa. Mostra só as classes ou os
// intervalos que existem no mapa escolhido (do valor mais baixo, em cima, ao
// mais alto), com a mesma opacidade das células.
function criarControloLegenda(L) {
  const Controlo = L.Control.extend({
    options: { position: "bottomright" },
    onAdd() {
      this._div = el("div", { class: "legenda-mapa leaflet-control", role: "region", "aria-label": "Legenda" });
      L.DomEvent.disableClickPropagation(this._div);
      L.DomEvent.disableScrollPropagation(this._div);
      return this._div;
    },
    mostrar(camada, simb, presentes, aviso = null) {
      const entradas = simb.entradas.filter((e) => presentes.has(e.codigo));
      const partes = [
        el("h3", {}, camada.nome),
        el("ol", { class: "legenda" }, ...entradas.map((e) =>
          el("li", {}, el("span", { class: "legenda__cor", style: `background:${corSobreClaro(e.cor, OPACIDADE_CELULAS)}` }),
            el("span", {}, e.nome)))),
      ];
      if (camada.tipo === "intervalos") partes.push(el("p", { class: "legenda-mapa__nota" }, "Limite superior incluído em cada intervalo."));
      if (aviso) partes.push(el("p", { class: "legenda-mapa__nota legenda-mapa__nota--ensaio" }, aviso));
      this._div.replaceChildren(...partes);
    },
  });
  return new Controlo();
}

function coordenadas(lat, lon) {
  const g = (v) => Math.abs(v).toFixed(3).replace(".", ",");
  return `${g(lat)}° N, ${g(lon)}° W`;
}

function mostrarPonto(props, lat, lon, metadados) {
  const nomeDe = (k) => (props[k] === null || props[k] === undefined ? "—" : metadados.classes[k][props[k]]);
  const linha = (rotulo, valor, unidade = "", casas = 1) => {
    const texto = formatarNumero(valor, casas);
    return [el("dt", {}, rotulo), el("dd", {}, texto === "—" ? texto : texto + unidade)];
  };
  const classe = (rotulo, k) => [el("dt", {}, rotulo), el("dd", {}, nomeDe(k))];
  const comClassificacao = Boolean(metadados.precipitacao);
  const variante = comClassificacao && props.variante != null && nomeDe("variante") !== "nenhuma"
    ? nomeDe("variante") : null;
  $("ponto").replaceChildren(...[
    // título: o bioclima (com a variante) quando há classificação; senão, a continentalidade
    el("p", { class: "classe" }, comClassificacao
      ? `${nomeDe("bioclima")}${variante ? `, variante ${variante}` : ""}` : nomeDe("continentalidade")),
    el("dl", {},
      ...(comClassificacao ? [
        ...classe("Macrobioclima", "macrobioclima"),
        ...classe("Termotipo", "termotipo_h"),
        ...classe("Ombrotipo", "ombrotipo_h"),
        ...linha("Índice ombrotérmico (Io)", props.Io, "", 2),
        ...classe("Köppen-Geiger", "koppen"),
      ] : []),
      ...classe("Continentalidade", "continentalidade"),
      ...linha("Temperatura média (T)", props.T, " °C"),
      ...linha("Termicidade compensada (Itc)", props.Itc),
      ...linha("Termicidade (It)", props.It),
      ...linha("Temperatura positiva (Tp)", props.Tp),
      ...linha("Continentalidade (Ic)", props.Ic, " °C", 2),
      el("dt", {}, "Coordenadas"), el("dd", {}, coordenadas(lat, lon))),
    props.vizinha ? el("p", { class: "aviso" },
      "Célula costeira: o modelo vê aqui sobretudo mar, por isso mostra-se o valor da célula de terra mais próxima.") : null,
    comClassificacao
      ? (avisoEnsaio(metadados) ? el("p", { class: "aviso aviso--ensaio" }, `Classificação com ${avisoEnsaio(metadados).toLowerCase()}`) : null)
      : el("p", { class: "aviso" }, "Termotipo e ombrotipo aparecem quando a normal de precipitação estiver calculada."),
  ].filter(Boolean));     // os avisos só existem quando se aplicam
}

// --- Diagrama de Walter-Lieth (no painel "Análise do ponto") ----------------
// `metaClima` é null se dados/clima.json não carregou: o diagrama diz porquê
// e o resto funciona. Devolve mostrar(id) — a célula escolhida.
function criarDiagrama(metaClima) {
  const tela = $("grafico-walter");
  let clima = null;             // clima mostrado: o da célula, ajustado à altitude do ponto se houver
  let grelhaAltitude = null;    // promessa da grelha de altitude (descarrega-se uma vez, ao 1.º uso)
  let grafico = null;
  let pedido = 0;
  const estado = (texto) => { $("walter-estado").textContent = texto; };

  function cores() {
    const css = getComputedStyle(document.documentElement);
    const v = (nome) => css.getPropertyValue(nome).trim();
    return { t: v("--wl-t"), p: v("--wl-p"), seco: v("--wl-seco"), humido: v("--wl-humido"),
             superhumido: v("--wl-superhumido"), geada: v("--wl-geada"), texto: v("--tinta-suave"), grelha: v("--linha") };
  }

  function limpar() {
    clima = null;
    grafico?.destroy();
    grafico = null;
    tela.setAttribute("aria-label", "Diagrama de Walter-Lieth");
    $("walter-resumo").replaceChildren();
    $("walter-tabela").replaceChildren();
  }

  // Altitude do ponto (m) ou null (fora de Portugal no DEM, ou a grelha não carregou).
  async function altitudeDoPonto(lat, lon) {
    const meta = metaClima.altitude_grelha;
    if (!meta) return null;
    grelhaAltitude ??= fetch(GRELHA_ALTITUDE).then((r) => {
      if (!r.ok) throw new Error(`não consegui ler ${GRELHA_ALTITUDE} (${r.status})`);
      return r.arrayBuffer();
    }).then((b) => grelhaDeAltitude(b, meta));
    try {
      return altitudeEm(lat, lon, meta, await grelhaAltitude);
    } catch (erro) {
      console.error(erro);
      grelhaAltitude = null;                             // permite tentar outra vez
      return null;
    }
  }

  function desenhar() {
    const r = resumoClima(clima);
    const linha = (rotulo, valor) => [el("dt", {}, rotulo), el("dd", {}, valor)];
    const ajustado = clima.altCelula !== undefined;
    $("walter-resumo").replaceChildren(
      ...linha(ajustado ? "Temperatura média anual (ajustada)" : "Temperatura média anual", r.tAnual),
      ...linha("Precipitação anual", r.pAnual),
      ...linha("Meses secos (P < 2T)", r.secos),
      ...linha("Geada (mínima média < 0 °C)", r.geada),
      ...linha("Máxima média do mês mais quente", r.txQuente),
      ...linha("Mínima média do mês mais frio", r.tnFrio),
      ...(ajustado
        ? [...linha("Altitude do ponto (DEM)", r.altitude),
           ...linha("Altitude média da célula", `${numero(clima.altCelula, 0)} m`),
           ...linha("Relevo do modelo na célula", `${numero(clima.altModelo, 0)} m`),
           ...linha("Ajuste das temperaturas", `${numero(clima.ajuste, 1, true)} °C`)]
        : linha("Altitude média da célula", r.altitude)));
    const nota = $("walter-altitude");
    nota.textContent = ajustado
      ? `Temperaturas levadas do relevo do modelo (a altitude a que foram calculadas) à do ponto com ${numero(metaClima.gradiente, 2)} °C por 100 m; a precipitação é a da célula.` +
        (clima.vale ? " Atenção: o ponto fica abaixo da célula, num vale — as noites frias dos fundos de vale (inversões, lagos de ar frio) não estão representadas e as mínimas podem ser bem mais baixas." : "")
      : "Sem a altitude deste ponto: mostram-se os valores da célula, sem ajuste.";
    nota.classList.toggle("aviso--ensaio", Boolean(clima.vale));
    $("walter-tabela").replaceChildren(...tabelaMensal(clima).map((m) =>
      el("tr", {}, el("th", { scope: "row" }, m.mes), el("td", {}, m.t), el("td", {}, m.tx), el("td", {}, m.tn),
         el("td", {}, m.p), el("td", {}, m.seco))));
    if (!window.Chart) {
      estado("O diagrama não carregou (biblioteca Chart.js indisponível); os valores estão abaixo.");
      return;
    }
    estado("");
    grafico = desenharWalterLieth(window.Chart, tela, grafico, clima, cores());
    tela.setAttribute("aria-label", `Diagrama de Walter-Lieth: temperatura média anual ${r.tAnual}, ` +
      `precipitação anual ${r.pAnual}; meses secos: ${r.secos}; geada: ${r.geada}.`);
  }

  if (metaClima?.ensaio_p) {
    const nota = $("walter-ensaio");
    nota.hidden = false;
    nota.textContent = `Precipitação provisória: ensaio ${metaClima.periodo_p}, não é a normal 1991–2020 ` +
      "(a CERRA-Land ainda está a ser descarregada).";
  }
  TEMA_ESCURO.addEventListener("change", () => { if (clima) desenhar(); });

  return async function mostrar(id, lat, lon) {
    const este = ++pedido;
    limpar();
    if (!metaClima) {
      estado("O diagrama não está disponível (não foi possível ler dados/clima.json).");
      return;
    }
    estado("A carregar o diagrama…");
    try {
      const [c, alt] = await Promise.all([carregarCelula(id, metaClima.nx, PASTA_CLIMA), altitudeDoPonto(lat, lon)]);
      if (este !== pedido) return;                       // entretanto clicou-se noutra célula
      clima = ajustarAltitude(c, alt, metaClima.gradiente);
      desenhar();
    } catch (erro) {
      if (este === pedido) estado(`Não foi possível carregar o diagrama: ${erro.message}.`);
    }
  };
}

// --- Painel esquerdo "Análise do ponto" ---------------------------------------
// `metaSeries` é null se dados/series.json não carregou: o painel abre só
// com essa mensagem e o resto do Atlas funciona.
function criarAnalise(mapa, metaSeries, mostrarDiagrama) {
  const painel = $("analise");
  const tela = $("grafico-serie");
  let variavel = SERIES[0];
  let celula = null;            // série da célula escolhida (null enquanto carrega ou se falhou)
  let grafico = null;
  let pedido = 0;
  let significancia = false;    // botão "Significância": mantém-se ao mudar de variável ou de célula

  function cores() {
    const css = getComputedStyle(document.documentElement);
    const v = (nome) => css.getPropertyValue(nome).trim();
    return { serie: v("--ativo"), normal: v("--tinta-suave"), tendencia: v("--tendencia"), texto: v("--tinta-suave"), grelha: v("--linha") };
  }

  function estado(texto) {
    $("series-estado").textContent = texto;
  }

  // Sem série: nada da célula anterior pode ficar à vista.
  function limpar() {
    celula = null;
    grafico?.destroy();
    grafico = null;
    tela.setAttribute("aria-label", "Gráfico da série anual");
    $("series-resumo").replaceChildren();
    $("series-nota-mapa").hidden = true;
  }

  function mostrarSerie() {
    const info = celula.variaveis[variavel.id];
    const r = resumo(info, variavel);
    $("series-resumo").replaceChildren(
      el("dt", {}, ROTULO_REFERENCIA), el("dd", {}, r.normal),
      ...(r.mapa === null ? [] : [el("dt", {}, "Valor do mapa"), el("dd", {}, r.mapa)]),
      el("dt", {}, "Tendência (Theil–Sen)"), el("dd", {}, r.tendencia),
      ...(significancia && r.significancia ? [el("dt", {}, "Mann–Kendall"), el("dd", {}, r.significancia)] : []),
      el("dt", {}, "2011–2025 vs 1991–2005"), el("dd", {}, r.periodos));
    // A nota só quando os dois valores diferem à vista (Ic e Itc; na T e na Tp coincidem).
    $("series-nota-mapa").hidden = !mapaDifereDaMedia(info, variavel.casas);
    if (!window.Chart) {
      estado("O gráfico não carregou (biblioteca Chart.js indisponível); os valores estão abaixo.");
      return;
    }
    estado("");
    grafico = desenharGrafico(window.Chart, tela, grafico, metaSeries.anos, info, variavel, cores(), significancia);
    tela.setAttribute("aria-label", descricaoGrafico(info, variavel, metaSeries.anos, significancia));
  }

  // Escolha da variável (uma de cada vez).
  SERIES.forEach((s, k) => {
    const entrada = el("input", { type: "radio", name: "serie", value: s.id });
    entrada.checked = k === 0;
    entrada.addEventListener("change", () => { variavel = s; if (celula) mostrarSerie(); });
    $("series-escolha").append(el("label", {}, entrada, s.nome));
  });
  const botaoSig = $("botao-significancia");
  botaoSig.addEventListener("click", () => {
    significancia = !significancia;
    botaoSig.setAttribute("aria-pressed", String(significancia));
    if (celula) mostrarSerie();
  });
  // As cores do gráfico vêm do tema: redesenhar quando o tema muda.
  TEMA_ESCURO.addEventListener("change", () => { if (celula) mostrarSerie(); });

  $("fechar-analise").addEventListener("click", () => {
    painel.hidden = true;
    mapa.invalidateSize();
    $("mapa").focus();                                   // o foco não se perde com o painel
  });

  return async function abrir(props, lat, lon) {
    const este = ++pedido;
    const estava = !painel.hidden;
    painel.hidden = false;
    if (!estava) {
      // O mapa muda de tamanho (e, em ecrãs médios, de arranjo): manter a
      // célula escolhida à vista em vez do centro antigo.
      mapa.invalidateSize({ pan: false });
      mapa.panTo([lat, lon], { animate: false });
    }
    $("analise-local").textContent = `Célula em ${coordenadas(lat, lon)} (~5,5 km).`;
    const aviso = $("analise-aviso");
    aviso.hidden = !props.vizinha;
    aviso.textContent = "Célula costeira: as séries e o diagrama são os da célula de terra mais próxima.";
    limpar();
    mostrarDiagrama(props.id, lat, lon);                 // em paralelo com a série
    // No ecrã em coluna o painel fica por baixo do mapa: levá-lo à vista.
    const levarAVista = () => { if (ECRA_EM_COLUNA.matches) $("t-analise").scrollIntoView({ behavior: "smooth", block: "start" }); };
    if (!metaSeries) {
      estado("As séries anuais não estão disponíveis (não foi possível ler dados/series.json).");
      levarAVista();
      return;
    }
    estado("A carregar a série…");
    try {
      const c = await carregarCelula(props.id, metaSeries.nx);
      if (este !== pedido) return;                       // entretanto clicou-se noutra célula
      celula = c;
      mostrarSerie();
    } catch (erro) {
      if (este === pedido) estado(`Não foi possível carregar a série: ${erro.message}.`);
    }
    levarAVista();
  };
}

function ligarSobre() {
  const dialogo = $("sobre");
  $("abrir-sobre").addEventListener("click", () => dialogo.showModal());
  $("fechar-sobre").addEventListener("click", () => dialogo.close());
  // Clicar no fundo escurecido também fecha (pela posição: a margem interior
  // da janela também tem o próprio diálogo como alvo do clique).
  dialogo.addEventListener("click", (ev) => {
    const r = dialogo.getBoundingClientRect();
    const fora = ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom;
    if (ev.target === dialogo && fora) dialogo.close();
  });
  // Ligação direta: …/#sobre abre esta janela.
  if (location.hash === "#sobre") dialogo.showModal();
}

async function iniciar() {
  ligarSobre();
  const L = window.L;
  if (!L) throw new Error("a biblioteca de mapas (Leaflet) não carregou — verifique a ligação à internet");
  mensagem("A carregar os dados…");

  const mapa = L.map("mapa", { zoomControl: true, minZoom: 6, maxZoom: 12, keyboard: true })
    .setView(VISTA_INICIAL.centro, VISTA_INICIAL.zoom);
  const bases = Object.fromEntries(MAPAS_BASE.map((b) =>
    [b.nome, L.tileLayer(b.url, { attribution: b.atribuicao, maxZoom: 16 })]));
  // ?base=Escuro (ou Satélite) abre com esse mapa base.
  const pedida = new URLSearchParams(location.search).get("base");
  (bases[pedida] ?? bases[MAPAS_BASE[0].nome]).addTo(mapa);
  L.control.layers(bases, null, { position: "topright" }).addTo(mapa);

  // A opacidade aplica-se ao "painel" das células como um todo (CSS), não a
  // cada célula: assim as bordas vizinhas não se somam numa rede mais escura.
  mapa.createPane("celulas").style.opacity = OPACIDADE_CELULAS;
  mapa.createPane("cliques").style.zIndex = 420;     // células invisíveis, só para o clique
  mapa.createPane("destaque").style.zIndex = 450;
  const legenda = criarControloLegenda(L).addTo(mapa);
  // As séries são secundárias: se faltarem, o Atlas abre na mesma.
  const secundario = (url) => carregar(url).catch((erro) => { console.error(erro); return null; });
  const [celulas, metadados, suave, metaSeries, metaClima] = await Promise.all(
    [carregar(DADOS.celulas), carregar(DADOS.metadados), carregar(DADOS.suave),
     secundario(DADOS.series), secundario(DADOS.clima)]);
  const abrirAnalise = criarAnalise(mapa, metaSeries, criarDiagrama(metaClima));

  let simb;
  const camadaGeo = L.geoJSON(celulas, { pane: "cliques", style: () => ({}) }).addTo(mapa);
  let imagemSuave = null;                // L.imageOverlay do mapa suave em vista
  let pedidoAtual = 0;                   // evita que uma camada lenta substitua a seguinte
  const grelhas = new Map();             // camada → valores já descodificados

  async function grelhaSuave(id) {
    if (!suave.camadas[id]) return null;
    if (!grelhas.has(id)) {
      const r = await fetch(`dados/suave/${id}.bin`);
      if (!r.ok) throw new Error(`não consegui ler o mapa suave de ${id} (${r.status})`);
      grelhas.set(id, descodificar(await r.arrayBuffer(), suave.camadas[id]));
    }
    return grelhas.get(id);
  }
  const contorno = L.layerGroup().addTo(mapa);    // contorno da célula escolhida

  function escolher(feature, lat, lon) {
    contorno.clearLayers();
    for (const estilo of DESTAQUE) contorno.addLayer(L.geoJSON(feature, { pane: "destaque", style: estilo, interactive: false }));
    mostrarPonto(feature.properties, lat, lon, metadados);
    abrirAnalise(feature.properties, lat, lon);
  }

  camadaGeo.on("click", (ev) => escolher(ev.layer.feature, ev.latlng.lat, ev.latlng.lng));

  // Teclado: com o foco no mapa, Enter ou Espaço escolhe a célula do centro
  // (marcada pela mira); as setas deslocam o mapa (Leaflet).
  mapa.getContainer().addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    const c = mapa.getCenter();
    const f = celulaEm(c.lat, c.lng, celulas.features);
    if (f) escolher(f, c.lat, c.lng);
    else mensagem("O centro do mapa não está sobre Portugal. Desloque o mapa com as setas.");
  });

  async function aplicar(camada) {
    const pedido = ++pedidoAtual;
    simb = criarSimbologia(camada, metadados);
    const valores = await grelhaSuave(camada.id);
    if (pedido !== pedidoAtual) return;               // entretanto escolheu-se outra camada
    if (imagemSuave) mapa.removeLayer(imagemSuave);
    imagemSuave = null;
    if (valores) {
      // Mapa suave por baixo; células invisíveis por cima (só para o clique).
      const url = imagem(pintar(valores, simb.cor), suave.largura, suave.altura);
      imagemSuave = L.imageOverlay(url, suave.limites, { pane: "celulas", interactive: false }).addTo(mapa);
      camadaGeo.options.style = () => ({ fillColor: "#000", fillOpacity: 0, stroke: false });
    } else {
      // Recurso, se uma camada não tiver mapa suave: pintam-se as próprias
      // células com a opacidade das células.
      camadaGeo.options.style = (f) => {
        const cor = simb.cor(f.properties[camada.id]);
        return cor ? { fillColor: cor, fillOpacity: OPACIDADE_CELULAS, stroke: false } : { fillOpacity: 0, stroke: false };
      };
    }
    camadaGeo.resetStyle();
    $("camada-descricao").textContent = descricao(camada, metadados);
    // Legenda com as classes que se veem: as do mapa suave quando existe (a
    // interpolação pode não chegar a uma classe que só uma célula tem).
    const vistos = valores ?? celulas.features.map((f) => f.properties[camada.id]);
    legenda.mostrar(camada, simb, codigosPresentes(simb, vistos),
                    camada.precipitacao ? avisoEnsaio(metadados) : null);
  }

  // ?camada=Itc (por exemplo) abre com esse mapa.
  const pedidaCamada = CAMADAS.find((c) => c.id === new URLSearchParams(location.search).get("camada"));
  const inicial = pedidaCamada && disponivel(pedidaCamada, metadados) ? pedidaCamada : CAMADAS[0];
  const escolherCamada = (c) => aplicar(c).catch((erro) => mensagem(`Não foi possível mostrar este mapa: ${erro.message}.`));
  desenharEscolha(escolherCamada, inicial, metadados);
  await aplicar(inicial);
  mapa.fitBounds(camadaGeo.getBounds(), { padding: [12, 12] });
  mensagem("Clique no mapa para ver os índices desse lugar. Com o teclado: foque o mapa, desloque-o com as setas e carregue em Enter.");

  // ?ponto=41.23,-8.68 abre já com esse lugar escolhido.
  const ponto = new URLSearchParams(location.search).get("ponto")?.split(",").map(Number);
  if (ponto?.length === 2 && ponto.every(Number.isFinite)) {
    const f = celulaEm(ponto[0], ponto[1], celulas.features);
    if (f) escolher(f, ponto[0], ponto[1]);
  }
}

iniciar().catch((erro) => {
  mensagem(`Não foi possível abrir o Atlas: ${erro.message}. Se abriu o ficheiro diretamente do disco, use um servidor local (ver o README).`);
  console.error(erro);
});
