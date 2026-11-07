# open-filter

<p align="center">

![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-green?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![PixiJS](https://img.shields.io/badge/PixiJS-8-E72264?style=flat-square&logo=pixijs&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-GLSL-990000?style=flat-square&logo=webgl&logoColor=white)
![TanStack](https://img.shields.io/badge/TanStack-Router%20%2B%20Query-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-60A5FA?style=flat-square&logo=biome&logoColor=white)
![WebAssembly](https://img.shields.io/badge/MozJPEG-WebAssembly-654FF0?style=flat-square&logo=webassembly&logoColor=white)

</p>

Site gratuito e de código aberto para aplicar filtros e ajustar uma foto direto no navegador. A foto nunca sai do seu computador: o processamento roda em WebGL e o arquivo fica no IndexedDB. Só contas e presets (um JSON pequeno) vão para o Supabase.

![Editor do open-filter com o preset Retrô aplicado](docs/screenshot.png)

## O que tem

- Luz, cor, HSL por faixa, color grading, curvas, LUT 3D (.cube), efeitos e nitidez
- Cortar, girar, espelhar, endireitar e redimensionar, com grades de composição e linha do horizonte
- Presets oficiais e os seus (login com Google), com intensidade
- Antes e depois, histograma, aviso de estouro, zoom e atalhos de teclado (`?` lista), tela cheia com painel, desfazer e refazer
- Exportação em JPEG ou PNG na resolução total, e backup do álbum em ZIP

## Estrutura

- `frontend/`: Vite, React, TypeScript, TanStack Router e Query, PixiJS, Tailwind e shadcn (Base UI)
- `backend/`: migrations SQL, RLS e seeds do Supabase (sem servidor próprio). Veja `backend/README.md`

## Código aberto

O open-filter é um site para usar, não um projeto para você ter que rodar. Mesmo assim o código é aberto: se quiser entender como funciona, adaptar ou contribuir, o caminho está em [`docs/`](docs/README.md). Lá tem a arquitetura, o editor (params, shader, exportação), os dados (IndexedDB, Supabase, backup), os atalhos e o passo a passo para rodar o projeto em [`docs/desenvolvimento.md`](docs/desenvolvimento.md).

## Licença

[MIT](LICENSE).
