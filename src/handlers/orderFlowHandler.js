/**
 * Handler responsável por processar o fluxo de pedidos via WhatsApp
 * Orquestra os services para gerenciar a conversa com o usuário
 */
export class OrderFlowHandler {
  constructor(sessionService, menuService, orderService, orderParser) {
    this.sessionService = sessionService;
    this.menuService = menuService;
    this.orderService = orderService;
    this.orderParser = orderParser;
  }

  /**
   * Processa mensagem recebida do usuário
   * @param {Object} params - Parâmetros da mensagem
   * @param {string} params.phone - Telefone do usuário
   * @param {string} params.text - Texto da mensagem
   * @returns {Promise<string>} Resposta para o usuário
   */
  async handleMessage({ phone, text }) {
    const session = this.sessionService.getSession(phone);
    const { state, order } = session;

    // Comandos globais
    if (["menu", "cardapio", "cardápio"].includes(text.toLowerCase())) {
      return this.menuService.getFormattedMenu();
    }

    if (["cancelar", "recomeçar", "recomecar"].includes(text.toLowerCase())) {
      this.sessionService.resetSession(phone);
      return "Pedido cancelado e conversa reiniciada. Se quiser fazer um novo pedido, mande qualquer mensagem.";
    }

    // Delega para o handler específico do estado
    switch (state) {
      case "IDLE":
        return this.handleIdleState(session);

      case "CHOOSING_OR_MENU":
        return this.handleChoosingOrMenuState(session, text);

      case "AFTER_MENU":
        return this.handleAfterMenuState(session, text);

      case "ASK_NAME":
        return this.handleAskNameState(session, text);

      case "CHOOSING_ITEMS":
        return this.handleChoosingItemsState(session, text);

      case "ASK_ADDRESS":
        return this.handleAskAddressState(session, text);

      case "ASK_PAYMENT":
        return this.handleAskPaymentState(session, text);

      case "ASK_OBSERVATION":
        return this.handleAskObservationState(session, text);

      case "CONFIRMING":
        return this.handleConfirmingState(session, text, phone);

      default:
        this.sessionService.resetSession(phone);
        return "Tive um problema com o fluxo. Vamos recomeçar. Mande qualquer mensagem para iniciar o pedido.";
    }
  }

  handleIdleState(session) {
    session.state = "CHOOSING_OR_MENU";
    return (
      "Oi! Eu sou o assistente da Pizzaria 🍕\n\n" +
      "Digite:\n" +
      "1 - Ver cardápio\n" +
      "2 - Fazer um pedido\n" +
      "3 - Falar com atendente humano"
    );
  }

  async handleChoosingOrMenuState(session, text) {
    if (text === "1") {
      session.state = "AFTER_MENU";
      const menu = await this.menuService.getFormattedMenu();
      return menu + '\n\nSe quiser fazer um pedido, responda com "2".';
    }

    if (text === "2") {
      session.state = "ASK_NAME";
      return "Perfeito! Qual o seu nome?";
    }

    if (text === "3") {
      this.sessionService.resetSession(session.order.customer.phone);
      return "Ok, vou chamar um atendente humano. Aguarde um momento, por favor.";
    }

    return "Opção inválida. Digite 1 (cardápio), 2 (pedido) ou 3 (atendente).";
  }

  handleAfterMenuState(session, text) {
    if (text === "2") {
      session.state = "ASK_NAME";
      return "Vamos lá! Qual o seu nome?";
    }
    return 'Se quiser fazer um pedido, responda com "2".';
  }

  handleAskNameState(session, text) {
    session.order.customer.name = text;
    session.state = "CHOOSING_ITEMS";
    return (
      `Prazer, ${session.order.customer.name}! Vamos ao seu pedido.\n\n` +
      "Envie cada item no formato:\n" +
      "`sabor(es), tamanho, quantidade`\n\n" +
      "*Tamanhos:* média, grande, família\n" +
      "*Sabores:* Média/Grande até 2 sabores | Família até 3 sabores\n" +
      "Separe sabores com `/`\n\n" +
      "Exemplos:\n" +
      "`calabresa, média, 1`\n" +
      "`calabresa/frango, grande, 2`\n" +
      "`mussarela/portuguesa/bacon, família, 1`\n\n" +
      "Quando terminar, digite: finalizar"
    );
  }

  async handleChoosingItemsState(session, text) {
    if (text.toLowerCase() === "finalizar") {
      if (session.order.products.length === 0) {
        return "Você ainda não adicionou nenhum item. Envie pelo menos um item antes de finalizar.";
      }
      session.state = "ASK_ADDRESS";
      return "Certo! Agora me envie o endereço completo (rua, número, bairro e ponto de referência, se tiver).";
    }

    const item = await this.orderParser.parseItem(text);

    if (!item) {
      return (
        "Não entendi este item. Use o formato:\n" +
        "`sabor(es), tamanho, quantidade`\n\n" +
        "Exemplos:\n" +
        "`calabresa, média, 1`\n" +
        "`calabresa/frango, grande, 2`\n\n" +
        'Ou digite "finalizar" para encerrar a seleção.'
      );
    }

    if (item.error) {
      return item.error;
    }

    session.order.products.push(item);
    return (
      `Adicionei: ${item.quantity}x ${item.name}.\n` +
      'Envie outro item ou digite "finalizar".'
    );
  }

  handleAskAddressState(session, text) {
    const addressValidation = this.orderService.validateAddress(text);

    if (!addressValidation.valid) {
      return addressValidation.message;
    }

    const address = text.split(",").map((part) => part.trim());
    session.order.address.street = address[0] || "";
    session.order.address.number = address[1] || "";
    session.order.address.neighborhood = address[2] || "";
    session.order.address.complement = address.slice(3).join(", ") || "";

    session.state = "ASK_PAYMENT";
    return "Qual a forma de pagamento? (pix, cartão, dinheiro)";
  }

  handleAskPaymentState(session, text) {
    const payment = text.toLowerCase();

    if (!["pix", "cartao", "cartão", "dinheiro"].includes(payment)) {
      return "Forma de pagamento inválida. Use: pix, cartão ou dinheiro.";
    }

    session.order.payment = this.orderService.normalizePayment(payment);
    session.state = "ASK_OBSERVATION";

    return "Tem alguma observação para o pedido? (Ex: sem cebola, bem passada, etc.)\n\nSe não tiver, digite: não";
  }

  handleAskObservationState(session, text) {
    const t = text.toLowerCase();

    if (!["nao", "não", "n"].includes(t)) {
      session.order.observation = text;
    }

    session.state = "CONFIRMING";
    return this.orderService.buildConfirmationMessage(session.order);
  }

  async handleConfirmingState(session, text, phone) {
    const t = text.toLowerCase();

    if (["sim", "s", "ok"].includes(t)) {
      session.state = "DONE";

      const result = await this.orderService.submitOrder(session.order);

      this.sessionService.resetSession(phone);

      if (result.success) {
        return (
          "Pedido confirmado e registrado no sistema! 🎉\n" +
          "Em breve vamos te avisar quando estiver pronto. Obrigado!"
        );
      } else {
        return (
          "Seu pedido foi recebido, mas tivemos um problema ao registrar no sistema interno.\n" +
          "Um atendente irá conferir manualmente. Desculpe o transtorno."
        );
      }
    }

    if (["nao", "não", "n"].includes(t)) {
      this.sessionService.resetSession(phone);
      return "Sem problemas! Vamos recomeçar. Mande qualquer mensagem para iniciar um novo pedido.";
    }

    return 'Por favor, responda "sim" para confirmar o pedido ou "nao" para recomeçar.';
  }
}
