# Coleciona

Catálogo digital para colecionadores de discos de vinil. Registre o que você tem, em que estado está, quanto pagou — e compartilhe sua coleção com um link.

🔗 **[Ver aplicação](#)** · 📦 **[API (backend)](#)**

> ⚠️ Projeto em desenvolvimento ativo. O roadmap abaixo mostra o que já está pronto.

<!-- Quando tiver a interface pronta, substitua a linha abaixo por um GIF ou screenshot da tela de coleção. -->
<!-- ![Tela principal do Coleciona](./docs/screenshot-colecao.png) -->

---

## Sobre o projeto

Quem coleciona vinil normalmente controla o acervo em planilha, ou não controla. Isso gera dois problemas concretos: você compra disco repetido em feira, e não tem como mostrar a coleção para alguém sem mandar um arquivo.

O Coleciona resolve os dois. O cadastro de um disco leva poucos segundos porque os dados vêm da base do Discogs — você busca pelo nome do álbum, escolhe na lista, e capa, ano, gravadora e faixas são preenchidos automaticamente. O que você informa é só o que é seu: estado de conservação da mídia e da capa, quanto pagou, quando comprou, e suas anotações.

Cada usuário pode tornar a coleção pública em uma URL própria (`/u/seu-usuario`).

## Funcionalidades

**Disponível**

- [ ] Cadastro e autenticação de usuários
- [ ] Busca de álbuns integrada à API do Discogs
- [ ] Adicionar disco à coleção com estado de conservação, preço e data de compra
- [ ] Listagem em grade com busca e filtro por gênero
- [ ] Página de detalhe do disco
- [ ] Edição e remoção
- [ ] Lista de desejos
- [ ] Página pública de coleção compartilhável

**Fora do escopo desta versão**

CDs, DVDs e games · upload manual de capa · estatísticas avançadas · importação e exportação · aplicativo mobile

## Stack

**Frontend**

| Tecnologia | Por quê |
|---|---|
| Vue 3 (Composition API) | Reatividade e organização por funcionalidade, não por tipo de arquivo |
| TypeScript | Contratos explícitos entre camadas, erro em tempo de build |
| Vite | Build e HMR rápidos |
| Tailwind CSS | Estilo no markup, sem CSS órfão acumulando |
| shadcn-vue + Reka UI | Componentes acessíveis (WAI-ARIA) com o código dentro do projeto |
| Pinia | Estado global de sessão e coleção |
| Vue Router | Roteamento com guardas de autenticação |

**Backend**

| Tecnologia | Por quê |
|---|---|
| NestJS | Estrutura modular e injeção de dependência |
| PostgreSQL | Dados relacionais com integridade referencial |
| API do Discogs | Base de metadados musicais |

## Decisões técnicas

Esta seção existe porque as escolhas importam mais que a lista de ferramentas.

**Biblioteca headless em vez de biblioteca pronta.** Considerei Quasar e Vuetify, que entregariam as telas mais rápido. Optei por shadcn-vue sobre Reka UI porque o código dos componentes fica dentro do repositório, o que permite ajustar comportamento e estrutura sem lutar contra a biblioteca — e porque o Reka UI já entrega navegação por teclado e gerenciamento de foco em conformidade com WAI-ARIA.

**Catálogo separado da coleção.** A tabela `albums` guarda os metadados do álbum (um registro por álbum no sistema inteiro, identificado pelo ID do Discogs), e `collection_items` guarda o que pertence a cada usuário. Dois colecionadores com o mesmo disco apontam para o mesmo álbum. Isso evita duplicação de dados e abre caminho para recursos sociais.

**Discogs consumido pelo backend, nunca pelo navegador.** A API do Discogs não envia cabeçalhos CORS para uso direto no browser, e o token de acesso não pode ser exposto no bundle. Todas as chamadas passam pelo backend, que também normaliza a resposta para o formato da aplicação — o frontend nunca vê o payload bruto de terceiros.

**Componentes não fazem requisições.** O fluxo é sempre componente → composable ou store → service → cliente HTTP. Isso mantém a lógica de rede em um lugar só e torna os componentes testáveis.

<!-- Conforme o projeto evolui, adicione aqui as decisões novas. Esta é a seção que revisor técnico lê. -->

## Rodando localmente

**Pré-requisitos:** Node.js 22+, PostgreSQL 16+, conta no Discogs.

```bash
git clone https://github.com/SEU-USUARIO/coleciona.git
cd coleciona
npm install
```

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Preencha as variáveis:

```
DATABASE_URL=postgresql://usuario:senha@localhost:5432/coleciona
JWT_SECRET=troque-por-uma-string-aleatoria-longa
DISCOGS_TOKEN=seu-token-pessoal
DISCOGS_USER_AGENT=Coleciona/0.1 +https://github.com/SEU-USUARIO/coleciona
```

O token pessoal do Discogs é gerado em [discogs.com/settings/developers](https://www.discogs.com/settings/developers).

Rode as migrations e suba o servidor:

```bash
npm run migration:run
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

## Estrutura

```
src/
├── assets/
├── components/
│   ├── ui/            componentes gerados pelo shadcn-vue
│   ├── collection/    RecordCard, RecordGrid, ConditionBadge
│   └── layout/        AppHeader, AppShell
├── composables/       useAuth, useCollection, useDiscogsSearch
├── pages/
├── router/
├── services/          cliente HTTP e chamadas por domínio
├── stores/            Pinia
├── types/
└── lib/
```

## Roadmap

- [ ] MVP com vinil
- [ ] Modo escuro
- [ ] Estatísticas da coleção (por década, gênero, gravadora)
- [ ] Suporte a CD e outras mídias
- [ ] Exportação em CSV
- [ ] Progressive Web App

## Licença

MIT

## Autora

Camila — [LinkedIn](#) · [GitHub](#)
