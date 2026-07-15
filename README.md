# Green League

Plataforma gamificada de ciência cidadã desenvolvida para incentivar a comunidade académica do IPVC a adotar práticas mais sustentáveis.

O projeto é composto por uma aplicação móvel para utilizadores e por um backoffice web destinado à gestão e moderação da plataforma.

## Autores

- André Gonçalves
- Sofia Martins

## Contexto académico

Projeto desenvolvido no âmbito da Unidade Curricular de Projeto Final/Estágio da Licenciatura em Engenharia da Computação Gráfica e Multimédia da ESTG-IPVC.

Ano letivo: 2025/2026

## Funcionalidades principais

### Aplicação móvel

- Registo e autenticação de utilizadores;
- Registo de ações sustentáveis;
- Upload de comprovativos fotográficos;
- Sistema de pontos de experiência e níveis;
- Missões e desafios;
- Rankings individuais e coletivos;
- Criação e participação em equipas;
- Consulta de métricas ambientais;
- Gestão de perfil.

### Backoffice web

- Dashboard com indicadores gerais;
- Gestão de utilizadores;
- Gestão de equipas;
- Gestão de categorias;
- Gestão de missões e desafios;
- Gestão de campanhas;
- Validação e rejeição de submissões;
- Consulta de estatísticas;
- Exportação de dados;
- Controlo de acesso por perfil de administrador.

## Tecnologias utilizadas

- React Native
- Expo
- Expo Router
- TypeScript
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Figma
- GitHub

## Requisitos

Antes de executar o projeto, é necessário ter instalado:

- Node.js 18 ou superior;
- npm;
- Git;
- navegador web atualizado;
- Expo Go, caso se pretenda testar num dispositivo móvel.

## Instalação

Clonar o repositório: https://github.com/andregoncalvessss/greenleague.git

```bash
git clone 
````

Entrar na pasta do projeto:

```bash
cd greenleague
```

Instalar as dependências:

```bash
npm install
```

## Configuração

Criar um ficheiro `.env` na raiz do projeto com as seguintes variáveis:

```env
(verificar relatório do projeto, lá estão as variáveis para adicionar ao .env)
```

As credenciais devem ser fornecidas separadamente.

## Execução

Para iniciar o projeto:

```bash
npx expo start
```

Para abrir diretamente a versão web:

```bash
npx expo start --web
```

Para limpar a cache do Expo:

```bash
npx expo start --clear
```

## Acesso ao backoffice

O backoffice é executado através da versão web.

O acesso às páginas administrativas está reservado a utilizadores cujo campo `role` esteja definido como:

```text
admin
```

## Estrutura principal

```text
app/
├── (tabs)/
│   ├── home.tsx
│   ├── missoes.tsx
│   ├── ranking.tsx
│   ├── equipas.tsx
│   ├── perfil.tsx
│   └── adicionar-acao.tsx
│
├── backoffice/
│   ├── index.tsx
│   ├── utilizadores.tsx
│   ├── equipas.tsx
│   ├── submissoes.tsx
│   ├── categorias.tsx
│   ├── missoes.tsx
│   ├── desafios.tsx
│   ├── campanhas.tsx
│   ├── estatisticas.tsx
│   └── exportar.tsx
│
├── index.tsx
├── register.tsx
└── _layout.tsx
```

## Base de dados

A base de dados encontra-se alojada no Supabase e utiliza PostgreSQL.

Entre as principais tabelas encontram-se:

* utilizadores;
* escolas;
* cursos;
* categorias_acao;
* catalogo_acoes;
* submissoes_acao;
* equipas;
* equipa_membros;
* equipa_convites;
* equipa_pedidos;
* conquistas.

## Licença

Projeto académico desenvolvido exclusivamente para fins de avaliação no âmbito da ESTG-IPVC.
