# Editor

Código em `frontend/src/editor/`.

## Parâmetros (`params.ts`)

Schema zod único. Cada parâmetro tem `min`, `max`, `step` e `default`. Todos opcionais no parse (preset parcial vale).

| Grupo | Chaves |
|---|---|
| Luz | `exposure`, `contrast`, `highlights`, `shadows`, `whites`, `blacks` |
| Cor | `saturation`, `vibrance`, `temperature`, `tint` |
| HSL | global (`hslAll*`) + 8 faixas (vermelho, laranja, amarelo, verde, aqua, azul, roxo, magenta) x matiz, saturação, luminância |
| Grading | sombras, meios-tons, realces x matiz, saturação, luminância + `gradeBalance` |
| Curvas | `curves`: canais `rgb`, `r`, `g`, `b`, até 12 pontos, spline cúbica monótona |
| Efeitos | `grain`, `grainSize`, `vignette`, `vignetteMidpoint`, `vignetteFeather`, `fade` |
| Glitch (na aba Efeitos) | `glitch`, `glitchSize`, `glitchSeed` (bandas deslocadas + separação RGB) |
| Detalhe | `sharpness`, `sharpnessRadius`, `clarity`, `dehaze` |
| LUT | `lutStrength` (o LUT em si não é param: não vai para preset nem banco) |
| Geometria | `geometry`: corte, giro 90°, espelho, endireitar (±30°), `exportWidth` |

Funções úteis: `defaultParams`, `blendParams` (intensidade do preset), `isDefaultParams`, `paramsEqual`, `compactParams` (só o que difere do padrão, para caber no limite de 2 KB do banco).

Abas da UI (`groups.ts`): Luz, Cor, HSL, Grading, Curvas, Efeitos, Detalhe, Cortar.

## Shader (`shader.ts`, `uniforms.ts`)

Um fragment shader só, em estágios: claridade/névoa (a partir da original), glitch (na amostragem da foto), tom, cor, HSL por faixa, color grading, curvas, LUT, nitidez e efeitos. `uniforms.ts` converte `EditParams` em uniforms (`exposure` vira `uExposure`, `hslRedHue` vira `uHslRedHue`).

## Canvas (`photo-canvas.tsx`)

PixiJS. Preview reduzido (máx. ~2048 px no maior lado). Zoom e pan, divisor antes/depois, comparar segurando, aviso de estouro (realces e sombras), grades de composição, linha do horizonte, overlay de corte.

## Geometria (`geometry.ts`, `guides.ts`)

O "quadro" é a foto depois de girar e espelhar. O corte vive em coordenadas 0..1 do quadro. Endireitar amplia o mínimo para não sobrar canto vazio. Grades: terços, centro, áurea (O gira 180°, Shift+O espelha) e diagonais.

## LUT 3D (`lut.ts`)

Importa `.cube` (Adobe/Resolve) e vira textura 2D `(n*n) x n`, fatias de azul lado a lado. Intensidade por `lutStrength`. Só vale na sessão (não persiste).

## Histórico (`history.ts`)

Pilha de snapshots dos params, até 100 entradas. `record` ignora estado igual ao atual e descarta o "refazer".

## Histograma (`histogram.ts`)

Calculado a partir do preview.

## Miniaturas de preset (`preset-thumbnails.ts`)

Mesmo shader, num único canvas WebGL reaproveitado. `EditFilter.dispose()` solta o filtro e as texturas dele antes de destruir o app, o que evita o aviso do Pixi `textureSource was destroyed while still bound`.

## Exportação (`export.ts`, `tiles.ts`)

Resolução total, JPEG (qualidade ajustável, padrão 92%) ou PNG. O JPEG sai pelo **MozJPEG** em WebAssembly (`jpeg.ts`, pacote `@jsquash/jpeg`), de 20% a 30% menor que o do canvas na mesma qualidade; o codec (~250 KB) só é baixado na primeira exportação em JPEG. O PNG sai por `canvas.convertToBlob`.

- O diálogo mostra a exportação em etapas (`ui/export-progress.tsx`): Ler, Aplicar (bloco X de N nas fotos grandes), Gerar (JPEG ou PNG) e Baixar, com uma frase por etapa. `exportPhoto` avisa a etapa por `onPhase` (e cada bloco por `onProgress`) e cede a thread entre as etapas para a tela pintar. Como o trabalho dentro de uma etapa não informa avanço, a barra anda sozinha até o teto da etapa e salta quando ela termina. Ao acabar, mostra "Pronto!" com o tamanho por 0,9 s antes de baixar e fechar.
- Limites de memória: a imagem final passa por `assertExportable` (`tiles.ts`): lado máximo de 16384 px e área máxima de 268 MP do canvas, e um teto menor por aparelho (`exportPixelLimit` em `photos/limits.ts`): 150 MP, ou 50 MP quando `navigator.deviceMemory` indica 4 GB ou menos. Passou do teto, a exportação para antes de começar com a mensagem de quanto a imagem tem e quanto o aparelho exporta. O pico de memória da exportação é de uns 5 buffers do tamanho da imagem (4 bytes por pixel).
- Renderiza em **blocos** com o mesmo shader do preview, respeitando o `MAX_TEXTURE_SIZE` e o limite de canvas.
- `tiles.ts` planeja os recortes com halo de 2 px: o unsharp lê vizinhos e não pode ver a borda do recorte.
- `clampToImage` (shader): claridade e nitidez prendem as amostras de vizinhança dentro da imagem. Sem isso, na borda elas leem o fundo transparente do filtro e aparece um halo claro em volta da foto no preview (a miniatura não tinha, porque o canvas dela é do tamanho exato da foto).
- Preset aplicado não é salvo na foto. Ao reabrir, `photo-editor-view` compara os params salvos com os de cada preset (ignorando geometria) e remarca o igual; a faixa de presets libera as páginas até ele e rola até centralizá-lo. O nome do filtro aplicado aparece acima do slider de intensidade.
- Sem corte/giro: recorta blocos da própria foto.
- Com corte, giro, espelho, endireitar ou redimensionar: posiciona a foto transformada em cada bloco da saída.
- Orientação EXIF respeitada no carregamento (`createImageBitmap` com `imageOrientation`).
