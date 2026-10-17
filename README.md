# Atlas Bioclimático de Portugal Continental

Atlas interativo da bioclimatologia de Portugal Continental para o clima
normal de **1991–2020**, segundo a classificação bioclimática mundial de
Rivas-Martínez, com a de Köppen-Geiger como complemento.

**Abrir o atlas:** https://drodrigues704-coder.github.io/atlas-bioclimatico-portugal/

## O que tem

- **Mapas:** continentalidade, índice de continentalidade (Ic), termicidade
  compensada (Itc), temperatura positiva (Tp), temperatura média,
  macrobioclima, termotipos, ombrotipos, bioclimas, índice ombrotérmico (Io)
  e Köppen-Geiger.
- **Ao clicar num lugar:** a classificação completa da célula (com os
  horizontes), os índices, as séries anuais 1991–2025 (temperatura,
  precipitação, Io e outros índices) com tendência de Theil–Sen e
  significância de Mann–Kendall, e o diagrama ombrotérmico de Walter-Lieth
  ajustado à altitude do ponto.
- **"Sobre o Atlas e definições"** explica os dados, o método, cada índice e
  classificação, as limitações e as fontes.

## Dados e método, em resumo

- Temperatura: reanálise **CERRA** (Copernicus), ~5,5 km, de 3 em 3 horas;
  precipitação: **CERRA-Land** (análise diária com udómetros).
- Validação contra as normais 1991–2020 de **51 estações do IPMA**.
- Classificação: Rivas-Martínez, Rivas-Sáenz & Penas (2011), *Global
  Geobotany* 1; Köppen-Geiger segundo Peel, Finlayson & McMahon (2007).

## Licenças e atribuição

- **Código** (HTML, CSS, JavaScript): licença MIT — ver `LICENSE`.
- **Dados** (`dados/`): CC-BY 4.0 — ver `LICENCA_DADOS.md`.
- Contém informação modificada do Copernicus Climate Change Service [2026]
  (reanálises CERRA e CERRA-Land, licença CC-BY 4.0). Nem a Comissão
  Europeia nem o ECMWF são responsáveis pelo uso que possa ser feito desta
  informação. Limites administrativos: CAOP 2021 © DGT. Normais
  climatológicas: IPMA.

App estática (Leaflet, Chart.js), sem servidor: corre no navegador.
