# Tesouraria · Grupo Escoteiro Arno Friedrich

Sistema de controle financeiro da área administrativa do grupo (43/RS). Frontend em React + TypeScript, backend em Node.js + TypeScript e PostgreSQL no Docker.

## Papéis

- **Administrador** — painel de indicadores e todas as demais páginas (caixa, integração, tipos, associados, projetos, relatório fiscal e usuários)
- **Tesoureiro** — fluxo de caixa (lançamento manual), integração de planilha, cadastro de tipo de movimentação, taxas, associados e contas de pagamento

## Módulos

- **Painel** — arrecadação em números e gráfico, filtro por mês/ano, associados cadastrados no período, totais por ramo (Filhotes, Lobinho, Escoteiro, Sênior, Pioneiro, Flor de Lis e Grupo), saldo inicial, entradas, saídas e saldo atual
- **Fluxo de caixa** — entradas e saídas, com lançamento manual, conciliação (pago, pendente ou vencido), rateio de um crédito em várias rubricas e tipo de movimentação, natureza, ramo, associado e, para jovem, o responsável do lançamento. Lançamentos do extrato sem tipo ficam como **Não identificado**; o tesoureiro classifica o tipo, o associado e o ramo um a um.
- **Mensalidades** — grade mar–dez, vencimento configurável (padrão dia 10), marcar paga, cobrança e comprovante por e-mail (e WhatsApp, se configurado). O valor segue a tabela do grupo: base (R$ 75 ou R$ 25 no pioneiro), extra de R$ 4,50 e pontualidade (R$ 10 até o vencimento / R$ 20 depois) para quem não é sócio do Lindóia; sócios pagam só a base.
- **Integração** — importação de CSV, TXT, XLS, XLSX ou PDF de extrato (Sicredi) com associados e lançamentos. O assistente identifica as colunas, remonta os dados, mostra uma amostragem para validar e sugere tipo, ramo, associado e responsável; o tesoureiro confere a prévia. Mensalidade reconhecida (nome, responsável, PIX ou CPF e valor pontual ou atrasado) marca o associado como pago. Linhas sem tipo claro entram no fluxo de caixa para identificar depois. Origem marcada como integração. Com `OPENAI_API_KEY`, colunas desconhecidas, a amostragem e linhas duvidosas também passam por um modelo (OpenAI-compatível). A aba **Sicredi ao vivo** lê a API Pix do Sicredi (consulta por período, webhook e polling no caixa): concilia mensalidade pendente e lança o Pix recebido em tempo real. TED, cartão, boleto e tarifas continuam no PDF/planilha do extrato.
- **Tipos de movimentação** — cadastro usado em cada lançamento (ex.: mensalidade, sede, doação)
- **Taxas** — cadastro do nome e do valor de cada taxa do grupo. A tabela oficial da mensalidade é criada automaticamente (base, extra, pontualidade e totais do cartaz)
- **Associados** — cadastro e alteração do associado; a mensalidade é calculada pelo ramo e pelo Clube LTC. Jovens exigem um ou mais responsáveis (pai, mãe, tio, avós etc.), visíveis na listagem e editáveis também nos cadastros já lançados. Contas de pagamento do pai, da mãe ou do jovem continuam no cadastro à parte.
- **Projetos financeiros** — orçamento planejado × realizado de cada ramo (incluindo Grupo), vinculado aos lançamentos e ao tipo de movimentação
- **Relatório fiscal** — livro-caixa numerado, com saldo acumulado, para conferência da comissão fiscal
- **Configurações** — nome do grupo, saldo inicial, dia de vencimento da mensalidade e histórico de disparos
- **Usuários** — administrador e tesoureiro

## Banco de dados (Docker)

Na pasta `application`:

```bash
cp .env.example .env
npm run db:up
```

O Postgres sobe em `127.0.0.1:5434` com o usuário, a senha e o banco que você definir no `.env` (`POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`). A porta 5434 evita conflito com outro Postgres local. A migration do schema e os usuários iniciais (`admin` e `tesouraria`) rodam sozinhos na primeira subida da API. Associados, taxas, tipos, projetos e lançamentos começam vazios — entram por cadastro manual ou pela Integração.

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

Em produção a tesouraria fica no subdomínio `tesouraria.seudominio.org` (Nginx
faz proxy para `127.0.0.1:4000`). O site institucional continua na raiz do
domínio. Configuração em [`deploy/nginx-arno.conf`](../deploy/nginx-arno.conf).

Acesso inicial:

| Perfil        | Usuário                          | Senha                               |
| ------------- | -------------------------------- | ----------------------------------- |
| Administrador | `admin`                          | valor de `ADMIN_PASSWORD` no `.env` |
| Tesoureiro    | `ADMIN_USER` (ex.: `tesouraria`) | valor de `ADMIN_PASSWORD` no `.env` |

Na primeira execução a API cria esses dois usuários com a senha de `ADMIN_PASSWORD`. Se a variável não estiver definida, a API gera uma senha aleatória e a imprime uma única vez no console — anote e troque no primeiro acesso. O restante do cadastro (associados, tipos, taxas, projetos e caixa) é feito na interface ou na Integração.

Nenhuma senha é guardada em texto puro: o seed e o cadastro de usuários gravam apenas o hash bcrypt (custo 12). Bancos criados antes dessa troca guardavam a senha derivada com scrypt, no formato `salt:hash`; o login ainda confere esses hashes antigos e os regrava em bcrypt na primeira entrada de cada usuário, sem pedir troca de senha.

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

Variáveis: `DATABASE_URL`, `PORT`, `ADMIN_USER`, `ADMIN_PASSWORD`, `AUTH_SECRET`. Opcional para o assistente de extrato: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`. Opcional para o Pix Sicredi em tempo real: `SICREDI_MOCK=1` (treino local) ou `SICREDI_CLIENT_ID`, `SICREDI_CLIENT_SECRET`, `SICREDI_CERT_PATH`, `SICREDI_KEY_PATH`, `SICREDI_PIX_KEY`, `PUBLIC_URL` e `SICREDI_WEBHOOK_TOKEN`. A adesão à API Pix é feita na cooperativa, no [Portal do Desenvolvedor](https://developer.sicredi.com.br/api-portal/pt-br).

## Pix Sicredi em tempo real

A tesouraria consulta `GET /pix` (padrão Bacen) e aceita o webhook de recebimento. Cada Pix vira movimento bancário, concilia mensalidade pendente pelo nome/CPF/valor ou entra no fluxo de caixa (pago, origem Sicredi). O caixa atualiza sozinho a cada minuto enquanto a página está aberta.

1. Solicite a adesão à API Pix na cooperativa (conta PJ) e gere certificado + Client ID/Secret no portal.
2. Preencha as variáveis `SICREDI_*` no `.env` e reinicie a API.
3. Em Integração → **Sicredi ao vivo**, clique em **Ler Pix agora**. Em produção, registre o webhook (a API usa `PUBLIC_URL` + `SICREDI_WEBHOOK_TOKEN`).
4. Sem credenciais, `SICREDI_MOCK=1` simula recebimentos para conferir conciliação e o caixa ao vivo.
