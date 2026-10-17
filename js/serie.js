// Painel "Análise do ponto": séries anuais 1991–2025 da célula clicada
// (dados/series/linha_<j>.json, exportados por scripts/08_series_temporais.py).
// Só índices — nunca classes por ano.
// A linha de referência é a média dos valores anuais 1991–2020 (decisão do
// autor, 16/10/2026): o valor do mapa calcula-se sobre os meses médios e, no
// Ic e no Itc, desvia-se da média dos anos (o mês mais quente/frio muda de
// ano para ano). O valor do mapa aparece no resumo.

const PASTA = "dados/series";
export const ROTULO_REFERENCIA = "Média dos anos 1991–2020";

export function numero(v, casas, sinal = false) {
  const f = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: casas, maximumFractionDigits: casas, signDisplay: sinal ? "exceptZero" : "auto",
  });
  return f.format(v).replace("-", "−");          // sinal de menos tipográfico
}

// Mann–Kendall (calculado no pipeline; o veredicto vem de lá, com o p exato).
// O p mostra-se com 3 casas; perto de 0,05 o arredondamento ("0,050") parece
// contradizer o veredicto, por isso diz-se "p < 0,05" ou "p ≥ 0,05".
export function textoSignificancia({ p, significativa }) {
  const veredicto = significativa ? "significativa" : "não significativa";
  let valor;
  if (p < 0.001) valor = `p < ${numero(0.001, 3)}`;
  else if (significativa && Math.round(p * 1000) >= 50) valor = `p < ${numero(0.05, 2)}`;
  else if (!significativa && Math.round(p * 1000) === 50) valor = `p ≥ ${numero(0.05, 2)}`;
  else valor = `p = ${numero(p, 3)}`;
  return `${veredicto} (${valor})`;
}

// Textos do resumo por baixo do gráfico. `mapa` é null nas variáveis sem mapa (TX, TN).
export function resumo(info, { unidade = "", casas = 1 }) {
  const u = unidade ? ` ${unidade}` : "";
  return {
    significancia: info.tendencia.p === undefined ? null : textoSignificancia(info.tendencia),
    normal: numero(info.normal, casas) + u,
    mapa: info.mapa === undefined ? null : numero(info.mapa, casas) + u,
    tendencia: `${numero(info.tendencia.por_decada, casas, true)}${u} por década`,
    periodos: numero(info.periodos.diferenca, casas, true) + u,
  };
}

// O valor do mapa difere da média dos anos "à vista": mais de uma unidade da
// última casa (1 unidade é arredondamento). Conta-se em unidades inteiras —
// comparar diferenças em vírgula flutuante dava resultados ao acaso
// (2,60 − 2,59 > 0,01, mas 2,36 − 2,35 ≤ 0,01).
export function mapaDifereDaMedia(info, casas) {
  if (info.mapa === undefined) return false;
  return Math.abs(Math.round(info.mapa * 10 ** casas) - Math.round(info.normal * 10 ** casas)) > 1;
}

// Texto alternativo do gráfico (aria-label do canvas).
export function descricaoGrafico(info, variavel, anos, significancia = false) {
  const r = resumo(info, variavel);
  return `${variavel.nome}, ${anos[0]}–${anos.at(-1)}: ${ROTULO_REFERENCIA.toLowerCase()} ${r.normal}; ` +
    `tendência ${r.tendencia}${significancia ? `, ${r.significancia}` : ""}.`;
}

// Os dados por célula vêm divididos por linha j da grelha (id = j × nx + i):
// séries (dados/series) e clima mensal do Walter-Lieth (dados/clima).
export function ficheiroDaLinha(id, nx, pasta = PASTA) {
  return `${pasta}/linha_${Math.floor(id / nx)}.json`;
}

const linhas = new Map();                         // ficheiro → promessa do JSON

export async function carregarCelula(id, nx, pasta = PASTA) {
  const ficheiro = ficheiroDaLinha(id, nx, pasta);
  if (!linhas.has(ficheiro)) {
    linhas.set(ficheiro, fetch(ficheiro).then((r) => {
      if (!r.ok) throw new Error(`não consegui ler ${ficheiro} (${r.status})`);
      return r.json();
    }));
  }
  try {
    const celula = (await linhas.get(ficheiro))[String(id)];
    if (!celula) throw new Error(`a célula ${id} não tem dados`);
    return celula;
  } catch (erro) {
    linhas.delete(ficheiro);                      // permite tentar outra vez
    throw erro;
  }
}

// Reta de Theil–Sen. Com a significância ligada: cheia se o Mann–Kendall a
// dá como significativa, pontilhada e mais fina se não (a referência é tracejada).
function reta(anos, tendencia, cor, significancia) {
  const base = { data: [{ x: anos[0], y: tendencia.inicio }, { x: anos.at(-1), y: tendencia.fim }], borderColor: cor, pointRadius: 0 };
  if (!significancia) return { ...base, label: "Tendência (Theil–Sen)", borderWidth: 2 };
  return tendencia.significativa
    ? { ...base, label: "Tendência (Theil–Sen), significativa", borderWidth: 2 }
    : { ...base, label: "Tendência (Theil–Sen), não significativa", borderWidth: 1.5, borderDash: [2, 3] };
}

// Gráfico (Chart.js): valores anuais, média dos anos 1991–2020 e reta de Theil–Sen.
export function desenharGrafico(Chart, tela, anteriores, anos, info, variavel, cores, significancia = false) {
  if (anteriores) anteriores.destroy();
  const anosNormal = anos.filter((a) => a >= 1991 && a <= 2020);
  const fmt = (v) => numero(v, variavel.casas);
  return new Chart(tela, {
    type: "line",
    data: {
      datasets: [
        { label: variavel.nome, data: anos.map((a, k) => ({ x: a, y: info.anual[k] })),
          borderColor: cores.serie, backgroundColor: cores.serie, borderWidth: 1.5, pointRadius: 2.5 },
        { label: ROTULO_REFERENCIA, data: [{ x: anosNormal[0], y: info.normal }, { x: anosNormal.at(-1), y: info.normal }],
          borderColor: cores.normal, borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 },
        reta(anos, info.tendencia, cores.tendencia, significancia),
      ],
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      parsing: false,
      interaction: { mode: "nearest", intersect: false },
      scales: {
        x: { type: "linear", min: anos[0], max: anos.at(-1),
             // Anos redondos (1995, 2000, …): 1991 colado a 1995 escondia um deles.
             afterBuildTicks: (eixo) => {
               eixo.ticks = [];
               for (let a = Math.ceil(anos[0] / 5) * 5; a <= anos.at(-1); a += 5) eixo.ticks.push({ value: a });
             },
             ticks: { callback: (v) => String(v), color: cores.texto }, grid: { color: cores.grelha } },
        y: { title: { display: Boolean(variavel.unidade), text: variavel.unidade, color: cores.texto },
             ticks: { callback: fmt, color: cores.texto }, grid: { color: cores.grelha } },
      },
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 18, color: cores.texto } },
        tooltip: { callbacks: { title: (c) => String(c[0].parsed.x), label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)}` } },
      },
    },
  });
}
