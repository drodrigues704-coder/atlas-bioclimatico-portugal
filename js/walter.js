// Diagrama ombrotérmico de Walter & Lieth (1960) da célula clicada
// (dados/clima/linha_<j>.json, exportados por scripts/09_exportar_clima_app.py).
//
// Convenção: temperatura à esquerda e precipitação à direita com
// 10 °C = 20 mm (P = 2T); acima de 100 mm a escala da P comprime-se 10×
// (10 °C = 200 mm) e essa parte pinta-se escura (superhúmido). Período seco
// onde P < 2T (a curva da P fica abaixo da da T), húmido onde fica acima.
// Geada segura: meses com a mínima média abaixo de 0 °C (faixa sob o eixo).
// Temperaturas da célula (~5,5 km) levadas à altitude do ponto clicado
// (ajustarAltitude, abaixo); precipitação da célula.
import { numero } from "./serie.js";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const LIMITE_MM = 100;            // a partir daqui a escala comprime-se
const FATOR_ACIMA = 10;           // 10× mais comprimida acima de 100 mm

// mm → unidades do eixo das temperaturas (°C).
export function escalaP(mm) {
  return mm <= LIMITE_MM ? mm / 2 : LIMITE_MM / 2 + (mm - LIMITE_MM) / (2 * FATOR_ACIMA);
}

// Inverso (para os rótulos do eixo da direita).
export function mmDaEscala(y) {
  return y <= LIMITE_MM / 2 ? y * 2 : LIMITE_MM + (y - LIMITE_MM / 2) * 2 * FATOR_ACIMA;
}

export const mesesSecos = (t, p) => t.map((_, k) => k).filter((k) => p[k] < 2 * t[k]);
export const mesesComGeada = (tn) => tn.map((_, k) => k).filter((k) => tn[k] < 0);

// [5, 6, 7, 8] → "jun–set"; os intervalos podem passar de dezembro para janeiro.
export function textoMeses(meses) {
  if (meses.length === 0) return "nenhum";
  if (meses.length === 12) return "todo o ano";
  const tem = new Set(meses);
  const partes = [];
  for (let m = 0; m < 12; m++) {
    if (!tem.has(m) || tem.has((m + 11) % 12)) continue;      // não é início de intervalo
    let fim = m;
    while (tem.has((fim + 1) % 12)) fim = (fim + 1) % 12;
    partes.push(fim === m ? MESES[m] : `${MESES[m]}–${MESES[fim]}`);
  }
  return partes.join(", ");
}

// Textos do resumo do diagrama. T e P anuais vêm exportadas (T = a do mapa):
// a app não as recalcula a partir dos meses arredondados.
export function resumoClima(d) {
  return {
    tAnual: `${numero(d.T, 1)} °C`,
    pAnual: `${numero(d.P, 0)} mm`,
    txQuente: `${numero(Math.max(...d.tx), 1)} °C`,
    tnFrio: `${numero(Math.min(...d.tn), 1)} °C`,
    altitude: `${numero(d.alt, 0)} m`,
    secos: textoMeses(mesesSecos(d.t, d.p)),
    geada: textoMeses(mesesComGeada(d.tn)),
  };
}

// Os 12 meses em texto (tabela para quem não vê o gráfico).
export function tabelaMensal(d) {
  const secos = new Set(mesesSecos(d.t, d.p));
  return MESES.map((mes, k) => ({
    mes, t: numero(d.t[k], 1), tx: numero(d.tx[k], 1), tn: numero(d.tn[k], 1), p: numero(d.p[k], 0),
    seco: secos.has(k) ? "seco" : "",
  }));
}

// Faixa de geada sob o eixo dos meses (plugin do Chart.js).
function faixaDeGeada(meses, cor) {
  return {
    id: "geada",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      ctx.save();
      ctx.fillStyle = cor;
      for (const m of meses) {
        const x0 = scales.x.getPixelForValue(m - 0.5), x1 = scales.x.getPixelForValue(m + 0.5);
        ctx.fillRect(Math.max(x0, chartArea.left), chartArea.bottom + 2, Math.min(x1, chartArea.right) - Math.max(x0, chartArea.left), 5);
      }
      ctx.restore();
    },
  };
}

export function desenharWalterLieth(Chart, tela, anterior, d, cores) {
  if (anterior) anterior.destroy();
  const pe = d.p.map(escalaP);
  const pontos = (v) => v.map((y, k) => ({ x: k, y }));
  const datasets = [
    { label: "Temperatura (°C)", data: pontos(d.t), borderColor: cores.t, backgroundColor: cores.t,
      borderWidth: 2, pointRadius: 2, fill: false },
    // área entre as curvas: acima da T = húmido; abaixo = seco
    { label: "Precipitação (mm)", data: pontos(pe), borderColor: cores.p, backgroundColor: cores.p,
      borderWidth: 2, pointRadius: 2, fill: { target: 0, above: cores.humido, below: cores.seco } },
  ];
  if (d.p.some((x) => x > LIMITE_MM)) {
    datasets.push({ label: "Superhúmido (> 100 mm)", data: pontos(pe), borderWidth: 0, pointRadius: 0,
      backgroundColor: cores.superhumido, fill: { value: LIMITE_MM / 2, above: cores.superhumido, below: "transparent" } });
  }
  const minimo = Math.min(0, Math.floor(Math.min(...d.t) / 10) * 10);
  const maximo = Math.max(40, Math.ceil(Math.max(...d.t, ...pe) / 10) * 10);
  const eixo = { min: minimo, max: maximo, grid: { color: cores.grelha } };
  return new Chart(tela, {
    type: "line",
    data: { datasets },
    plugins: [faixaDeGeada(mesesComGeada(d.tn), cores.geada)],
    options: {
      animation: false,
      maintainAspectRatio: false,
      parsing: false,
      interaction: { mode: "index", intersect: false },          // T e P do mês juntos na dica
      layout: { padding: { bottom: 8 } },
      scales: {
        x: { type: "linear", min: -0.5, max: 11.5, grid: { display: false },
             // um tique no centro de cada mês (sem isto caíam em −0,5, 0,5…)
             afterBuildTicks: (eixo) => { eixo.ticks = MESES.map((_, k) => ({ value: k })); },
             ticks: { callback: (v) => MESES[v]?.[0].toUpperCase() ?? "", color: cores.texto } },
        // acima de 50 a escala só tem sentido em mm (P > 100 mm comprimida): sem °C
        y: { ...eixo, position: "left", title: { display: true, text: "°C", color: cores.texto },
             ticks: { stepSize: 10, color: cores.texto, callback: (v) => (v > LIMITE_MM / 2 ? "" : numero(v, 0)) } },
        y2: { ...eixo, position: "right", grid: { display: false }, title: { display: true, text: "mm", color: cores.texto },
              ticks: { stepSize: 10, color: cores.texto, callback: (v) => (v < 0 ? "" : numero(mmDaEscala(v), 0)) } },
      },
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 18, color: cores.texto } },
        tooltip: { filter: (c) => c.datasetIndex < 2, callbacks: {
          title: (c) => (c.length ? MESES[c[0].parsed.x] : ""),
          label: (c) => (c.datasetIndex === 0 ? `T: ${numero(d.t[c.parsed.x], 1)} °C`
                                               : `P: ${numero(d.p[c.parsed.x], 0)} mm`),
        } },
      },
    },
  });
}

// --- Ajuste à altitude do ponto clicado --------------------------------------
// Decisão do autor (17/10/2026; gradiente em clima.json, de
// bioclima.decisoes.GRADIENTE_DIAGRAMA): T, TX e TN levadas da altitude da
// célula à do ponto (DEM); a precipitação não se ajusta. Aviso de fundo de
// vale quando o ponto fica mais de 50 m abaixo da célula (abaixo disso é a
// variação do próprio DEM dentro da célula, não um vale).
const RAIO_TERRA = 6378137;
const VALE_M = 50;

export function projetar3857(lat, lon) {
  const r = Math.PI / 180;
  return [RAIO_TERRA * lon * r, RAIO_TERRA * Math.log(Math.tan(Math.PI / 4 + (lat * r) / 2))];
}

// Altitude (m) do píxel da grelha EPSG:3857 que contém o ponto; null fora ou sem valor.
export function altitudeEm(lat, lon, meta, valores) {
  const [x, y] = projetar3857(lat, lon);
  const i = Math.floor((x - meta.x0) / meta.resolucao_m);
  const j = Math.floor((meta.y1 - y) / meta.resolucao_m);
  if (i < 0 || j < 0 || i >= meta.largura || j >= meta.altura) return null;
  const v = valores[j * meta.largura + i];
  return v === meta.nodata || v === null || v === undefined ? null : v;
}

// Buffer de dados/altitude.bin → valores; recusa um tamanho diferente do
// anunciado no clima.json (cache desfasada daria altitudes erradas em silêncio).
export function grelhaDeAltitude(buffer, meta) {
  if (buffer.byteLength !== meta.largura * meta.altura * 2) {
    throw new Error(`altitude.bin com tamanho ${buffer.byteLength}, esperado ${meta.largura * meta.altura * 2}`);
  }
  return new Uint16Array(buffer);
}

// O ajuste parte do relevo do modelo (alt_modelo: a altitude a que a
// temperatura foi calculada — decisão do autor); o aviso de vale compara com a
// altitude média do DEM na célula (alt).
export function ajustarAltitude(d, altPonto, gradiente) {
  if (altPonto === null || altPonto === undefined) return d;
  const referencia = d.alt_modelo ?? d.alt;
  const ajuste = (-gradiente * (altPonto - referencia)) / 100;
  const mais = (v) => v.map((x) => x + ajuste);
  return {
    ...d, t: mais(d.t), tx: mais(d.tx), tn: mais(d.tn), T: d.T + ajuste,
    alt: altPonto, altCelula: d.alt, altModelo: referencia, ajuste, vale: altPonto < d.alt - VALE_M,
  };
}
