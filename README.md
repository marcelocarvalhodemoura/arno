# Grupo Escoteiro Arno Friedrich

Repositório com as duas frentes do projeto do grupo (43/RS).

| Pasta          | O que é                                                | Tecnologia                           |
| -------------- | ------------------------------------------------------ | ------------------------------------ |
| `site/`        | Site institucional público                             | React + TypeScript + Vite (estático) |
| `application/` | Sistema de tesouraria (área administrativa, com login) | React + Node.js/Express + PostgreSQL |

## Como rodar (site + tesouraria)

Na raiz do repositório, um comando sobe o site institucional, a API e a interface da tesouraria:

```bash
npm install
npm run install:all
# na primeira vez: cp application/.env.example application/.env e preencha as senhas
yarn dev
# equivalente: npm run dev
```

| URL                                                    | O que abre         |
| ------------------------------------------------------ | ------------------ |
| [http://127.0.0.1:5180](http://127.0.0.1:5180)         | site institucional |
| [http://127.0.0.1:5174](http://127.0.0.1:5174)         | tesouraria (login) |
| [http://127.0.0.1:4000/api](http://127.0.0.1:4000/api) | API da tesouraria  |

O `dev` também sobe o Postgres da tesouraria (`npm run db:up`). Só o site: `npm run dev:site`. Só a tesouraria: `npm run dev:app`.

## Site institucional

```bash
cd site
npm install
npm run dev     # desenvolvimento (porta 5180)
npm run build   # gera site/dist para publicação
```

O build em `site/dist` é composto só de arquivos estáticos. No Nginx, `try_files`
manda qualquer rota do React para o `index.html`.

## Publicar (Nginx)

A pasta `site/` pode ir para a raiz do domínio porque o build é HTML/CSS/JS.
A pasta `application/` **não** se publica do mesmo jeito: é um processo Node
(API + interface). O Nginx só faz proxy para `127.0.0.1:4000`.

Por isso o caminho `/finance` no mesmo domínio não substitui a pasta
`application/`. O modelo que encaixa no Nginx é **subdomínio**:

| URL                                  | Conteúdo                                   |
| ------------------------------------ | ------------------------------------------ |
| `https://seudominio.org/`            | site institucional (`site/dist` no `root`) |
| `https://tesouraria.seudominio.org/` | login da tesouraria (proxy para o Node)    |

```bash
cd site && npm ci && npm run build                 # copiar dist → root do site
cd application && npm ci && npm run build && npm run db:up
# subir a API (systemd, pm2): cwd application → node backend/dist/index.js
```

Configuração: [`deploy/nginx-arno.conf`](deploy/nginx-arno.conf).
DNS: `tesouraria.seudominio.org` no mesmo IP. Em `.env`:
`PUBLIC_URL=https://tesouraria.seudominio.org`.

## Sistema de tesouraria

Precisa de Node.js e PostgreSQL. Instruções completas em
[`application/README.md`](application/README.md).

```bash
cd application
cp .env.example .env    # preencha as senhas antes de subir
npm install
npm run db:up
npm run dev
```

## Configuração e segredos

Nenhuma senha, chave ou dado real fica neste repositório:

- Todas as credenciais vêm de variáveis de ambiente, listadas em `application/.env.example`.
  O `.env` de verdade não é versionado.
- No primeiro start, sem `ADMIN_PASSWORD` definida, a API gera uma senha aleatória
  para os usuários iniciais e a imprime uma vez no console.
- As senhas dos usuários vão para o banco só como hash bcrypt (custo 12), tanto no
  seed quanto no cadastro pela tela de usuários.
- O extrato usado nos testes é fictício e pode ser regerado com
  `node backend/tests/fixtures/make-sample-statement.mjs`.

## Testes

```bash
cd application
npm run test:unit   # unitários (frontend e backend)
npm run test:int    # integração da API no banco tesouraria_test
npm run test:e2e    # Playwright no Chromium
```
