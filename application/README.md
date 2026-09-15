# Tesouraria · Grupo Escoteiro Arno Friedrich

Sistema de controle financeiro da área administrativa do grupo (43/RS). Frontend em React + TypeScript, backend em Node.js + TypeScript e PostgreSQL no Docker.

## Papéis

- **Administrador** — painel de indicadores e todas as demais páginas (caixa, integração, tipos, associados, projetos, relatório fiscal e usuários)
- **Tesoureiro** — fluxo de caixa (lançamento manual), integração de planilha, cadastro de tipo de movimentação, taxas, associados e contas de pagamento

## Módulos

- **Painel** — arrecadação em números e gráfico, filtro por mês/ano, associados cadastrados no período, totais por ramo (Filhotes, Lobinho, Escoteiro, Sênior, Pioneiro e Grupo), saldo inicial, entradas, saídas e saldo atual
- **Fluxo de caixa** — entradas e saídas, com lançamento manual, conciliação (pago, pendente ou vencido) e tipo de movimentação, natureza, ramo, associado e, para jovem, o responsável do lançamento. Lançamentos do extrato sem tipo ficam como **Não identificado**; o tesoureiro classifica o tipo, o associado e o ramo um a um.
- **Integração** — importação de CSV, TXT, XLS, XLSX ou PDF de extrato (Sicredi) com associados e lançamentos. O assistente identifica as colunas, remonta os dados, mostra uma amostragem para validar e sugere tipo, ramo, associado e responsável; o tesoureiro confere a prévia. Mensalidade reconhecida (nome, responsável, PIX ou CPF e valor da taxa) marca o associado como pago. Linhas sem tipo claro entram no fluxo de caixa para identificar depois. Origem marcada como integração. Com `OPENAI_API_KEY`, colunas desconhecidas, a amostragem e linhas duvidosas também passam por um modelo (OpenAI-compatível).
- **Tipos de movimentação** — cadastro usado em cada lançamento (ex.: mensalidade, sede, doação)
- **Taxas** — cadastro do nome e do valor de cada taxa do grupo
- **Associados** — cadastro e alteração do associado; jovens exigem um ou mais responsáveis (pai, mãe, tio, avós etc.), visíveis na listagem e editáveis também nos cadastros já lançados. Contas de pagamento do pai, da mãe ou do jovem continuam no cadastro à parte.
- **Projetos financeiros** — orçamento planejado × realizado de cada ramo, vinculado aos lançamentos
- **Relatório fiscal** — livro-caixa numerado, com saldo acumulado, para conferência da comissão fiscal
- **Usuários** — administrador e tesoureiro

## Banco de dados (Docker)

Na pasta `application`:

```bash
cp .env.example .env
npm run db:up
```

O Postgres sobe em `127.0.0.1:5434` (usuário `arno`, senha `arno1991`, banco `tesouraria`). A porta 5434 evita conflito com outro Postgres local. A migration do schema e os usuários iniciais (`admin` e `tesouraria`) rodam sozinhos na primeira subida da API. Associados, taxas, tipos, projetos e lançamentos começam vazios — entram por cadastro manual ou pela Integração.

Migration em `backend/migrations/001_schema.sql`: chaves primárias UUID (UUIDv7), com usuários, tipos de movimentação, associados, contas de pagamento, projetos, taxas, lançamentos e configurações.

Para aplicar só as migrations:

```bash
npm run db:migrate
```

Se o banco anterior ainda estiver no volume do Docker e a API falhar ao migrar, recrie o volume:

```bash
npm run db:down
docker volume rm application_arno_pg
npm run db:up
```

## Como rodar a aplicação

```bash
npm install
npm run db:up
npm run dev
```

- Interface: [http://127.0.0.1:5174](http://127.0.0.1:5174)
- API: [http://127.0.0.1:4000/api](http://127.0.0.1:4000/api)

Acesso inicial:

| Perfil         | Usuário      | Senha    |
| -------------- | ------------ | -------- |
| Administrador  | `admin`      | `arno1991` |
| Tesoureiro     | `tesouraria` | `arno1991` |

Na primeira execução a API cria esses usuários. O restante do cadastro (associados, tipos, taxas, projetos e caixa) é feito na interface ou na Integração.

## Testes

Na pasta `application`, com o Postgres no ar (`npm run db:up`):

```bash
npm test
```

Ou em partes:

```bash
npm run test:unit
npm run test:int
npm run test:e2e
```

- **Unitários** — máscaras, listagem/paginação, formatação, período, caixa e autenticação
- **Integração** — API no banco `tesouraria_test` (login, lançamentos, associados, painel, relatório)
- **E2E** — Playwright no Chromium, cobrindo tesoureiro e administrador (filtros e paginação das listagens)

Variáveis: `DATABASE_URL`, `PORT`, `ADMIN_USER`, `ADMIN_PASSWORD`, `AUTH_SECRET`. Opcional para o assistente de extrato: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.
