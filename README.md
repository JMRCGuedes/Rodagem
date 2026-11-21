# Rodagem

Gestão de frota, motoristas e serviços para pequenas e médias transportadoras de mercadorias.

## O que faz (MVP)

- **Painel do dia**: serviços em curso e planeados, veículos na oficina, prazos a vencer.
- **Frota**: tratores, rígidos e reboques, com documentos e validades (inspeção, seguro, IUC, licença, tacógrafo…).
- **Motoristas**: dados, carta, CAM, cartão de condutor e outros documentos com validade.
- **Serviços**: do pedido à faturação (`Pedido → Planeado → Em curso → Entregue → Faturado`), com atribuição de camião, reboque e motorista. Avisa quando há documentos expirados ou sobreposição com outro serviço.
- **Tacógrafo**: registo das descargas do cartão (28 dias) e da unidade do veículo (90 dias), com prazos.
- **Alertas**: todos os prazos num só sítio, e resumo diário por email aos gerentes.
- **Área do motorista** (telemóvel): os seus serviços, marcar carga e entrega, comunicar incidentes.
- **Utilizadores e perfis**: gerente, gestor de tráfego, administrativo, motorista, oficina.

Fora do âmbito: GPS, descarga dos ficheiros do tacógrafo e faturação certificada. O Rodagem guarda as datas e avisa; esses sistemas continuam a ser os da empresa.

## Arquitetura

Monólito modular em **Next.js (App Router) + TypeScript**, renderizado no servidor, com **PostgreSQL**.

```
src/
  app/            páginas (escritório em (app)/, motorista em (app)/motorista)
  modules/        regras de negócio por módulo: queries.ts (leitura) e actions.ts (server actions)
    frota/ motoristas/ documentos/ clientes/ servicos/ tacografo/ alertas/ contas/
  lib/            base de dados, autenticação, perfis, validação, formatação
  components/     componentes de interface partilhados
migrations/       SQL versionado, aplicado no arranque (scripts/migrate.mjs)
```

- **Multi-empresa**: todas as tabelas têm `empresa_id` e todas as consultas filtram pela empresa do utilizador autenticado.
- **Autenticação**: email e palavra-passe (scrypt), sessões guardadas na base de dados, cookie `httpOnly`.
- **Alertas**: calculados no momento a partir das datas (não há tabela de alertas que possa ficar desatualizada).

## Correr localmente

Requisitos: Node 20.9+ e PostgreSQL.

```bash
cp .env.example .env.local   # e preencher DATABASE_URL
npm install
npm run migrate
npm run dev
```

Abrir http://localhost:3000 e registar a empresa: quem regista fica como gerente.

## Deploy no Render

O ficheiro `render.yaml` descreve a infraestrutura (região Frankfurt):

- **Web Service** `rodagem` (Node): `npm install --include=dev && npm run build`, arranca com `npm run start:render` (aplica migrações e inicia o servidor). Health check em `/api/health`.
- **PostgreSQL** `rodagem-db`.

Variáveis de ambiente: `DATABASE_URL`, `CRON_SECRET`, e opcionalmente `RESEND_API_KEY` + `ALERT_EMAIL_FROM` para o email diário.

### Plano gratuito: o que ter em conta

- O serviço adormece após 15 minutos sem uso e demora cerca de um minuto a acordar.
- A base de dados gratuita **expira 30 dias após a criação**. Antes de meter dados reais, passa-a para um plano pago.
- Não há Cron Jobs gratuitos: o resumo diário corre pelo GitHub Actions (`.github/workflows/alertas.yml`). Configura os segredos `RODAGEM_URL` e `CRON_SECRET` no repositório.

### Passar ao plano pago

1. Base de dados → plano pago (protege os dados).
2. Web Service → `starter` (deixa de adormecer).
3. Criar um Cron Job no Render que faça `POST /api/cron/alertas` com `Authorization: Bearer $CRON_SECRET`, e desativar o workflow do GitHub.

## Próximos passos

- Anexos (fotos de guias, PDFs) em armazenamento S3 na UE.
- Manutenção e custos (Fase 2).
- Row Level Security no Postgres como segunda barreira entre empresas.
