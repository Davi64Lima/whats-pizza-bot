# Exemplos de Extensão

Este documento mostra como adicionar novas funcionalidades ao sistema.

## 📝 Exemplo 1: Adicionar Nova Forma de Pagamento (PIX com QR Code)

### 1. Adicionar lógica no OrderService

```javascript
// services/orderService.js

async generatePixQrCode(order) {
  // Chama API de pagamento
  const pixData = await this.paymentRepository.createPixPayment(order);
  return pixData.qrCode;
}
```

### 2. Criar novo repository para pagamentos

```javascript
// repositories/paymentRepository.js

export class PaymentRepository {
  constructor(paymentApiUrl) {
    this.apiUrl = paymentApiUrl;
  }

  async createPixPayment(order) {
    const response = await axios.post(`${this.apiUrl}/pix`, {
      amount: order.total,
      orderId: order.id,
    });
    return response.data;
  }
}
```

### 3. Adicionar estado no OrderFlowHandler

```javascript
// handlers/orderFlowHandler.js

case "ASK_PAYMENT":
  if (text.toLowerCase() === "pix") {
    session.state = "GENERATING_PIX";
    const qrCode = await this.orderService.generatePixQrCode(order);
    return `Pagamento PIX gerado!\n\n${qrCode}\n\nDigite "pago" quando finalizar.`;
  }
  // ... resto do código
```

### 4. Atualizar index.js

```javascript
// index.js

const paymentRepository = new PaymentRepository(config.paymentApiUrl);
const orderService = new OrderService(
  pizzaApiRepository,
  fileStorageRepository,
  paymentRepository, // Nova dependência
);
```

## 📊 Exemplo 2: Adicionar Analytics/Métricas

### 1. Criar repository para analytics

```javascript
// repositories/analyticsRepository.js

export class AnalyticsRepository {
  constructor(analyticsService) {
    this.service = analyticsService; // Google Analytics, Mixpanel, etc
  }

  trackEvent(event, properties) {
    this.service.track(event, properties);
  }

  trackOrderCreated(order) {
    this.trackEvent("order_created", {
      orderId: order.code,
      totalItems: order.products.length,
      paymentMethod: order.payment,
    });
  }

  trackMenuViewed(userId) {
    this.trackEvent("menu_viewed", { userId });
  }
}
```

### 2. Integrar no OrderService

```javascript
// services/orderService.js

constructor(pizzaApiRepository, fileStorageRepository, analyticsRepository) {
  this.pizzaApiRepository = pizzaApiRepository;
  this.fileStorageRepository = fileStorageRepository;
  this.analyticsRepository = analyticsRepository;
}

async submitOrder(order) {
  try {
    const result = await this.pizzaApiRepository.createOrder(order);
    this.fileStorageRepository.saveOrder(order, false);

    // Track analytics
    this.analyticsRepository?.trackOrderCreated(order);

    return { success: true, data: result };
  } catch (error) {
    this.fileStorageRepository.saveOrder(order, true);
    return { success: false, error: error.message };
  }
}
```

### 3. Adicionar no MenuService

```javascript
// services/menuService.js

async getFormattedMenu(userId) {
  this.analyticsRepository?.trackMenuViewed(userId);

  const flavors = await this.pizzaApiRepository.getMenuItems();
  // ... resto do código
}
```

## 🔔 Exemplo 3: Adicionar Notificações (E-mail ou SMS)

### 1. Criar repository de notificações

```javascript
// repositories/notificationRepository.js

export class NotificationRepository {
  constructor(emailService, smsService) {
    this.emailService = emailService;
    this.smsService = smsService;
  }

  async sendOrderConfirmation(order) {
    const message = `Pedido ${order.code} confirmado!`;

    // Envia e-mail
    if (order.customer.email) {
      await this.emailService.send({
        to: order.customer.email,
        subject: "Pedido Confirmado",
        body: message,
      });
    }

    // Envia SMS
    if (order.customer.phone) {
      await this.smsService.send({
        to: order.customer.phone,
        message: message,
      });
    }
  }

  async notifyKitchen(order) {
    // Notifica a cozinha sobre novo pedido
    await this.emailService.send({
      to: "cozinha@pizzaria.com",
      subject: `Novo Pedido: ${order.code}`,
      body: JSON.stringify(order, null, 2),
    });
  }
}
```

### 2. Integrar no OrderService

```javascript
// services/orderService.js

async submitOrder(order) {
  try {
    const result = await this.pizzaApiRepository.createOrder(order);
    this.fileStorageRepository.saveOrder(order, false);

    // Notificações
    await this.notificationRepository?.sendOrderConfirmation(order);
    await this.notificationRepository?.notifyKitchen(order);

    return { success: true, data: result };
  } catch (error) {
    this.fileStorageRepository.saveOrder(order, true);
    return { success: false, error: error.message };
  }
}
```

## 🎯 Exemplo 4: Adicionar Sistema de Promoções

### 1. Criar service de promoções

```javascript
// services/promotionService.js

export class PromotionService {
  constructor(promotionRepository) {
    this.promotionRepository = promotionRepository;
  }

  async getActivePromotions() {
    const promotions = await this.promotionRepository.getActivePromotions();
    return promotions;
  }

  async applyPromotions(order) {
    const promotions = await this.getActivePromotions();

    for (const promo of promotions) {
      if (this.isApplicable(order, promo)) {
        order.discount = promo.discount;
        order.promotionCode = promo.code;
      }
    }

    return order;
  }

  isApplicable(order, promotion) {
    // Lógica para verificar se promoção se aplica
    if (promotion.type === "MIN_VALUE") {
      return order.total >= promotion.minValue;
    }

    if (promotion.type === "DAY_OF_WEEK") {
      const today = new Date().getDay();
      return promotion.days.includes(today);
    }

    return false;
  }
}
```

### 2. Integrar no OrderFlowHandler

```javascript
// handlers/orderFlowHandler.js

async handleConfirmingState(session, text, phone) {
  const t = text.toLowerCase();

  if (["sim", "s", "ok"].includes(t)) {
    session.state = "DONE";

    // Aplicar promoções antes de submeter
    const orderWithPromotions = await this.promotionService?.applyPromotions(
      session.order
    );

    const result = await this.orderService.submitOrder(orderWithPromotions);
    // ... resto do código
  }
}
```

## 🌐 Exemplo 5: Adicionar API REST para Dashboard Web

### 1. Criar novo handler para HTTP

```javascript
// handlers/httpHandler.js

import express from "express";

export class HttpHandler {
  constructor(orderService, menuService, sessionService) {
    this.orderService = orderService;
    this.menuService = menuService;
    this.sessionService = sessionService;
    this.app = express();

    this.setupRoutes();
  }

  setupRoutes() {
    this.app.get("/api/menu", async (req, res) => {
      const menu = await this.menuService.getActiveFlavors();
      res.json(menu);
    });

    this.app.get("/api/orders", async (req, res) => {
      const orders = this.orderService.getAllOrders();
      res.json(orders);
    });

    this.app.post("/api/orders", async (req, res) => {
      const result = await this.orderService.submitOrder(req.body);
      res.json(result);
    });
  }

  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(`API HTTP rodando na porta ${port}`);
    });
  }
}
```

### 2. Atualizar index.js

```javascript
// index.js

import { HttpHandler } from "./handlers/httpHandler.js";

// ... código existente ...

// Adicionar handler HTTP
const httpHandler = new HttpHandler(orderService, menuService, sessionService);

httpHandler.start(3000);
```

## 💡 Dicas

1. **Sempre injete dependências** via construtor
2. **Mantenha services sem estado** (stateless)
3. **Use repositories para I/O** (API, DB, File)
4. **Handlers gerenciam apenas interface** (HTTP, WhatsApp, etc)
5. **Utils não devem ter dependências** de serviços
