-- Rodagem — esquema inicial (MVP)
-- Todas as tabelas de negócio têm empresa_id: é o que separa os dados de cada transportadora.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE empresas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  nif         text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE motoristas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  nif              text,
  telefone         text,
  email            text,
  categorias_carta text,
  ativo            boolean NOT NULL DEFAULT true,
  notas            text,
  criado_em        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX motoristas_empresa_idx ON motoristas (empresa_id);

CREATE TABLE utilizadores (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome           text NOT NULL,
  email          text NOT NULL,
  password_hash  text NOT NULL,
  perfis         text[] NOT NULL DEFAULT '{}',
  motorista_id   uuid REFERENCES motoristas(id) ON DELETE SET NULL,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX utilizadores_email_idx ON utilizadores (lower(email));
CREATE INDEX utilizadores_empresa_idx ON utilizadores (empresa_id);

CREATE TABLE sessoes (
  token_hash     text PRIMARY KEY,
  utilizador_id  uuid NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  expira_em      timestamptz NOT NULL,
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessoes_utilizador_idx ON sessoes (utilizador_id);

CREATE TABLE veiculos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('trator', 'reboque', 'rigido', 'ligeiro')),
  matricula   text NOT NULL,
  marca       text,
  modelo      text,
  ano         integer,
  km          integer,
  estado      text NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo', 'oficina', 'inativo')),
  notas       text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX veiculos_matricula_idx ON veiculos (empresa_id, upper(matricula));

CREATE TABLE clientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  nif         text,
  contacto    text,
  telefone    text,
  email       text,
  morada      text,
  notas       text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clientes_empresa_idx ON clientes (empresa_id);

-- Documento genérico com validade: inspeção, seguro, carta, CAM, cartão de condutor...
CREATE TABLE documentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  veiculo_id     uuid REFERENCES veiculos(id) ON DELETE CASCADE,
  motorista_id   uuid REFERENCES motoristas(id) ON DELETE CASCADE,
  tipo           text NOT NULL,
  numero         text,
  data_emissao   date,
  data_validade  date,
  notas          text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (veiculo_id IS NOT NULL AND motorista_id IS NOT NULL))
);
CREATE INDEX documentos_empresa_validade_idx ON documentos (empresa_id, data_validade);

CREATE TABLE servicos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero           integer NOT NULL,
  cliente_id       uuid REFERENCES clientes(id) ON DELETE SET NULL,
  descricao_carga  text,
  peso_kg          numeric(12, 2),
  origem           text NOT NULL,
  destino          text NOT NULL,
  data_carga       timestamptz,
  data_entrega     timestamptz,
  preco            numeric(12, 2),
  estado           text NOT NULL DEFAULT 'pedido'
                   CHECK (estado IN ('pedido', 'planeado', 'em_curso', 'entregue', 'faturado', 'cancelado')),
  trator_id        uuid REFERENCES veiculos(id) ON DELETE SET NULL,
  reboque_id       uuid REFERENCES veiculos(id) ON DELETE SET NULL,
  motorista_id     uuid REFERENCES motoristas(id) ON DELETE SET NULL,
  notas            text,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, numero)
);
CREATE INDEX servicos_empresa_estado_idx ON servicos (empresa_id, estado);
CREATE INDEX servicos_motorista_idx ON servicos (motorista_id);

CREATE TABLE eventos_servico (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  servico_id     uuid NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('estado', 'carga', 'entrega', 'incidente', 'nota')),
  descricao      text,
  local          text,
  utilizador_id  uuid REFERENCES utilizadores(id) ON DELETE SET NULL,
  ocorrido_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eventos_servico_idx ON eventos_servico (servico_id, ocorrido_em);

-- Registo das descargas do tacógrafo: cartão do motorista (28 dias) e unidade do veículo (90 dias)
CREATE TABLE descargas_tacografo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  origem         text NOT NULL CHECK (origem IN ('cartao', 'veiculo')),
  motorista_id   uuid REFERENCES motoristas(id) ON DELETE CASCADE,
  veiculo_id     uuid REFERENCES veiculos(id) ON DELETE CASCADE,
  data           date NOT NULL,
  notas          text,
  utilizador_id  uuid REFERENCES utilizadores(id) ON DELETE SET NULL,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  CHECK ((origem = 'cartao' AND motorista_id IS NOT NULL) OR (origem = 'veiculo' AND veiculo_id IS NOT NULL))
);
CREATE INDEX descargas_empresa_idx ON descargas_tacografo (empresa_id, data);
