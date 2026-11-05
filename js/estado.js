// O estado da vista vive no endereço: copiar o link abre a mesma vista (mapa,
// mapa base, lugar escolhido, zona do mapa e estações). Valores inválidos
// ignoram-se: um link estragado abre o Atlas na vista inicial.
const CASAS = 4;                 // ~10 m: mais do que chega para uma célula de ~5,5 km
const ZOOM_MAXIMO = 20;

function numeros(texto, quantos) {
  if (!texto) return null;
  const v = texto.split(",").map((p) => (p.trim() === "" ? NaN : Number(p)));
  return v.length === quantos && v.every(Number.isFinite) ? v : null;
}

const coordenadasValidas = (lat, lon) => Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

export function lerEstado(search, { camadas, bases }) {
  const p = new URLSearchParams(search);
  const ponto = numeros(p.get("ponto"), 2);
  const vista = numeros(p.get("vista"), 3);
  const vistaValida = vista && coordenadasValidas(vista[0], vista[1]) &&
    Number.isInteger(vista[2]) && vista[2] >= 0 && vista[2] <= ZOOM_MAXIMO;
  return {
    camada: camadas.includes(p.get("camada")) ? p.get("camada") : null,
    base: bases.includes(p.get("base")) ? p.get("base") : null,
    ponto: ponto && coordenadasValidas(ponto[0], ponto[1]) ? ponto : null,
    vista: vistaValida ? { centro: [vista[0], vista[1]], zoom: vista[2] } : null,
    estacoes: p.get("estacoes") === "1",
  };
}

const arredondar = (v) => Number(v.toFixed(CASAS));

// Devolve a parte "?…" do endereço (ou ""). O que é igual ao inicial não entra,
// e os parâmetros que não são da vista mantêm-se.
export function escreverEstado(estado, search, omissoes) {
  const p = new URLSearchParams(search);
  const definir = (chave, valor) => { p.delete(chave); if (valor !== null) p.append(chave, valor); };
  definir("camada", estado.camada && estado.camada !== omissoes.camada ? estado.camada : null);
  definir("base", estado.base && estado.base !== omissoes.base ? estado.base : null);
  definir("ponto", estado.ponto ? estado.ponto.map(arredondar).join(",") : null);
  definir("vista", estado.vista ? [...estado.vista.centro.map(arredondar), estado.vista.zoom].join(",") : null);
  definir("estacoes", estado.estacoes ? "1" : null);
  const texto = p.toString().replace(/%2C/g, ",");
  return texto ? `?${texto}` : "";
}
