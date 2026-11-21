// Cartas de referência (vetoriais): a classe de um ponto, a simbologia e, na Carta Ecológica (Pina Manique e
// Albuquerque), o texto do painel. A legenda (nomes e cores oficiais) vem no próprio ficheiro
// (scripts/18_carta_ecologica.py e scripts/19_cartas_referencia.py).
import { pontoNaGeometria } from "./geometria.js";
import { criarSimbologia } from "./simbologia.js";

// Caixa [oeste, sul, este, norte] de cada polígono, calculada uma vez: o clique só testa os polígonos cuja
// caixa contém o ponto (a capacidade de uso tem 9 mil).
const caixas = new WeakMap();
function caixa(f) {
  if (!caixas.has(f)) {
    const c = [Infinity, Infinity, -Infinity, -Infinity];
    const aneis = f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat();
    for (const anel of aneis) for (const [x, y] of anel) {
      if (x < c[0]) c[0] = x; if (y < c[1]) c[1] = y; if (x > c[2]) c[2] = x; if (y > c[3]) c[3] = y;
    }
    caixas.set(f, c);
  }
  return caixas.get(f);
}

// Propriedades do polígono da carta que contém o ponto, ou null (fora da carta).
export function zonaEm(lat, lon, carta) {
  const f = carta.features.find((g) => {
    const c = caixa(g);
    return lon >= c[0] && lon <= c[2] && lat >= c[1] && lat <= c[3] && pontoNaGeometria(lon, lat, g.geometry);
  });
  return f?.properties ?? null;
}

// Cores da carta (no ficheiro, pela classe da legenda). Nas classes tracejadas, `traco` é a cor do traço e a cor
// é a do fundo.
export function simbologiaDaCarta(camada, carta) {
  const s = criarSimbologia({ ...camada, cores: carta.legenda.map((e) => e.cor) },
                            { classes: { [camada.id]: carta.legenda.map((e) => e.nome) } });
  s.entradas.forEach((e, k) => { e.traco = carta.legenda[k].traco; });
  return s;
}

// Nome da classe da carta no ponto, ou null fora da carta.
export function classeEm(lat, lon, carta) {
  const p = zonaEm(lat, lon, carta);
  return p ? carta.legenda[p.classe].nome : null;
}

// Texto para o painel do ponto (Carta Ecológica).
export function fichaDaZona(p) {
  return {
    zona: `${p.codigo} — ${p.zona}`,
    andar: p.andar === "—" ? "não indicado (zona edafo-climática)" : p.andar,
    especies: p.especies.map(([botanico, comum]) => ({ comum, botanico })),
    observacao: p.observacao ?? null,
  };
}
