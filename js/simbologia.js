// Cor de cada célula e entradas da legenda, a partir da definição da camada.

function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// n cores igualmente espaçadas ao longo de uma rampa de paragens.
export function amostrarRampa(paragens, n) {
  if (n === 1) return [paragens[0]];
  const rgb = paragens.map(hexParaRgb);
  return Array.from({ length: n }, (_, k) => {
    const pos = (k / (n - 1)) * (rgb.length - 1);
    const i = Math.min(Math.floor(pos), rgb.length - 2);
    const f = pos - i;
    const c = rgb[i].map((v, j) => Math.round(v + f * (rgb[i + 1][j] - v)));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  });
}

// Cor que o mapa mostra: `hex` com a opacidade das células sobre um fundo
// claro (mapa base claro). A amostra da legenda usa-a já misturada, em vez
// de opacidade CSS — no tema escuro a legenda tem fundo escuro e a cor
// deixaria de corresponder à do mapa.
export function corSobreClaro(hex, opacidade) {
  const c = hexParaRgb(hex).map((v) => Math.round(v * opacidade + 255 * (1 - opacidade)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Índice do intervalo: inferior exclusivo, superior inclusivo; acima do
// último limite → último intervalo (aberto).
export function intervalo(valor, limites) {
  const k = limites.findIndex((lim) => valor <= lim);
  return k === -1 ? limites.length : k;
}

const NUM = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });
const NUM_LIMITE = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 });

// Valor para o painel do ponto: em falta → "—" (Intl.format(null) daria "0").
// `casas`: máximo de casas decimais (1 por omissão).
export function formatarNumero(v, casas = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return casas === 1 ? NUM.format(v) : new Intl.NumberFormat("pt-PT", { maximumFractionDigits: casas }).format(v);
}

// Códigos da legenda que existem nos valores (para esbater os restantes).
export function codigosPresentes(simbologia, valores) {
  const presentes = new Set();
  for (const v of valores) {
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    presentes.add(simbologia.codigo(v));
  }
  return presentes;
}

export function criarSimbologia(camada, metadados) {
  if (camada.tipo === "classes") {
    const nomes = metadados.classes[camada.id];
    return {
      cor: (v) => (v === null || v === undefined ? null : camada.cores[v] ?? null),
      codigo: (v) => v,
      entradas: nomes.map((nome, codigo) => ({ codigo, nome, cor: camada.cores[codigo] })),
    };
  }
  const cores = amostrarRampa(camada.rampa, camada.limites.length + 1);
  const u = camada.unidade ? ` ${camada.unidade}` : "";
  const lim = camada.limites;
  const n = (v) => NUM_LIMITE.format(v);
  const entradas = cores.map((cor, k) => ({
    codigo: k,
    cor,
    nome: k === 0 ? `até ${n(lim[0])}${u}` : k === lim.length ? `mais de ${n(lim[k - 1])}${u}` : `${n(lim[k - 1])} a ${n(lim[k])}${u}`,
  }));
  return {
    cor: (v) => (v === null || v === undefined || Number.isNaN(v) ? null : cores[intervalo(v, lim)]),
    codigo: (v) => intervalo(v, lim),
    entradas,
  };
}
