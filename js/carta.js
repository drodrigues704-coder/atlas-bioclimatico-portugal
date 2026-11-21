// Carta Ecológica (Pina Manique e Albuquerque, Atlas do Ambiente): a zona de um ponto, o texto do
// painel e a simbologia. Os nomes vêm de dados/carta_ecologica.geojson (scripts/18_carta_ecologica.py).
import { celulaEm } from "./geometria.js";
import { criarSimbologia } from "./simbologia.js";

// Propriedades do polígono da carta que contém o ponto, ou null (fora da carta).
export const zonaEm = (lat, lon, carta) => celulaEm(lat, lon, carta.features)?.properties ?? null;

// Cor pelo grupo de cada polígono; legenda com os nomes dos grupos.
export const simbologiaDaCarta = (camada, carta) => criarSimbologia(camada, { classes: { [camada.id]: carta.grupos } });

// Texto para o painel do ponto.
export function fichaDaZona(p) {
  return {
    zona: `${p.codigo} — ${p.zona}`,
    andar: p.andar === "—" ? "não indicado (zona edafo-climática)" : p.andar,
    especies: p.especies.map(([botanico, comum]) => ({ comum, botanico })),
    observacao: p.observacao ?? null,
  };
}
