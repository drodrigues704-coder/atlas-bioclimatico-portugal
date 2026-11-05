// Mapas suaves: grelhas finas exportadas pelo pipeline (dados/suave/*.bin,
// descritas em dados/suave.json), desenhadas como imagem por baixo das
// células. Só visual — o clique continua a mostrar o valor da célula.

// Binário → array de valores (null = sem dados). Little-endian, como o
// pipeline grava (numpy "<u2").
export function descodificar(buffer, meta) {
  if (meta.tipo === "u8") {
    return Array.from(new Uint8Array(buffer), (q) => (q === meta.nodata ? null : q));
  }
  const vista = new DataView(buffer);
  const n = buffer.byteLength / 2;
  const valores = new Array(n);
  for (let i = 0; i < n; i++) {
    const q = vista.getUint16(2 * i, true);
    valores[i] = q === meta.nodata ? null : meta.deslocamento + meta.escala * q;
  }
  return valores;
}

function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Valores → píxeis RGBA (opacos onde há cor, transparentes onde não há).
export function pintar(valores, corDe) {
  const rgba = new Uint8ClampedArray(valores.length * 4);
  const cache = new Map();
  valores.forEach((v, i) => {
    const cor = v === null ? null : corDe(v);
    if (!cor) return;
    if (!cache.has(cor)) cache.set(cor, hexParaRgb(cor));
    const [r, g, b] = cache.get(cor);
    rgba.set([r, g, b, 255], 4 * i);
  });
  return rgba;
}

// Imagem (data URL) de uma grelha pintada — para L.imageOverlay.
export function imagem(rgba, largura, altura) {
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  tela.getContext("2d").putImageData(new ImageData(rgba, largura, altura), 0, 0);
  return tela.toDataURL("image/png");
}
