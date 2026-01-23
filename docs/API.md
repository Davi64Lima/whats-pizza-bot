# 📡 Documentação da API REST

API REST para disparar mensagens e gerenciar o bot de pedidos de pizza.

## 🚀 Base URL

```
http://localhost:3000/api
```

## 📋 Endpoints

### 1. Health Check

Verifica se a API está rodando.

**GET** `/health`

**Resposta:**

```json
{
  "success": true,
  "status": "running",
  "timestamp": "2026-01-23T10:30:00.000Z"
}
```

---

### 2. Enviar Mensagem

Envia uma mensagem para um número específico.

**POST** `/api/messages/send`

**Body:**

```json
{
  "phone": "5511999999999",
  "message": "Olá! Temos uma promoção especial para você!"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "phone": "5511999999999",
    "message": "Olá! Temos uma promoção especial para você!"
  }
}
```

---

### 3. Broadcast (Mensagem em Massa)

Envia a mesma mensagem para múltiplos números.

**POST** `/api/messages/broadcast`

**Body:**

```json
{
  "phones": ["5511999999999", "5511888888888", "5511777777777"],
  "message": "🎉 PROMOÇÃO: Pizza Família por R$ 45,00!"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Broadcast completed",
  "data": [
    { "phone": "5511999999999", "status": "sent" },
    { "phone": "5511888888888", "status": "sent" },
    { "phone": "5511777777777", "status": "failed", "error": "Invalid number" }
  ]
}
```

---

### 4. Enviar Template

Envia uma mensagem usando um template pré-definido.

**POST** `/api/messages/template`

**Body:**

```json
{
  "phone": "5511999999999",
  "templateName": "promotion",
  "variables": {
    "promotionText": "Compre 2 pizzas e ganhe 1 refrigerante!"
  }
}
```

**Templates disponíveis:**

- `welcome` - Mensagem de boas-vindas
- `promotion` - Mensagem de promoção
- `orderConfirmed` - Confirmação de pedido
- `orderReady` - Pedido pronto para entrega
- `thankYou` - Agradecimento

**Resposta:**

```json
{
  "success": true,
  "message": "Template sent successfully",
  "data": {
    "phone": "5511999999999",
    "templateName": "promotion",
    "message": "🎉 *PROMOÇÃO ESPECIAL* 🎉..."
  }
}
```

---

### 5. Simular Mensagem Recebida

Simula uma mensagem recebida de um cliente (útil para testes).

**POST** `/api/messages/simulate`

**Body:**

```json
{
  "phone": "5511999999999",
  "text": "oi"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Message simulated successfully",
  "data": {
    "phone": "5511999999999",
    "text": "oi",
    "response": "Olá! Bem-vindo à Pizzaria X..."
  }
}
```

---

### 6. Obter Sessão

Retorna a sessão atual de um cliente.

**GET** `/api/sessions/:phone`

**Exemplo:** `/api/sessions/5511999999999`

**Resposta:**

```json
{
  "success": true,
  "data": {
    "state": "CHOOSING_ITEMS",
    "order": {
      "customer": {
        "name": "João Silva",
        "phone": "5511999999999"
      },
      "products": []
    }
  }
}
```

---

### 7. Resetar Sessão

Reseta a sessão de um cliente.

**DELETE** `/api/sessions/:phone`

**Exemplo:** `/api/sessions/5511999999999`

**Resposta:**

```json
{
  "success": true,
  "message": "Session reset successfully"
}
```

---

### 8. Listar Todas as Sessões

Lista todas as sessões ativas.

**GET** `/api/sessions`

**Resposta:**

```json
{
  "success": true,
  "data": {
    "5511999999999": {
      "state": "CHOOSING_ITEMS",
      "order": { ... }
    },
    "5511888888888": {
      "state": "ASK_ADDRESS",
      "order": { ... }
    }
  }
}
```

---

### 9. Obter Cardápio

Retorna o texto formatado do cardápio.

**GET** `/api/menu`

**Resposta:**

```json
{
  "success": true,
  "data": {
    "menuText": "🍕 *Cardápio Pizzaria X* 🍕\n\n*Pizzas Tradicionais*..."
  }
}
```

---

### 10. Webhook

Recebe notificações de eventos externos (pedidos criados, prontos, entregues).

**POST** `/api/webhook`

**Body:**

```json
{
  "event": "order.ready",
  "data": {
    "phone": "5511999999999",
    "orderId": "123456"
  }
}
```

**Eventos suportados:**

- `order.created` - Pedido criado
- `order.ready` - Pedido pronto
- `order.delivered` - Pedido entregue

**Resposta:**

```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

## 🔐 Autenticação

Atualmente a API não possui autenticação. Para produção, recomenda-se adicionar:

- API Keys
- JWT Tokens
- Rate Limiting

## 🧪 Exemplos de Uso

### cURL

```bash
# Enviar mensagem
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"Olá!"}'

# Broadcast
curl -X POST http://localhost:3000/api/messages/broadcast \
  -H "Content-Type: application/json" \
  -d '{"phones":["5511999999999"],"message":"Promoção!"}'
```

### JavaScript (Fetch)

```javascript
// Enviar mensagem
const response = await fetch("http://localhost:3000/api/messages/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    phone: "5511999999999",
    message: "Olá!",
  }),
});

const data = await response.json();
console.log(data);
```

### Python (Requests)

```python
import requests

# Enviar mensagem
response = requests.post(
    'http://localhost:3000/api/messages/send',
    json={
        'phone': '5511999999999',
        'message': 'Olá!'
    }
)

print(response.json())
```

## 📊 Códigos de Status

- `200` - Sucesso
- `400` - Requisição inválida
- `500` - Erro no servidor

## 🔗 Integrações Possíveis

1. **Sistema de Delivery**
   - Notificar clientes quando pedido estiver pronto
   - Enviar localização do entregador

2. **CRM**
   - Disparar campanhas de marketing
   - Enviar mensagens personalizadas

3. **Dashboard Admin**
   - Visualizar sessões ativas
   - Gerenciar pedidos em tempo real

4. **Automação**
   - Agendar mensagens
   - Enviar lembretes automáticos
