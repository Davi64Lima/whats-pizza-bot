# 🍕 WhatsApp Pizza Bot

Bot de atendimento automatizado para pizzarias via WhatsApp, desenvolvido com arquitetura limpa e escalável.

## 🚀 Funcionalidades

- ✅ Cardápio interativo com sabores tradicionais, especiais e doces
- ✅ Pedidos com múltiplos sabores (Média/Grande: 2 sabores | Família: 3 sabores)
- ✅ Validação de endereço
- ✅ Múltiplas formas de pagamento (PIX, Cartão, Dinheiro)
- ✅ Confirmação de pedido
- ✅ Integração com API externa
- ✅ Backup local em arquivo JSON
- ✅ Gerenciamento de sessões por usuário

## 📁 Arquitetura

O projeto segue princípios de **Clean Architecture** com separação em camadas:

```
src/
├── config/          # Configurações
├── repositories/    # Acesso a dados (API, File)
├── services/        # Lógica de negócio
├── handlers/        # Interface (WhatsApp)
├── utils/           # Utilitários
└── index.js         # Bootstrap
```

📖 **[Ver documentação completa da arquitetura](docs/ARCHITECTURE.md)**

## 🛠️ Instalação

```bash
# Clone o repositório
git clone https://github.com/Davi64Lima/whats-pizza-bot.git
cd whats-pizza-bot

# Instale as dependências
npm install

# Configure as variáveis de ambiente (opcional)
cp .env.example .env
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
# URL da API de Pizzas
PIZZA_API_URL=http://localhost:3001

# Números de telefone permitidos (separados por vírgula)
ALLOWED_NUMBERS=557185350004,5571999999999

# Arquivo de log de pedidos
ORDERS_LOG_FILE=orders-log.json
```

## 🎯 Uso

```bash
# Iniciar o bot
npm start
```

Na primeira execução, será exibido um QR Code. Escaneie com o WhatsApp para conectar.

## 🔄 Como Trocar Serviços Externos

### Trocar API de Pizzas

1. Crie um novo repository em `src/repositories/`:

```javascript
export class NovaApiRepository {
  async getMenuItems() {
    /* implementação */
  }
  async createOrder(order) {
    /* implementação */
  }
}
```

2. Atualize `src/index.js`:

```javascript
import { NovaApiRepository } from "./repositories/novaApiRepository.js";
const pizzaApiRepository = new NovaApiRepository();
```

### Trocar Armazenamento (Arquivo → Banco de Dados)

1. Crie `src/repositories/databaseRepository.js`
2. Implemente os métodos `saveOrder()` e `getOrders()`
3. Atualize o `index.js`

### Adicionar Novo Canal (Telegram, Discord, etc)

1. Crie `src/handlers/telegramHandler.js`
2. Reutilize o mesmo `OrderFlowHandler`
3. Inicialize no `index.js`

📖 **[Ver exemplos completos](docs/EXAMPLES.md)**

## 🧪 Testes

```bash
# Executar testes (quando implementados)
npm test
```

## 📚 Documentação

- 📖 [Arquitetura](docs/ARCHITECTURE.md) - Explicação detalhada da estrutura
- 📖 [Exemplos](docs/EXAMPLES.md) - Como adicionar novas funcionalidades
- 📖 [Resumo da Refatoração](docs/REFACTORING_SUMMARY.md) - O que mudou

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 👤 Autor

Desenvolvido por [Davi64Lima](https://github.com/Davi64Lima)

---

⭐ Se este projeto te ajudou, considere dar uma estrela!
