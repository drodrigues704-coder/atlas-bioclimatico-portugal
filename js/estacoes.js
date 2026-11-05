// Camada "Estações do IPMA": textos da ficha de cada estação a partir de
// dados/estacoes.json (scripts/11_exportar_estacoes.py). Só se mostram as
// comparações que o pipeline calculou (viés = Atlas − IPMA, razão = Atlas /
// IPMA, ombrotipo e macrobioclima do Atlas e se coincidem). Os valores
// observados do IPMA não estão no ficheiro e a app não os mostra diretamente.
//
// Funções puras, testadas em tests/app/estacoes.test.mjs; o desenho dos
// marcadores e da ficha fica no main.js.
import { formatarNumero } from "./simbologia.js";

const MENOS = "−";                       // sinal menos tipográfico
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"]);
const IGUAL = "igual ao IPMA";

// Nomes das fichas do IPMA vêm em maiúsculas: "SÃO PEDRO DE MOEL" → "São Pedro de Moel".
export function nomeProprio(texto) {
  let primeira = true;
  return texto.toLocaleLowerCase("pt-PT").replace(/[^\s/-]+/g, (p) => {
    const fica = !primeira && PARTICULAS.has(p);
    primeira = false;
    return fica ? p : p.charAt(0).toLocaleUpperCase("pt-PT") + p.slice(1);
  });
}

export const rotuloEstacao = (p) => `Estação do IPMA: ${nomeProprio(p.nome)}${p.local ? `, ${p.local}` : ""}`;

const emFalta = (v) => v === null || v === undefined || !Number.isFinite(v);
// Uma casa decimal sempre ("1,0 °C", "3,0 km"): os dados vêm com uma casa.
const UMA_CASA = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Viés de temperatura (°C, Atlas − IPMA) dito por palavras.
export function fraseVies(v) {
  if (emFalta(v)) return "—";
  const valor = UMA_CASA.format(Math.abs(v));
  if (valor === "0,0") return IGUAL;
  return `o Atlas é ${valor} °C mais ${v < 0 ? "frio" : "quente"}`;
}

// Razão de precipitação (Atlas / IPMA) como percentagem a mais ou a menos.
export function percentagemRazao(r) {
  if (emFalta(r) || r <= 0) return "—";
  // Arredonda primeiro a 4 casas: 1,15 − 1 dá 0,1499…, que seria 14 %.
  const pct = Math.round(Math.round((r - 1) * 1e4) / 100);
  if (pct === 0) return IGUAL;
  return `${pct > 0 ? "+" : MENOS}${Math.abs(pct)} %`;
}

const nomeDaClasse = (codigo, nomes) => (Number.isInteger(codigo) && nomes[codigo]) || null;
const N_CLASSES = ["", "uma classe", "duas classes"];

// Ombrotipo do Atlas e o sentido da diferença face ao calculado com as normais
// do IPMA (dif = código do Atlas − código do IPMA; códigos do seco ao húmido).
export function fraseOmbrotipo(codigo, dif, nomes) {
  const nome = nomeDaClasse(codigo, nomes);
  if (!nome) return "—";
  if (emFalta(dif)) return nome;
  if (dif === 0) return `${nome} — coincide com o IPMA`;
  const n = Math.abs(dif);
  const classes = N_CLASSES[n] ?? `${n} classes`;
  return `${nome} — o Atlas é ${dif > 0 ? `mais húmido (${classes} acima)` : `mais seco (${classes} abaixo)`}`;
}

export function fraseMacrobioclima(codigo, igual, nomes) {
  const nome = nomeDaClasse(codigo, nomes);
  if (!nome) return "—";
  if (igual === null || igual === undefined) return nome;
  return `${nome} — ${igual ? "coincide com o" : "difere do"} IPMA`;
}

const metros = (v) => (emFalta(v) ? "—" : `${formatarNumero(v, 0)} m`);
const terminar = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);

// Conteúdo da ficha de uma estação (propriedades de estacoes.json; nomes das
// classes de metadados.json). O main.js transforma-o em DOM.
export function fichaEstacao(p, metadados) {
  const { ombrotipo, macrobioclima } = metadados.classes;
  const linha = (campo, rotulo, valor) => (p[campo] === undefined ? [] : [{ rotulo, valor: valor() }]);
  const avisos = [];
  if (p.serie_curta) avisos.push({ texto: terminar(`Série curta ou alterada: ${p.serie_curta}`), destaque: true });
  if (p.cabo) {
    avisos.push({ texto: "Estação num cabo: a célula do modelo, de ~5,5 km, mistura terra e mar e não representa " +
      "a exposição da ponta do cabo; as diferenças incluem esse efeito.", destaque: false });
  }
  return {
    tipo: `Estação do IPMA n.º ${p.numero}`,
    nome: nomeProprio(p.nome),
    local: p.local || null,
    idCelula: p.id_celula,
    // Na versão pública o ficheiro não traz os campos numéricos: a linha não aparece.
    localizacao: [
      ...linha("alt_estacao", "Altitude da estação", () => metros(p.alt_estacao)),
      ...linha("alt_celula", "Altitude da célula", () => metros(p.alt_celula)),
      ...linha("alt_modelo", "Relevo do modelo", () => metros(p.alt_modelo)),
      ...linha("dist_km", "Distância à célula", () => (emFalta(p.dist_km) ? "—" : `${UMA_CASA.format(p.dist_km)} km`)),
    ],
    comparacao: [
      ...linha("vies_tx", "Máxima média", () => fraseVies(p.vies_tx)),
      ...linha("vies_tn", "Mínima média", () => fraseVies(p.vies_tn)),
      ...linha("vies_t", "Temperatura média", () => fraseVies(p.vies_t)),
      ...linha("razao_p", "Precipitação anual", () => percentagemRazao(p.razao_p)),
      ...linha("razao_p_verao", "Precipitação de verão", () => percentagemRazao(p.razao_p_verao)),
      ...linha("ombrotipo_atlas", "Ombrotipo do Atlas", () => fraseOmbrotipo(p.ombrotipo_atlas, p.ombrotipo_dif, ombrotipo)),
      ...linha("macrobioclima_atlas", "Macrobioclima do Atlas", () => fraseMacrobioclima(p.macrobioclima_atlas, p.macrobioclima_igual, macrobioclima)),
    ],
    avisos,
  };
}

// Notas fixas da ficha (iguais para todas as estações).
export const NOTA_COMPARACAO_PUBLICA = "Ombrotipo e macrobioclima do IPMA calculados com as normais da estação. " +
  "Fonte: IPMA, Normais Climatológicas 1991–2020.";
export const NOTA_ALTITUDE = "Célula: média do terreno. Modelo: a altitude a que a CERRA calcula a temperatura. " +
  "As comparações não corrigem a altitude, tal como os mapas.";
export const NOTA_COMPARACAO = "Normais 1991–2020. Precipitação: o que o Atlas tem a mais (+) ou a menos (−); verão = " +
  "junho a agosto. Ombrotipo e macrobioclima do IPMA calculados com as normais da estação. " +
  "Fonte: IPMA, Normais Climatológicas 1991–2020.";
