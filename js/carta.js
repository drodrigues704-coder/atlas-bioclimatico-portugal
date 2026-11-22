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

// Ficha PROF do ponto (scripts/20_prof.py): `p` são as propriedades do polígono da SRH (zonaEm) ou null fora dos
// PROF; os nomes das funções e as listas de espécies vêm do ficheiro.
export function fichaDoProf(p, carta) {
  if (!p) return null;
  const s = carta.srh[p.i];
  const prof = carta.profs[s.prof];
  const especies = (lista) => lista.map(([comum, botanico, conservacao]) => ({ comum, botanico, conservacao }));
  const grupo1 = especies(s.grupo1), grupo2 = especies(s.grupo2);
  return {
    srh: s.nome,
    prof: prof.nome,
    profId: s.prof,
    regulamento: `Portaria n.º ${prof.portaria}, art. ${s.artigo}.º`,
    funcoes: s.funcoes.map((k) => carta.funcoes[k]).join(", "),
    grupo1,
    grupo2,
    conservacao: [...grupo1, ...grupo2].some((e) => e.conservacao),
  };
}

// Potencial climático 1991–2020 no ponto (matrizes do PROF do Alentejo e de Lisboa e Vale do Tejo; scripts/
// 21_prof_potencial.py): as espécies da sub-região por classe, com `muda` quando a classe pode mudar com pouca
// diferença de chuva. null fora do ALT e do LVT, ou quando a célula é de outro PROF que o ponto (na fronteira).
export function potencialNoPonto(ficha, app, idCelula) {
  const c = app?.celulas?.[String(idCelula)];
  if (!ficha || !c || c[0] !== ficha.profId) return null;
  const [, codigos, avisos] = c;
  const indice = app.indice[ficha.profId] ?? {};
  const classes = { Boa: [], Regular: [], Baixa: [] };
  for (const e of [...ficha.grupo1, ...ficha.grupo2]) {
    const k = indice[e.botanico];
    if (k === undefined) continue;
    const lista = classes[app.codigos[codigos[k]]];
    if (lista && !lista.some((x) => x.comum === e.comum)) lista.push({ comum: e.comum, botanico: e.botanico, muda: avisos[k] === "1" });
  }
  return classes;
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
