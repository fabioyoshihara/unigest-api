# Unigest API

API backend do projeto integrador **Sistema de Gestão de Universidade** do SENAC - Grupo 01.

A aplicação centraliza informações acadêmicas e administrativas de usuários, estudantes, professores, cursos, turmas, matrículas e fornecedores.

## Integrantes


| Nome                        | Responsabilidade                                |
|------                       |------------------                               |
| Fabio Yoshihara             | Responsável pela Bateria de Testes              |
| João Gabriel                | Integração e Desenvolvimento Front-end          |
| Júlio César Vilela Caria    | Desenvolvimento Back-End e Documentação da API  |
| Marcos Nazario              | Documentação                                    |
| Matheus Ferrari             | Documentação                                    |

## Stack tecnológica

| Tecnologia | Uso |
|---|---|
| Node.js | Execução do servidor |
| TypeScript | Desenvolvimento da API com tipagem estática |
| Fastify | Framework HTTP |
| Zod | Validação de dados e schemas da API |
| Drizzle ORM | Acesso e controle do banco de dados |
| PostgreSQL | Banco de dados relacional |
| Docker Compose | Provisionamento local do PostgreSQL |
| JSON Web Token | Autenticação das rotas protegidas |
| Argon2 | Hash seguro das senhas |
| Swagger / OpenAPI | Especificação da API |
| Scalar | Interface visual da documentação |

## Funcionalidades

- Autenticação por e-mail e senha
- Controle de usuários internos e perfis de acesso
- Cadastro e gerenciamento de estudantes
- Cadastro e gerenciamento de professores
- Cadastro e gerenciamento de fornecedores
- Cadastro e gerenciamento de cursos
- Cadastro e gerenciamento de turmas
- Matrículas que relacionam estudantes e turmas
- Exclusão lógica de recursos por meio do campo `isActive`
- Verificação de saúde da aplicação e da conexão com o banco
- Documentação interativa em ambiente de desenvolvimento

## Pré-requisitos

- Node.js 20 ou superior
- npm
- Docker Desktop, Docker Engine ou Docker Compose
- PostgreSQL, caso não utilize o Docker Compose

## Inicialização passo a passo

### 1. Clone o repositório

```bash
git clone https://github.com/julio-caria/P.I-Sistemas-Dinamicos-server.git
cd P.I-Sistemas-Dinamicos-server
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

**Linux/macOS:**

```bash
cp .env.example .env
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Preencha os valores necessários:

```dotenv
NODE_ENVIRONMENT="development"
PORT=3333
DOMAIN="unigest.edu.br"
JWT_SECRET="gere-uma-chave-secreta-forte-e-aleatoria"

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/unigest"
DATABASE_NAME="unigest"
DATABASE_USER="postgres"
DATABASE_PASSWORD="postgres"
```

> `JWT_SECRET` deve ser uma chave secreta forte e não deve ser compartilhada.
> Para o banco do Docker Compose, os valores padrão já estão definidos como `postgres/postgres` e banco `unigest`.

### 4. Inicie o PostgreSQL

```bash
docker compose up -d
```

Para verificar se o serviço está ativo:

```bash
docker compose ps
```

### 5. Gere e aplique as migrations

Caso seja necessário criar novas migrations a partir do schema:

```bash
npm run db:generate
```

Aplique as migrations existentes:

```bash
npm run db:migrate
```

### 6. Popule o banco com dados iniciais

```bash
npm run db:seed
```

O seed cria usuários, professores, estudantes, fornecedores, cursos e demais registros de demonstração. Ele utiliza `onConflictDoNothing`, então não substitui os dados já existentes.

Usuário administrativo criado pelo seed:

```text
E-mail: admin.sistema@unigest.edu.br
Senha: Admin@2026
```

### 7. Inicie a API

```bash
npm run dev
```

A API ficará disponível em:

- API: `http://localhost:3333`
- Health check: `http://localhost:3333/`
- Documentação Scalar: `http://localhost:3333/docs`
- OpenAPI JSON: `http://localhost:3333/openapi.json`

A documentação Swagger/Scalar é carregada quando `NODE_ENVIRONMENT=development`.

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor em modo desenvolvimento com hot reload |
| `npm run build` | Compila o TypeScript para a pasta `build/` |
| `npm start` | Executa a versão compilada |
| `npm run db:generate` | Gera migrations com o Drizzle Kit |
| `npm run db:migrate` | Aplica migrations no PostgreSQL |
| `npm run db:seed` | Insere dados iniciais no banco |
| `npm run db:studio` | Abre o Drizzle Studio |

## Executar em produção

```bash
npm run build
npm start
```

Em produção, configure `NODE_ENVIRONMENT=production` e mantenha `JWT_SECRET` e `DATABASE_URL` fora do controle de versão.

O ponto de entrada compilado é `build/index.js`.

## Autenticação

Obtenha um token JWT usando o endpoint de login:

```http
POST /api/v1/login
Content-Type: application/json

{
  "email": "admin.sistema@unigest.edu.br",
  "password": "Admin@2026"
}
```

Resposta:

```json
{
  "token": "<jwt>"
}
```

Envie o token nas rotas protegidas pelo cabeçalho:

```http
Authorization: Bearer <jwt>
```

## Principais endpoints

| Recurso | Caminho base |
|---|---|
| Health check | `/` |
| Autenticação | `/api/v1/login` |
| Usuários | `/api/v1/users` |
| Estudantes | `/api/v1/students` |
| Professores | `/api/v1/teachers` |
| Cursos | `/api/v1/courses` |
| Turmas | `/api/v1/classes` |
| Fornecedores | `/api/v1/suppliers` |

Cada recurso possui operações para consulta, criação, atualização completa, atualização parcial e exclusão lógica. Consulte `/docs` para visualizar parâmetros, bodies e respostas.

## Estrutura do projeto

```text
.
├── drizzle/                    # Migrations SQL geradas pelo Drizzle
├── src/
│   ├── config/
│   │   └── swagger.ts          # Configuração OpenAPI/Swagger
│   ├── database/
│   │   ├── client.ts           # Conexão PostgreSQL com Drizzle
│   │   ├── schema.ts           # Tabelas principais
│   │   ├── schema/
│   │   │   ├── enums.ts        # Enumerações do domínio
│   │   │   ├── index.ts        # Exportação central dos schemas
│   │   │   └── relations.ts    # Relações entre entidades
│   │   └── seed.ts             # Dados iniciais
│   ├── routes/
│   │   ├── auth/               # Login e autenticação
│   │   ├── classes/            # Operações de turmas
│   │   ├── courses/            # Operações de cursos
│   │   ├── students/           # Operações de estudantes
│   │   ├── suppliers/          # Operações de fornecedores
│   │   ├── teachers/           # Operações de professores
│   │   ├── users/              # Operações de usuários
│   │   ├── hooks/              # Validação de autenticação JWT
│   │   └── health.ts           # Health check
│   ├── types/                  # Tipos da aplicação
│   ├── utils/                  # Funções utilitárias
│   ├── @types/                 # Extensões de tipos
│   └── index.ts                # Inicialização do servidor e registro de rotas
├── .env.example
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── client.http                 # Exemplos de requisições HTTP
```

## Banco de dados

O PostgreSQL local é fornecido pelo `docker-compose.yml` com:

- Container: `unigest-postgres`
- Porta: `5432`
- Banco: `unigest`
- Usuário: `postgres`
- Senha: `postgres`
- Volume persistente: `postgres_data`

Para encerrar o banco:

```bash
docker compose down
```

Para encerrar o banco removendo também os dados persistidos:

```bash
docker compose down -v
```

> O comando `docker compose down -v` apaga todos os dados locais do banco.

## Testes manuais

O arquivo [`client.http`](./client.http) contém exemplos de login e operações da API. Ele pode ser executado por extensões compatíveis no VS Code, como a REST Client.

---

<div align="center">

**Unigest API**  
Sistema de Gestão de Universidade

Projeto Integrador - SENAC - Tecnologia em Sistemas para a Internet - 4º Semestre - Grupo 01.

Desenvolvido por [Júlio Caria](https://github.com/julio-caria)
</div>

----