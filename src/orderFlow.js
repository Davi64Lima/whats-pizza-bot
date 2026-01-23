import { getSession, resetSession } from "./sessionManager.js";
import { enviarPedidoParaApi, getFlavors } from "./apiClient.js";

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
          (await getMenuText()) +
          '\n\nSe quiser fazer um pedido, responda com "2".'
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
        "`sabor(es), tamanho, quantidade`\n\n" +
        "*Tamanhos:* pequena, média, grande\n" +
        "*Sabores:* Pequena/Média até 2 sabores | Grande até 3 sabores\n" +
        "Separe sabores com `/`\n\n" +
        "Exemplos:\n" +
        "`calabresa, média, 1`\n" +
        "`calabresa/frango, grande, 2`\n" +
        "`mussarela/portuguesa/bacon, grande, 1`\n\n" +
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

      const item = await parseItem(text);
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

      order.items.push(item);
      const saboresTexto = item.sabores.map((s) => capitalize(s)).join("/");
      return (
        `Adicionei: ${item.quantidade}x ${saboresTexto} (${item.tamanho.toUpperCase()}).\n` +
        'Envie outro item ou digite "finalizar".'
      );

    case "ASK_ADDRESS":
      const addressValidation = validateAddress(text);
      if (!addressValidation.valid) {
        return addressValidation.message;
      }
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

async function getMenuText() {
  const flavors = await getFlavors();

  // Filtrar apenas sabores ativos
  const activeFlavors = flavors.filter((f) => f.isActive);

  // Agrupar por tipo
  const tradicionais = activeFlavors.filter((f) => f.type === "TRADICIONAL");
  const especiais = activeFlavors.filter((f) => f.type === "SPECIAL");
  const doces = activeFlavors.filter((f) => f.type === "DOCE");

  // Função auxiliar para formatar preços
  const formatPrice = (priceInCents) => {
    return `R$ ${(priceInCents / 100).toFixed(2).replace(".", ",")}`;
  };

  let menuText = "🍕 *Cardápio Pizzaria X* 🍕\n\n";

  // Tradicionais
  if (tradicionais.length > 0) {
    menuText += "*Pizzas Tradicionais*\n";
    tradicionais.forEach((flavor) => {
      menuText += `\n*${flavor.name}*\n`;
      menuText += `${flavor.description}\n`;
      menuText += `M: ${formatPrice(flavor.prices.middle)} | `;
      menuText += `G: ${formatPrice(flavor.prices.large)} | `;
    });
    menuText += "\n";
  }

  // Especiais
  if (especiais.length > 0) {
    menuText += "*Pizzas Especiais*\n";
    especiais.forEach((flavor) => {
      menuText += `\n*${flavor.name}*\n`;
      menuText += `${flavor.description}\n`;
      menuText += `M: ${formatPrice(flavor.prices.middle)} | `;
      menuText += `G: ${formatPrice(flavor.prices.large)} | `;
    });
    menuText += "\n";
  }

  // Doces
  if (doces.length > 0) {
    menuText += "*Pizzas Doces* 🍫\n";
    doces.forEach((flavor) => {
      menuText += `\n*${flavor.name}*\n`;
      menuText += `${flavor.description}\n`;
      menuText += `M: ${formatPrice(flavor.prices.middle)} | `;
      menuText += `G: ${formatPrice(flavor.prices.large)} | `;
    });
  }

  return menuText;
}

async function parseItem(text) {
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length < 3) return null;

  const [saboresStr, tamanho, qtdStr] = parts;
  const quantidade = Number(qtdStr);

  if (
    !saboresStr ||
    !tamanho ||
    !quantidade ||
    isNaN(quantidade) ||
    quantidade <= 0
  ) {
    return null;
  }

  // Separar múltiplos sabores
  const sabores = saboresStr
    .split("/")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);

  if (sabores.length === 0) {
    return null;
  }

  // Buscar sabores disponíveis no cardápio
  const flavors = await getFlavors();
  const activeFlavors = flavors.filter((f) => f.isActive);
  const availableFlavorNames = activeFlavors.map((f) => f.name.toLowerCase());

  // Validar se todos os sabores existem
  const invalidFlavors = sabores.filter(
    (sabor) => !availableFlavorNames.includes(sabor),
  );

  if (invalidFlavors.length > 0) {
    const invalidList = invalidFlavors.map((s) => capitalize(s)).join(", ");
    return {
      error: `Sabor(es) não encontrado(s): ${invalidList}\n\nDigite "menu" ou "cardápio" para ver os sabores disponíveis.`,
    };
  }

  const tamanhoNormalizado = tamanho.toLowerCase();

  // Validar quantidade de sabores baseado no tamanho
  const tamanhosPequenos = ["pequena", "p", "media", "média", "m", "middle"];
  const tamanhosGrandes = ["grande", "g", "large"];

  if (tamanhosPequenos.includes(tamanhoNormalizado)) {
    if (sabores.length > 2) {
      return {
        error: `Pizzas pequenas e médias podem ter no máximo 2 sabores. Você tentou adicionar ${sabores.length} sabores.`,
      };
    }
  } else if (tamanhosGrandes.includes(tamanhoNormalizado)) {
    if (sabores.length > 3) {
      return {
        error: `Pizzas grandes  podem ter no máximo 3 sabores. Você tentou adicionar ${sabores.length} sabores.`,
      };
    }
  } else {
    return {
      error: `Tamanho inválido: "${tamanho}". Use: pequena, média, grande ou família.`,
    };
  }

  return {
    sabores: sabores,
    sabor: sabores.join("/"), // mantém compatibilidade
    tamanho: tamanhoNormalizado,
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
    .map((i, idx) => {
      const sabores = i.sabores
        ? i.sabores.map((s) => capitalize(s)).join("/")
        : capitalize(i.sabor);
      return `${idx + 1}) ${i.quantidade}x ${sabores} (${i.tamanho.toUpperCase()})`;
    })
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

function validateAddress(address) {
  if (!address || address.trim().length < 10) {
    return {
      valid: false,
      message:
        "Endereço muito curto. Por favor, envie o endereço completo com rua, número e bairro.",
    };
  }

  const addressLower = address.toLowerCase();

  // Verifica se tem número (pelo menos um dígito)
  const hasNumber = /\d+/.test(address);

  // Verifica se tem indicadores de rua/avenida
  const hasStreet =
    /\b(rua|avenida|av|alameda|travessa|rodovia|estrada|praça)\b/i.test(
      addressLower,
    );

  // Verifica se tem pelo menos 3 palavras (indicando detalhamento mínimo)
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
