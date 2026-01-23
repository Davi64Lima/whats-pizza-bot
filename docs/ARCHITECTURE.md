# Arquitetura do WhatsApp Pizza Bot

## 📁 Estrutura do Projeto

```
src/
├── config/                    # Configurações da aplicação
│   └── index.js              # Configurações centralizadas (API, WhatsApp, etc)
│
├── repositories/              # Camada de Acesso a Dados (DAL)
│   ├── pizzaApiRepository.js # Comunicação com API de Pizzas
│   └── fileStorageRepository.js # Armazenamento em arquivo JSON
│
├── services/                  # Camada de Lógica de Negócio (BLL)
│   ├── sessionService.js     # Gerenciamento de sessões de usuário
│   ├── menuService.js        # Lógica de cardápio
│   └── orderService.js       # Lógica de pedidos
│
├── handlers/                  # Camada de Apresentação/Interface
│   ├── whatsAppHandler.js    # Gerencia conexão WhatsApp
│   └── orderFlowHandler.js   # Orquestra fluxo de pedidos
│
├── utils/                     # Utilitários e Helpers
│   ├── textUtils.js          # Funções de manipulação de texto
│   └── orderParser.js        # Parser de itens de pedido
│
└── index.js                   # Ponto de entrada (Bootstrap)
```

## 🏗️ Princípios de Arquitetura

### 1. **Separação de Responsabilidades (SoC)**

Cada camada tem uma responsabilidade específica e bem definida:

- **Repositories**: Acesso a dados externos (APIs, arquivos, banco de dados)
- **Services**: Lógica de negócio e regras da aplicação
- **Handlers**: Interface com o usuário (WhatsApp, Web, CLI, etc)
- **Utils**: Funções reutilizáveis sem dependências

### 2. **Dependency Injection (DI)**

Todas as dependências são injetadas via construtor, facilitando:

- Testes unitários (mock das dependências)
- Substituição de implementações
- Rastreamento de dependências

### 3. **Inversão de Dependência**

Camadas superiores dependem de abstrações, não de implementações concretas.

### 4. **Single Responsibility Principle**

Cada classe tem uma única responsabilidade.

## 🔄 Fluxo de Dados

```
WhatsApp → WhatsAppHandler → OrderFlowHandler → Services → Repositories → API/File
                                    ↓
                                  Utils
```

## 🔧 Como Trocar Implementações

### Trocar API de Pizzas

1. Crie um novo repository implementando os mesmos métodos:

```javascript
// repositories/newPizzaApiRepository.js
export class NewPizzaApiRepository {
  async getMenuItems() {
    /* nova implementação */
  }
  async createOrder(order) {
    /* nova implementação */
  }
}
```

2. Atualize o `index.js`:

```javascript
import { NewPizzaApiRepository } from "./repositories/newPizzaApiRepository.js";

const pizzaApiRepository = new NewPizzaApiRepository();
```

### Trocar Armazenamento (Arquivo → Banco de Dados)

1. Crie um novo repository:

```javascript
// repositories/databaseRepository.js
export class DatabaseRepository {
  async saveOrder(order, failed) {
    /* salvar no DB */
  }
  async getOrders() {
    /* buscar do DB */
  }
}
```

2. Atualize o `index.js`:

```javascript
import { DatabaseRepository } from "./repositories/databaseRepository.js";

const storageRepository = new DatabaseRepository();
```

### Trocar Interface (WhatsApp → Telegram)

1. Crie um novo handler:

```javascript
// handlers/telegramHandler.js
export class TelegramHandler {
  constructor(messageHandler) {
    this.messageHandler = messageHandler;
  }

  initialize() {
    /* inicializar Telegram */
  }
  async handleIncomingMessage(message) {
    // Processar mensagem do Telegram
    const reply = await this.messageHandler.handleMessage({ phone, text });
    // Enviar resposta via Telegram
  }
}
```

2. Atualize o `index.js`:

```javascript
import { TelegramHandler } from "./handlers/telegramHandler.js";

const telegramHandler = new TelegramHandler(orderFlowHandler);
telegramHandler.initialize();
```

## 🧪 Testabilidade

A arquitetura facilita testes isolados:

```javascript
// Exemplo de teste do OrderService
import { OrderService } from "./services/orderService.js";

// Mock dos repositories
const mockApiRepo = {
  createOrder: jest.fn().mockResolvedValue({ id: "123" }),
};

const mockFileRepo = {
  saveOrder: jest.fn(),
};

// Teste isolado
const orderService = new OrderService(mockApiRepo, mockFileRepo);
await orderService.submitOrder(order);

expect(mockApiRepo.createOrder).toHaveBeenCalledWith(order);
expect(mockFileRepo.saveOrder).toHaveBeenCalled();
```

## 📦 Benefícios

✅ **Manutenibilidade**: Código organizado e fácil de entender  
✅ **Escalabilidade**: Fácil adicionar novos recursos  
✅ **Testabilidade**: Componentes isolados e mockáveis  
✅ **Reutilização**: Services podem ser usados em diferentes interfaces  
✅ **Flexibilidade**: Troca fácil de implementações externas

## 🚀 Próximos Passos

1. **Adicionar testes unitários** para cada camada
2. **Criar interfaces TypeScript** para garantir contratos
3. **Implementar logging centralizado** (Winston, Pino)
4. **Adicionar validações com Zod/Joi**
5. **Implementar cache** (Redis) no MenuService
6. **Adicionar monitoramento** (Sentry, DataDog)
