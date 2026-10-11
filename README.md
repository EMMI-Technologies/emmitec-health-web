# emmitec.health (site institucional)

Vue 3 + Vite + vue-i18n (pt, en, es). Design System em `DESIGN_SYSTEM.md`.

**Blog e equipamentos vêm da API do BackOffice** (`emmitec-api-backoffice`), rotas públicas
sem token. O conteúdo é editado no `emmitec-web-backoffice`; o site não guarda cópia local.

## Rodar

```sh
npm ci
cp .env.example .env.local   # ajuste VITE_API_BASE_URL
npm run dev
```

```sh
npm run build        # vue-tsc (type-check) + vite build, saída em dist/
npm run type-check
npm run lint
```

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `VITE_API_BASE_URL` | Base da API, **terminando em `/v1`** e sem barra no fim. Produção: `https://api-backoffice.emmitec.health/v1`. Local: `http://localhost:3000/v1`. Sem ela, o build usa a de produção. |
| `VITE_ASSETS_BASE_URL` | Opcional. Base pública das imagens (`https://assets.emmitec.health`), usada só se o corpo de um post trouxer o marcador `{{ASSET}}`. |

As variáveis entram no bundle na hora do build: mudar no Amplify exige nova publicação.

## Dados da API (`src/lib/api.ts`)

Todas com `?lang=pt|en|es` (o idioma atual do vue-i18n). Trocar o idioma recarrega.

| Rota | Tela |
|---|---|
| `GET /public/blog/posts` | Blog, faixa do blog no Início, relacionados |
| `GET /public/blog/posts/:slug` | `/blog/:slug` |
| `GET /public/blog/categories` | abas do Blog, coluna do rodapé |
| `GET /public/equipment` | Equipamentos, faixa do Início, outros equipamentos |
| `GET /public/equipment/:slug` | `/equipment/:slug` |
| `GET /public/equipment/categories` | abas de Equipamentos (a aba "Todos" é do site) |

- Imagens (`coverImage`, `image`, `gallery[]`) chegam como URL absoluta (`https://assets.emmitec.health/...`).
- Ícones chegam pelo nome lucide (`"Gauge"`); o mapa nome para componente está em `src/lib/icons.ts`
  (nome desconhecido vira `Activity`). Ícone novo no BackOffice precisa entrar nesse mapa.
- O tom pastel dos cards sai da classe de gradiente cadastrada (`toneFrom` em `api.ts`).
- Cada bloco tem os estados carregando (esqueleto), erro (mensagem + tentar de novo), vazio e,
  no detalhe, não encontrado. Não há dado de reserva: se a API falhar, o erro aparece.
- Respostas ficam 5 minutos em memória para a navegação entre telas não repetir a chamada;
  "tentar de novo" ignora esse cache.
- Título e descrição de cada página (inclusive post e equipamento) em `src/lib/seo.ts`.

## Publicação (AWS Amplify Hosting)

`amplify.yml` na raiz: Node 22, `npm ci`, `npm run build`, artefatos em `dist`.
`customHttp.yml`: cache de 1 ano para `/assets/*` (nomes com hash) e `no-cache` no `index.html`.

No console do Amplify (App settings):

1. **Environment variables**: `VITE_API_BASE_URL = https://api-backoffice.emmitec.health/v1`
2. **Rewrites and redirects**: regra de SPA, para as rotas do Vue Router (`/blog/:slug` etc.)
   abrirem direto.

   - Source address:
     ```
     </^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|xml|webmanifest)$)([^.]+$)/>
     ```
   - Target address: `/index.html`
   - Type: `200 (Rewrite)`

   Arquivo com extensão fora da lista (ex.: `.webp`) também cai no `index.html`: imagens do
   conteúdo ficam no CDN de assets, não neste app.
3. A API precisa liberar CORS para o domínio do site (hoje responde com a origem da requisição).
