# Diagrama de Fluxo da Aplicação

## 📊 Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERFACE LAYER                       │
│  ┌────────────────────┐         ┌──────────────────────┐   │
│  │  WhatsAppHandler   │────────▶│  OrderFlowHandler    │   │
│  │  - initialize()    │         │  - handleMessage()   │   │
│  │  - sendMessage()   │         │  - handleStates()    │   │
│  └────────────────────┘         └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │SessionService│  │ MenuService  │  │OrderService  │     │
│  │- getSession()│  │- getMenu()   │  │- submitOrder()│    │
│  │- reset()     │  │- formatPrice()│  │- validate()  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                      │
│  ┌────────────────────┐         ┌──────────────────────┐   │
│  │PizzaApiRepository  │         │FileStorageRepository │   │
│  │- getMenuItems()    │         │ - saveOrder()        │   │
│  │- createOrder()     │         │ - getOrders()        │   │
│  └────────────────────┘         └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                     │
│         ┌──────────────┐              ┌──────────┐          │
│         │  Pizza API   │              │  File    │          │
│         │  (HTTP/REST) │              │  System  │          │
│         └──────────────┘              └──────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de uma Mensagem

```
1. Usuário envia mensagem via WhatsApp
                │
                ▼
2. WhatsAppHandler recebe mensagem
                │
                ▼
3. WhatsAppHandler → OrderFlowHandler.handleMessage()
                │
                ▼
4. OrderFlowHandler verifica estado da sessão (SessionService)
                │
                ▼
5. OrderFlowHandler processa com Services apropriados
                │
   ├─ MenuService.getFormattedMenu()
   │         └─ PizzaApiRepository.getMenuItems()
   │
   ├─ OrderParser.parseItem()
   │         └─ MenuService.getActiveFlavors()
   │
   └─ OrderService.submitOrder()
             ├─ PizzaApiRepository.createOrder()
             └─ FileStorageRepository.saveOrder()
                │
                ▼
6. Resposta retorna para WhatsAppHandler
                │
                ▼
7. WhatsAppHandler.sendMessage() envia ao usuário
```

## 🎯 Injeção de Dependências (index.js)

```javascript
// 1. Repositories (Dados Externos)
pizzaApiRepository ────┐
                       │
fileStorageRepository ─┤
                       │
                       ▼
// 2. Services (Lógica de Negócio)
sessionService ────────┐
                       │
menuService ───────────┤  (usa pizzaApiRepository)
                       │
orderService ──────────┤  (usa pizzaApi + fileStorage)
                       │
                       ▼
// 3. Utils
orderParser ───────────┤  (usa menuService)
                       │
                       ▼
// 4. Handlers (Interface)
orderFlowHandler ──────┤  (usa todos os services + parser)
                       │
                       ▼
whatsAppHandler ───────┘  (usa orderFlowHandler)
```

## 🔌 Como Trocar Implementações

### Exemplo: Trocar WhatsApp por Telegram

```
ANTES:
┌──────────────┐
│  WhatsApp    │ ──▶ OrderFlowHandler ──▶ Services ──▶ Repositories
└──────────────┘

DEPOIS (sem mudar nada além do handler):
┌──────────────┐
│  Telegram    │ ──▶ OrderFlowHandler ──▶ Services ──▶ Repositories
└──────────────┘
         │
         └─ Mesmo OrderFlowHandler, mesmos Services!
```

### Exemplo: Trocar API de Pizzas

```
ANTES:
Handlers ──▶ Services ──▶ PizzaApiRepository ──▶ API Antiga

DEPOIS:
Handlers ──▶ Services ──▶ NovaApiRepository ──▶ API Nova
         │                        │
         └─ Mesmos handlers!      └─ Mesma interface!
```

### Exemplo: Adicionar Telegram + WhatsApp simultaneamente

```
┌──────────────┐
│  WhatsApp    │ ────┐
└──────────────┘     │
                     ▼
                OrderFlowHandler ──▶ Services ──▶ Repositories
                     ▲
┌──────────────┐     │
│  Telegram    │ ────┘
└──────────────┘

Ambos usam o MESMO OrderFlowHandler e Services!
```

## 📦 Benefícios da Arquitetura

### ✅ Separação de Responsabilidades

- **Handlers**: Só sabem receber/enviar mensagens
- **Services**: Só sabem regras de negócio
- **Repositories**: Só sabem acessar dados externos

### ✅ Testabilidade

```javascript
// Mock dos repositories para testar services
const mockApi = { createOrder: jest.fn() };
const service = new OrderService(mockApi, mockFile);
```

### ✅ Reutilização

```javascript
// Mesmo service em diferentes contextos
httpHandler.use(orderService); // API REST
whatsAppHandler.use(orderService); // WhatsApp
telegramHandler.use(orderService); // Telegram
```

### ✅ Manutenção

- Bug no cardápio? → Olhe em `MenuService`
- Problema com API? → Olhe em `PizzaApiRepository`
- Erro no WhatsApp? → Olhe em `WhatsAppHandler`

## 🎓 Padrões Utilizados

1. **Repository Pattern** - Abstração de acesso a dados
2. **Service Layer** - Lógica de negócio isolada
3. **Dependency Injection** - Inversão de controle
4. **Single Responsibility** - Cada classe, uma responsabilidade
5. **Open/Closed Principle** - Aberto para extensão

---

**Esta arquitetura torna o projeto escalável, testável e de fácil manutenção! 🚀**
