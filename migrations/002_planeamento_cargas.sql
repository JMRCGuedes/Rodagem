-- Rodagem — planeamento, app do motorista e assistente de cargas

-- Onde a empresa está sediada (ponto de partida dos camiões sem serviço anterior).
ALTER TABLE empresas ADD COLUMN localidade_base text;

-- Carroçaria (para saber que cargas cada veículo pode levar) e motorista habitual.
ALTER TABLE veiculos ADD COLUMN carrocaria text
  CHECK (carrocaria IN ('lona', 'frigorifico', 'caixa', 'cisterna', 'porta_contentores', 'basculante', 'plataforma', 'outro'));
ALTER TABLE veiculos ADD COLUMN motorista_habitual_id uuid REFERENCES motoristas(id) ON DELETE SET NULL;

-- Detalhe operacional do serviço, para a ordem de serviço do motorista.
ALTER TABLE servicos ADD COLUMN morada_carga text;
ALTER TABLE servicos ADD COLUMN morada_entrega text;
ALTER TABLE servicos ADD COLUMN contacto_carga text;
ALTER TABLE servicos ADD COLUMN contacto_entrega text;
ALTER TABLE servicos ADD COLUMN referencia_cliente text;
ALTER TABLE servicos ADD COLUMN carrocaria text
  CHECK (carrocaria IN ('lona', 'frigorifico', 'caixa', 'cisterna', 'porta_contentores', 'basculante', 'plataforma', 'outro'));

-- Entrega: quem recebeu e se houve reservas.
ALTER TABLE eventos_servico ADD COLUMN recebido_por text;
ALTER TABLE eventos_servico ADD COLUMN com_reservas boolean;
ALTER TABLE eventos_servico DROP CONSTRAINT IF EXISTS eventos_servico_tipo_check;
ALTER TABLE eventos_servico ADD CONSTRAINT eventos_servico_tipo_check
  CHECK (tipo IN ('estado', 'carga', 'entrega', 'incidente', 'atraso', 'nota'));

-- Fotografias (guia CMR, avarias). Guardadas na base de dados, já comprimidas no telemóvel.
CREATE TABLE anexos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  servico_id     uuid REFERENCES servicos(id) ON DELETE CASCADE,
  evento_id      uuid REFERENCES eventos_servico(id) ON DELETE CASCADE,
  tipo           text NOT NULL DEFAULT 'guia' CHECK (tipo IN ('guia', 'avaria', 'outro')),
  mime           text NOT NULL,
  tamanho        integer NOT NULL,
  dados          bytea NOT NULL,
  utilizador_id  uuid REFERENCES utilizadores(id) ON DELETE SET NULL,
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX anexos_servico_idx ON anexos (servico_id);

-- Cache de localidades (geocodificação), partilhada entre empresas.
CREATE TABLE locais (
  chave       text PRIMARY KEY,
  nome        text NOT NULL,
  lat         double precision,
  lon         double precision,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Ofertas de carga (Wtransnet, clientes diretos…) analisadas pelo assistente.
CREATE TABLE ofertas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fonte               text NOT NULL DEFAULT 'wtransnet',
  estado              text NOT NULL DEFAULT 'nova'
                      CHECK (estado IN ('nova', 'contactada', 'proposta', 'aceite', 'descartada')),
  origem              text NOT NULL,
  destino             text NOT NULL,
  data_carga          date,
  data_entrega        date,
  peso_kg             numeric(12, 2),
  descricao_carga     text,
  carrocaria          text,
  preco               numeric(12, 2),
  empresa_anunciante  text,
  contacto_nome       text,
  contacto_telefone   text,
  contacto_email      text,
  idioma              text NOT NULL DEFAULT 'pt',
  km                  integer,
  texto_original      text,
  notas               text,
  servico_id          uuid REFERENCES servicos(id) ON DELETE SET NULL,
  utilizador_id       uuid REFERENCES utilizadores(id) ON DELETE SET NULL,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ofertas_empresa_estado_idx ON ofertas (empresa_id, estado, data_carga);
