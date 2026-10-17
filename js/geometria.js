// Ponto em polígono para as células (GeoJSON: coordenadas [lon, lat]).
// Usado para escolher a célula com o teclado (a do centro do mapa).

// Regra par-ímpar (ray casting) num anel.
function noAnel(lon, lat, anel) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

// Polígono = anel exterior menos os furos.
function noPoligono(lon, lat, aneis) {
  return noAnel(lon, lat, aneis[0]) && !aneis.slice(1).some((furo) => noAnel(lon, lat, furo));
}

export function pontoNaGeometria(lon, lat, geometria) {
  if (geometria.type === "Polygon") return noPoligono(lon, lat, geometria.coordinates);
  if (geometria.type === "MultiPolygon") return geometria.coordinates.some((p) => noPoligono(lon, lat, p));
  return false;
}

// Feature que contém (lat, lon), ou null.
export function celulaEm(lat, lon, features) {
  return features.find((f) => pontoNaGeometria(lon, lat, f.geometry)) ?? null;
}
