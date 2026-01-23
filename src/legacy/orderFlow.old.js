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
      order.customer.name = text;
      session.state = "CHOOSING_ITEMS";
      return (
        `Prazer, ${order.customer.name}! Vamos ao seu pedido.\n\n` +
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

    case "CHOOSING_ITEMS":
      if (text.toLowerCase() === "finalizar") {
        if (order.products.length === 0) {
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

      order.products.push(item);
      return (
        `Adicionei: ${item.quantity}x ${item.name}.\n` +
        'Envie outro item ou digite "finalizar".'
      );

    case "ASK_ADDRESS":
      const addressValidation = validateAddress(text);
      if (!addressValidation.valid) {
        return addressValidation.message;
      }
      const address = text.split(",").map((part) => part.trim());
      order.address.street = address[0] || "";
      order.address.number = address[1] || "";
      order.address.neighborhood = address[2] || "";
      order.address.complement = address.slice(3).join(", ") || "";
      session.state = "ASK_PAYMENT";
      return "Qual a forma de pagamento? (pix, cartão, dinheiro)";

    case "ASK_PAYMENT": {
      const payment = text.toLowerCase();
      if (!["pix", "cartao", "cartão", "dinheiro"].includes(payment)) {
        return "Forma de pagamento inválida. Use: pix, cartão ou dinheiro.";
      }
      order.payment = normalizePayment(payment);

      session.state = "ASK_OBSERVATION";
      return "Tem alguma observação para o pedido? (Ex: sem cebola, bem passada, etc.)\n\nSe não tiver, digite: não";
    }

    case "ASK_OBSERVATION": {
      const t = text.toLowerCase();
      if (!["nao", "não", "n"].includes(t)) {
        order.observation = text;
      }

      session.state = "CONFIRMING";
      return buildConfirmationMessage(order, phone);
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
      menuText += `F: ${formatPrice(flavor.prices.family)}`;
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
      menuText += `F: ${formatPrice(flavor.prices.family)}`;
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
      menuText += `F: ${formatPrice(flavor.prices.family)}`;
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

  // Criar mapa de nome -> flavor completo (com UUID)
  const flavorMap = {};
  activeFlavors.forEach((f) => {
    flavorMap[f.name.toLowerCase()] = f;
  });

  // Validar se todos os sabores existem e coletar os UUIDs
  const flavorUuids = [];
  const flavorNames = [];
  const invalidFlavors = [];

  for (const sabor of sabores) {
    const flavor = flavorMap[sabor];
    if (!flavor) {
      invalidFlavors.push(sabor);
    } else {
      flavorUuids.push(flavor.uuid);
      flavorNames.push(capitalize(flavor.name));
    }
  }

  if (invalidFlavors.length > 0) {
    const invalidList = invalidFlavors.map((s) => capitalize(s)).join(", ");
    return {
      error: `Sabor(es) não encontrado(s): ${invalidList}\n\nDigite "menu" ou "cardápio" para ver os sabores disponíveis.`,
    };
  }

  const tamanhoNormalizado = tamanho.toLowerCase();

  // Normalizar tamanho para o padrão da API
  let sizeForApi;
  if (["media", "média", "m"].includes(tamanhoNormalizado)) {
    sizeForApi = "middle";
  } else if (["grande", "g"].includes(tamanhoNormalizado)) {
    sizeForApi = "large";
  } else if (["familia", "família", "f"].includes(tamanhoNormalizado)) {
    sizeForApi = "family";
  }

  // Validar quantidade de sabores baseado no tamanho
  const tamanhosMediosGrandes = [
    "media",
    "média",
    "m",
    "middle",
    "grande",
    "g",
    "large",
  ];
  const tamanhosFamilia = ["familia", "família", "f", "family"];

  if (tamanhosMediosGrandes.includes(tamanhoNormalizado)) {
    if (sabores.length > 2) {
      return {
        error: `Pizzas médias e grandes podem ter no máximo 2 sabores. Você tentou adicionar ${sabores.length} sabores.`,
      };
    }
  } else if (tamanhosFamilia.includes(tamanhoNormalizado)) {
    if (sabores.length > 3) {
      return {
        error: `Pizzas família podem ter no máximo 3 sabores. Você tentou adicionar ${sabores.length} sabores.`,
      };
    }
  } else {
    return {
      error: `Tamanho inválido: "${tamanho}". Use: média, grande ou família.`,
    };
  }

  // Construir o nome no formato: "Tamanho + Sabor1 + Sabor2 + ..."
  const tamanhoFormatado = capitalize(
    tamanhosFamilia.includes(tamanhoNormalizado)
      ? "Família"
      : tamanhosMediosGrandes.includes(tamanhoNormalizado) &&
          ["media", "média", "m", "middle"].includes(tamanhoNormalizado)
        ? "Média"
        : "Grande",
  );

  const pizzaName = [tamanhoFormatado, ...flavorNames].join(" + ");

  return {
    flavors: flavorUuids,
    name: pizzaName,
    size: sizeForApi,
    quantity: quantidade,
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
