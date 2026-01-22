import { getSession, resetSession } from "./sessionManager.js";
import { enviarPedidoParaApi } from "./apiClient.js";

export async function handleIncomingMessage({ phone, text }) {
  const session = getSession(phone);
  const { state, order } = session;

  // Comandos globais
  if (["menu", "cardapio", "cardápio"].includes(text.toLowerCase())) {
    return getMenuText();
  }
  if (["cancelar", "recomeçar", "recomecar"].includes(text.toLowerCase())) {
    resetSession(phone);
    return "Pedido cancelado e conversa reiniciada. Se quiser fazer um novo pedido, mande qualquer mensagem.";
  }

  switch (state) {
    case "IDLE":
      session.state = "CHOOSING_OR_MENU";
      return (
        "Oi! Eu sou o assistente da Pizzaria 🍕\n\n" +
        "Digite:\n" +
        "1 - Ver cardápio\n" +
        "2 - Fazer um pedido\n" +
        "3 - Falar com atendente humano"
      );

    case "CHOOSING_OR_MENU":
      if (text === "1") {
        session.state = "AFTER_MENU";
        return (
          getMenuText() + '\n\nSe quiser fazer um pedido, responda com "2".'
        );
      }
      if (text === "2") {
        session.state = "ASK_NAME";
        return "Perfeito! Qual o seu nome?";
      }
      if (text === "3") {
        resetSession(phone);
        return "Ok, vou chamar um atendente humano. Aguarde um momento, por favor.";
      }
      return "Opção inválida. Digite 1 (cardápio), 2 (pedido) ou 3 (atendente).";

    case "AFTER_MENU":
      if (text === "2") {
        session.state = "ASK_NAME";
        return "Vamos lá! Qual o seu nome?";
      }
      return 'Se quiser fazer um pedido, responda com "2".';

    case "ASK_NAME":
      order.name = text;
      session.state = "CHOOSING_ITEMS";
      return (
        `Prazer, ${order.name}! Vamos ao seu pedido.\n\n` +
        "Envie cada item no formato:\n" +
        "`sabor, tamanho, quantidade`\n" +
        "Exemplo: `calabresa, grande, 1`\n\n" +
        "Quando terminar, digite: finalizar"
      );

    case "CHOOSING_ITEMS":
      if (text.toLowerCase() === "finalizar") {
        if (order.items.length === 0) {
          return "Você ainda não adicionou nenhum item. Envie pelo menos um item antes de finalizar.";
        }
        session.state = "ASK_ADDRESS";
        return "Certo! Agora me envie o endereço completo (rua, número, bairro e ponto de referência, se tiver).";
      }

      const item = parseItem(text);
      if (!item) {
        return (
          "Não entendi este item. Use o formato:\n" +
          "`sabor, tamanho, quantidade`\n" +
          "Exemplo: `calabresa, grande, 1`\n\n" +
          'Ou digite "finalizar" para encerrar a seleção.'
        );
      }

      order.items.push(item);
      return (
        `Adicionei: ${item.quantidade}x ${capitalize(item.sabor)} (${item.tamanho.toUpperCase()}).\n` +
        'Envie outro item ou digite "finalizar".'
      );

    case "ASK_ADDRESS":
      order.address = text;
      session.state = "ASK_PAYMENT";
      return "Qual a forma de pagamento? (pix, cartão, dinheiro)";

    case "ASK_PAYMENT": {
      const payment = text.toLowerCase();
      if (!["pix", "cartao", "cartão", "dinheiro"].includes(payment)) {
        return "Forma de pagamento inválida. Use: pix, cartão ou dinheiro.";
      }
      order.payment = normalizePayment(payment);

      session.state = "CONFIRMING";
      return buildConfirmationMessage(order);
    }

    case "CONFIRMING": {
      const t = text.toLowerCase();
      if (["sim", "s", "ok"].includes(t)) {
        session.state = "DONE";

        try {
          await enviarPedidoParaApi(order);
          resetSession(phone);
          return (
            "Pedido confirmado e registrado no sistema! 🎉\n" +
            "Em breve vamos te avisar quando estiver pronto. Obrigado!"
          );
        } catch (err) {
          // Em caso de erro de API
          resetSession(phone);
          return (
            "Seu pedido foi recebido, mas tivemos um problema ao registrar no sistema interno.\n" +
            "Um atendente irá conferir manualmente. Desculpe o transtorno."
          );
        }
      }

      if (["nao", "não", "n"].includes(t)) {
        resetSession(phone);
        return "Sem problemas! Vamos recomeçar. Mande qualquer mensagem para iniciar um novo pedido.";
      }

      return 'Por favor, responda "sim" para confirmar o pedido ou "nao" para recomeçar.';
    }

    default:
      resetSession(phone);
      return "Tive um problema com o fluxo. Vamos recomeçar. Mande qualquer mensagem para iniciar o pedido.";
  }
}

function getMenuText() {
  // Você pode puxar isso da sua API no futuro
  return (
    "🍕 *Cardápio Pizzaria X* 🍕\n\n" +
    "*Tradicionais* (P/M/G):\n" +
    "- Calabresa\n" +
    "- Mussarela\n" +
    "- Frango com Catupiry\n\n" +
    "*Especiais* (P/M/G):\n" +
    "- Quatro Queijos\n" +
    "- Portuguesa\n\n" +
    "Bebidas:\n" +
    "- Refrigerante lata\n" +
    "- Refrigerante 2L\n"
  );
}

function parseItem(text) {
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length < 3) return null;

  const [sabor, tamanho, qtdStr] = parts;
  const quantidade = Number(qtdStr);
  if (
    !sabor ||
    !tamanho ||
    !quantidade ||
    isNaN(quantidade) ||
    quantidade <= 0
  ) {
    return null;
  }

  return {
    sabor: sabor.toLowerCase(),
    tamanho: tamanho.toLowerCase(),
    quantidade: quantidade,
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizePayment(p) {
  if (p === "pix") return "pix";
  if (p.startsWith("cart")) return "cartao";
  if (p === "dinheiro") return "dinheiro";
  return p;
}

function buildConfirmationMessage(order) {
  const itensTexto = order.items
    .map(
      (i, idx) =>
        `${idx + 1}) ${i.quantidade}x ${capitalize(i.sabor)} (${i.tamanho.toUpperCase()})`,
    )
    .join("\n");

  return (
    "Confere seu pedido?\n\n" +
    `Nome: ${order.name}\n` +
    `Telefone: ${order.phone}\n` +
    `Itens:\n${itensTexto}\n\n` +
    `Endereço: ${order.address}\n` +
    `Pagamento: ${order.payment}\n\n` +
    "Responda *sim* para confirmar ou *nao* para recomeçar."
  );
}
