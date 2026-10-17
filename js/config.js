// Camadas e simbologia. Os valores e os nomes das classes vêm dos dados
// exportados pelo pipeline (dados/celulas.geojson, dados/metadados.json);
// aqui só se decide como se mostram.

export const DADOS = {
  celulas: "dados/celulas.geojson",
  metadados: "dados/metadados.json",
  suave: "dados/suave.json",            // grelhas suaves: dados/suave/<camada>.bin
  series: "dados/series.json",          // séries anuais: dados/series/linha_<j>.json
  clima: "dados/clima.json",            // Walter-Lieth: dados/clima/linha_<j>.json
};

export const VISTA_INICIAL = { centro: [39.6, -8.0], zoom: 7 };

// Mapas base (Esri, sem chave). O primeiro é o que abre.
const ESRI = "https://services.arcgisonline.com/ArcGIS/rest/services";
export const MAPAS_BASE = [
  {
    nome: "Claro",
    url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    atribuicao: "Base: Esri, HERE, Garmin, © contribuidores do OpenStreetMap",
  },
  {
    nome: "Escuro",
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    atribuicao: "Base: Esri, HERE, Garmin, © contribuidores do OpenStreetMap",
  },
  {
    nome: "Satélite",
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    atribuicao: "Base: Esri, Maxar, Earthstar Geographics e a comunidade de utilizadores SIG",
  },
];

// Opacidade da camada das células (o mapa base vê-se por baixo).
export const OPACIDADE_CELULAS = 0.6;

// Do oceânico (azul) ao continental (ocre), passando por verde. Cores fixas
// por classe; nenhuma tão clara que se confunda com o fundo do mapa base.
const RAMPA_CONTINENTALIDADE = [
  "#0b3a5c", "#1d5f8a", "#2f86a6", "#6db3b5", "#9ccb86",
  "#e3c062", "#cf8a3f", "#a35a26", "#6b3618",
];
// Ic contínuo: rampa própria (violeta), para nenhuma cor querer dizer uma
// classe de continentalidade diferente da do mapa das classes.
const RAMPA_IC = ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f", "#3b0f70"];
// Do frio (azul) ao quente (vermelho).
const RAMPA_TERMICA = ["#2c4f86", "#4f7fb3", "#8fb6d3", "#d7e3c8", "#f1d38a", "#e59a52", "#c4552f", "#8e2a1f"];

// tipo "classes": código inteiro → cor; tipo "intervalos": limites superiores
// (o último é aberto) — inferior exclusivo, superior inclusivo.
export const CAMADAS = [
  {
    id: "continentalidade",
    nome: "Continentalidade",
    tipo: "classes",
    descricao: "Classe pelo índice de continentalidade simples (Ic).",
    cores: RAMPA_CONTINENTALIDADE,
  },
  {
    id: "Ic",
    nome: "Índice de continentalidade (Ic)",
    tipo: "intervalos",
    unidade: "°C",
    descricao: "Diferença entre a temperatura média do mês mais quente e a do mais frio.",
    limites: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    rampa: RAMPA_IC,
  },
  {
    id: "Itc",
    nome: "Índice de termicidade compensado (Itc)",
    tipo: "intervalos",
    descricao: "10 × (T + M + m), compensado pela continentalidade. M e m: médias das máximas e das mínimas do mês mais frio.",
    limites: [150, 190, 220, 250, 285, 320, 350, 375, 400, 425, 450],
    rampa: RAMPA_TERMICA,
  },
  {
    id: "Tp",
    nome: "Temperatura positiva anual (Tp)",
    tipo: "intervalos",
    unidade: "décimas de °C",
    descricao: "Soma das temperaturas médias dos meses acima de 0 °C, em décimas de grau.",
    limites: [1000, 1200, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200],
    rampa: RAMPA_TERMICA,
  },
  {
    id: "T",
    nome: "Temperatura média anual (T)",
    tipo: "intervalos",
    unidade: "°C",
    // {temperatura_media} vem de metadados.json (decisão do pipeline).
    descricao: "Média anual da temperatura média mensal, calculada como {temperatura_media}.",
    limites: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    rampa: RAMPA_TERMICA,
  },
  // --- Precisam da precipitação (precipitacao: true): inativas sem a
  // classificação exportada; marcadas como ensaio enquanto não houver a normal.
  {
    id: "macrobioclima",
    nome: "Macrobioclima",
    tipo: "classes",
    precipitacao: true,
    descricao: "Mediterrânico ou Temperado: Temperado quando o verão não tem secura (Ios2 > 2) ou a compensa (Tabela 6 de Rivas-Martínez et al. 2011).",
    cores: ["#d9a441", "#3f8f5f"],
  },
  {
    id: "termotipo",
    nome: "Termotipos",
    tipo: "classes",
    precipitacao: true,
    descricao: "Andares térmicos pelo índice de termicidade compensado (Itc) ou, quando Ic ≥ 21 ou Itc < 120, pela temperatura positiva (Tp). O horizonte (inferior/superior) aparece ao clicar.",
    // Mediterrânico (quente → frio): vermelhos e amarelos, depois lilases;
    // Temperado: verdes e azuis. Pela ordem de metadados.classes.termotipo.
    cores: ["#7f1d14", "#c4552f", "#e8964a", "#f2cf73", "#b8a5d1", "#8a77b5", "#5b4a8c",
            "#1e6b46", "#2f8f5b", "#74b47c", "#b3d69a", "#6f9cc7", "#3f6fa3", "#24467a"],
  },
  {
    id: "ombrotipo",
    nome: "Ombrotipos",
    tipo: "classes",
    precipitacao: true,
    descricao: "Pelo índice ombrotérmico anual Io = 10 × (precipitação dos meses com T > 0 °C) / Tp. O horizonte aparece ao clicar.",
    cores: ["#6b3010", "#94481b", "#c0712c", "#e0a552", "#eed38c", "#a6cf8a", "#4c9f78", "#2b7aa6", "#1b4886"],
  },
  {
    id: "bioclima",
    nome: "Bioclimas",
    tipo: "classes",
    precipitacao: true,
    descricao: "Mediterrânicos pelo Io e pela continentalidade (Ic 21); temperados: xérico se Io ≤ 3,6, senão hiperoceânico (Ic ≤ 11), oceânico ou continental (Ic > 21).",
    cores: ["#e2a24a", "#cc6a2b", "#9f421e", "#682313", "#c6ad57", "#a4822a", "#7a5819", "#4c3210",
            "#2b7aa6", "#3f9a73", "#86bd68", "#b7c66a"],
  },
  {
    id: "Io",
    nome: "Índice ombrotérmico (Io)",
    tipo: "intervalos",
    precipitacao: true,
    descricao: "10 × precipitação dos meses com temperatura média acima de 0 °C, dividida pela temperatura positiva (Tp). Limites dos ombrotipos: 2,0 seco, 3,6 sub-húmido, 6,0 húmido, 12 hiper-húmido.",
    limites: [1, 2, 3.6, 4.8, 6, 9, 12, 18, 24],
    rampa: ["#94481b", "#e0a552", "#eed38c", "#a6cf8a", "#4c9f78", "#2b7aa6", "#1b4886"],
  },
  {
    id: "koppen",
    nome: "Köppen-Geiger",
    tipo: "classes",
    precipitacao: true,
    descricao: "Classificação climática de Köppen-Geiger (Peel, Finlayson & McMahon 2007), como complemento: Csa/Csb — verão seco, quente ou temperado; Cfb — sem estação seca; BSk — estepe fria.",
    // Cores-padrão dos mapas de Köppen-Geiger (Beck et al. 2018), pela ordem de bioclima.koppen.KOPPEN.
    cores: ["#0000ff", "#0078ff", "#46aafa", "#ff0000", "#ff9696", "#f5a500", "#ffdc64",
            "#ffff00", "#c8c800", "#969600", "#96ff96", "#64c864", "#329632", "#c8ff50", "#64ff50", "#32c800",
            "#ff00ff", "#c800c8", "#963296", "#966496", "#aaafff", "#5a78dc", "#4b50b4", "#320087",
            "#00ffff", "#37c8ff", "#007d7d", "#00465f", "#b2b2b2", "#666666"],
  },
];

// Séries anuais do painel "Análise do ponto" (só índices; nunca classes por ano).
export const SERIES = [
  { id: "T", nome: "Temperatura média", unidade: "°C", casas: 2 },
  { id: "TX", nome: "Média das máximas", unidade: "°C", casas: 2 },
  { id: "TN", nome: "Média das mínimas", unidade: "°C", casas: 2 },
  { id: "Itc", nome: "Termicidade compensada (Itc)", unidade: "", casas: 1 },
  { id: "Tp", nome: "Temperatura positiva (Tp)", unidade: "décimas de °C", casas: 0 },
  { id: "Ic", nome: "Continentalidade (Ic)", unidade: "°C", casas: 2 },
  { id: "P", nome: "Precipitação anual", unidade: "mm", casas: 0 },
  { id: "Io", nome: "Índice ombrotérmico (Io)", unidade: "", casas: 2 },
];

// Mostram-se desde já, inativas, para se ver o que o Atlas vai ter.
export const CAMADAS_POR_VIR = [];
