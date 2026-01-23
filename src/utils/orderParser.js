import { capitalize } from "./textUtils.js";

/**
 * Parser responsável por interpretar itens do pedido
 */
export class OrderParser {
  constructor(menuService) {
    this.menuService = menuService;
  }

  /**
   * Faz parse de um item do pedido a partir do texto
   * @param {string} text - Texto do item (formato: "sabor(es), tamanho, quantidade")
   * @returns {Promise<Object|null>} Item parseado ou null se inválido
   */
  async parseItem(text) {
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
    const activeFlavors = await this.menuService.getActiveFlavors();

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

    // Validar quantidade de sabores baseado no tamanho
    const validationResult = this.validateFlavorsBySize(
      tamanhoNormalizado,
      sabores.length,
    );

    if (validationResult.error) {
      return validationResult;
    }

    // Construir o nome no formato: "Tamanho + Sabor1 + Sabor2 + ..."
    const tamanhoFormatado = this.formatSizeName(tamanhoNormalizado);
    const pizzaName = [tamanhoFormatado, ...flavorNames].join(" + ");

    return {
      flavors: flavorUuids,
      name: pizzaName,
      size: tamanhoNormalizado,
      quantity: quantidade,
    };
  }

  /**
   * Valida quantidade de sabores por tamanho
   * @param {string} size - Tamanho normalizado
   * @param {number} flavorCount - Quantidade de sabores
   * @returns {Object} Resultado da validação
   */
  validateFlavorsBySize(size, flavorCount) {
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

    if (tamanhosMediosGrandes.includes(size)) {
      if (flavorCount > 2) {
        return {
          error: `Pizzas médias e grandes podem ter no máximo 2 sabores. Você tentou adicionar ${flavorCount} sabores.`,
        };
      }
    } else if (tamanhosFamilia.includes(size)) {
      if (flavorCount > 3) {
        return {
          error: `Pizzas família podem ter no máximo 3 sabores. Você tentou adicionar ${flavorCount} sabores.`,
        };
      }
    } else {
      return {
        error: `Tamanho inválido: "${size}". Use: média, grande ou família.`,
      };
    }

    return {};
  }

  /**
   * Formata o nome do tamanho
   * @param {string} size - Tamanho normalizado
   * @returns {string} Nome formatado
   */
  formatSizeName(size) {
    const tamanhosFamilia = ["familia", "família", "f", "family"];
    const tamanhosMedio = ["media", "média", "m", "middle"];

    if (tamanhosFamilia.includes(size)) {
      return "Família";
    } else if (tamanhosMedio.includes(size)) {
      return "Média";
    } else {
      return "Grande";
    }
  }
}
