// Relatório em PDF da freguesia, do concelho ou do distrito onde fica o ponto.
// Só na versão completa: quem o gera é o servidor local (scripts/servir_app.py,
// com scripts/13_relatorio_area.py). Um site estático não o consegue fazer.

export const SEM_SERVIDOR = "O relatório só se gera com a app aberta pelo servidor local: "
  + "conda run -n atlas_bioclima python scripts/servir_app.py";

export function urlDoRelatorio(nivel, lat, lon) {
  return `relatorio?${new URLSearchParams({ nivel, lat: lat.toFixed(5), lon: lon.toFixed(5) })}`;
}

// → { pdf (Blob), nome do ficheiro, área }; os erros trazem a explicação para o utilizador.
export async function pedirRelatorio(nivel, lat, lon, pedir = fetch) {
  let r;
  try {
    r = await pedir(urlDoRelatorio(nivel, lat, lon));
  } catch {
    throw new Error(SEM_SERVIDOR);
  }
  const tipo = r.headers.get("Content-Type") ?? "";
  if (r.ok && tipo.startsWith("application/pdf")) {
    const nome = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? `relatorio_${nivel}.pdf`;
    return { pdf: await r.blob(), nome, area: decodeURIComponent(r.headers.get("X-Nome-Area") ?? "") };
  }
  // Só o servidor local responde em texto simples; outro servidor dá a sua página de erro.
  if (!tipo.startsWith("text/plain")) throw new Error(SEM_SERVIDOR);
  throw new Error(await r.text());
}
