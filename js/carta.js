// Cartas de referência (vetoriais): a classe de um ponto, a simbologia e, na Carta Ecológica (Pina Manique e
// Albuquerque), o texto do painel. A legenda (nomes e cores oficiais) vem no próprio ficheiro
// (scripts/18_carta_ecologica.py e scripts/19_cartas_referencia.py).
import { celulaEm } from "./geometria.js";
import { criarSimbologia } from "./simbologia.js";

// Propriedades do polígono da carta que contém o ponto, ou null (fora da carta).
export const zonaEm = (lat, lon, carta) => celulaEm(lat, lon, carta.features)?.properties ?? null;

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
