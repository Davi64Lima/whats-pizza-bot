/**
 * Service responsável por lógica de negócio de pedidos
 */
export class OrderService {
  constructor(pizzaApiRepository, fileStorageRepository) {
    this.pizzaApiRepository = pizzaApiRepository;
    this.fileStorageRepository = fileStorageRepository;
  }

  /**
   * Envia um pedido para a API e salva no arquivo
   * @param {Object} order - Dados do pedido
   * @returns {Promise<Object>} Resultado do envio
   */
  async submitOrder(order) {
    try {
      const result = await this.pizzaApiRepository.createOrder(order);
      this.fileStorageRepository.saveOrder(order, false);
      return { success: true, data: result };
    } catch (error) {
      // Mesmo em erro, salva localmente
      this.fileStorageRepository.saveOrder(order, true);
      return { success: false, error: error.message };
    }
  }

  /**
   * Constrói a mensagem de confirmação do pedido
   * @param {Object} order - Dados do pedido
   * @returns {string} Mensagem formatada
   */
  buildConfirmationMessage(order) {
    const itensTexto = order.products
      .map((i, idx) => {
        return `${idx + 1}) ${i.quantity}x ${i.name}`;
      })
      .join("\n");

    return (
      "Confere seu pedido?\n\n" +
      `Nome: ${order.customer.name}\n` +
      `Telefone: ${order.customer.phone}\n` +
      `Itens:\n${itensTexto}\n\n` +
      `Endereço: ${order.address.street}, ${order.address.number}, ${order.address.neighborhood}, ${order.address.complement}\n` +
      `Pagamento: ${order.payment}\n\n` +
      "Responda *sim* para confirmar ou *nao* para recomeçar."
    );
  }

  /**
   * Valida um endereço
   * @param {string} address - Endereço a validar
   * @returns {Object} Resultado da validação
   */
  validateAddress(address) {
    if (!address || address.trim().length < 10) {
      return {
        valid: false,
        message:
          "Endereço muito curto. Por favor, envie o endereço completo com rua, número e bairro.",
      };
    }

    const addressLower = address.toLowerCase();
    const hasNumber = /\d+/.test(address);
    const hasStreet =
      /\b(rua|avenida|av|alameda|travessa|rodovia|estrada|praça)\b/i.test(
        addressLower,
      );
    const wordCount = address.trim().split(/\s+/).length;

    if (!hasNumber) {
      return {
        valid: false,
        message:
          "Por favor, inclua o número no endereço.\n\nExemplo: Rua Carlos Marighella, 102, Bairro Novo",
      };
    }

    if (!hasStreet && wordCount < 4) {
      return {
        valid: false,
        message:
          "Por favor, envie um endereço mais completo.\n\nExemplo: Rua Carlos Marighella, 102, Bairro Novo, próximo ao mercado",
      };
    }

    if (wordCount < 3) {
      return {
        valid: false,
        message:
          "Endereço incompleto. Por favor, envie rua, número e bairro.\n\nExemplo: Rua Carlos Marighella, 102, Bairro Novo",
      };
    }

    return { valid: true };
  }

  /**
   * Normaliza forma de pagamento
   * @param {string} payment - Forma de pagamento
   * @returns {string} Forma normalizada
   */
  normalizePayment(payment) {
    if (payment === "pix") return "pix";
    if (payment.startsWith("cart")) return "cartao";
    if (payment === "dinheiro") return "dinheiro";
    return payment;
  }
}
