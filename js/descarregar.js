// Descarregar os gráficos da análise do ponto: PNG (a imagem do gráfico) e CSV (os valores).
// Só na versão completa (a pública não tem os botões: o CSV daria os valores que ela esconde).
// Botões desativados por decisão do autor (21/11/2026); para os ligar, tirar o "disabled".
//
// CSV para o Excel em português: separador ";", vírgula decimal, UTF-8 com BOM e o sinal de
// menos "-" (o "−" tipográfico do resto da app o Excel não lê como número).

import { MESES, mesesSecos } from "./walter.js";

const BOM = "\uFEFF";

function valor(v, casas) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  return new Intl.NumberFormat("pt-PT", { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: false })
    .format(v).replace("−", "-");
}

const csv = (linhas) => BOM + linhas.map((l) => l.join(";")).join("\r\n") + "\r\n";

// Série anual da célula: `info` = celula.variaveis[variavel.id] (dados/series).
export function csvSerie(anos, info, variavel) {
  const titulo = variavel.unidade ? `${variavel.nome} (${variavel.unidade})` : variavel.nome;
  return csv([["ano", titulo], ...anos.map((a, k) => [a, valor(info.anual[k], variavel.casas)])]);
}

// Valores do diagrama de Walter-Lieth: temperatura, precipitação e meses secos.
export function csvWalter(d) {
  const secos = new Set(mesesSecos(d.t, d.p));
  return csv([["mês", "T (°C)", "P (mm)", "seco (P < 2T)"],
    ...MESES.map((m, k) => [m, valor(d.t[k], 1), valor(d.p[k], 0), secos.has(k) ? "sim" : ""])]);
}

// Normais mensais da tabela por baixo do diagrama.
export function csvMensal(d) {
  return csv([["mês", "T (°C)", "T máx. (°C)", "T mín. (°C)", "P (mm)"],
    ...MESES.map((m, k) => [m, valor(d.t[k], 1), valor(d.tx[k], 1), valor(d.tn[k], 1), valor(d.p[k], 0)])]);
}

export function nomeDoFicheiro(o_que, lat, lon, extensao) {
  const coord = `${Math.abs(lat).toFixed(5)}${lat >= 0 ? "N" : "S"}_${Math.abs(lon).toFixed(5)}${lon >= 0 ? "E" : "W"}`;
  return `atlas_${o_que}_${coord}.${extensao}`;
}

// Imagem do gráfico com o fundo do tema (o canvas do Chart.js é transparente).
export function pngDoGrafico(tela, fundo) {
  const copia = document.createElement("canvas");
  copia.width = tela.width;
  copia.height = tela.height;
  const ctx = copia.getContext("2d");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, copia.width, copia.height);
  ctx.drawImage(tela, 0, 0);
  return new Promise((resolver) => copia.toBlob(resolver, "image/png"));
}

export function guardar(conteudo, nome, tipo) {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const ligacao = document.createElement("a");
  ligacao.href = url;
  ligacao.download = nome;
  document.body.append(ligacao);
  ligacao.click();
  ligacao.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
