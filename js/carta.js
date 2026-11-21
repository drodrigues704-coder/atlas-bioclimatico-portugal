// Carta Ecológica (Pina Manique e Albuquerque, Atlas do Ambiente): a zona de um ponto, o texto do
// painel e a simbologia. Os nomes vêm de dados/carta_ecologica.geojson (scripts/18_carta_ecologica.py).
import { celulaEm } from "./geometria.js";
import { criarSimbologia } from "./simbologia.js";

// Propriedades do polígono da carta que contém o ponto, ou null (fora da carta).
export const zonaEm = (lat, lon, carta) => celulaEm(lat, lon, carta.features)?.properties ?? null;

// Cores da carta impressa (no ficheiro, pela caixa da legenda). Nas zonas tracejadas, `traco` é a cor do
// traço e a cor é a do fundo.
export function simbologiaDaCarta(camada, carta) {
  const s = criarSimbologia({ ...camada, cores: carta.legenda.map((e) => e.cor) },
                            { classes: { [camada.id]: carta.legenda.map((e) => `${e.codigo} — ${e.zona}`) } });
  s.entradas.forEach((e, k) => { e.traco = carta.legenda[k].traco; });
  return s;
}

// Texto para o painel do ponto.
export function fichaDaZona(p) {
  return {
    zona: `${p.codigo} — ${p.zona}`,
    andar: p.andar === "—" ? "não indicado (zona edafo-climática)" : p.andar,
    especies: p.especies.map(([botanico, comum]) => ({ comum, botanico })),
    observacao: p.observacao ?? null,
  };
}
