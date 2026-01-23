/**
 * Service responsável por lógica de negócio do cardápio
 */
export class MenuService {
  constructor(pizzaApiRepository) {
    this.pizzaApiRepository = pizzaApiRepository;
  }

  /**
   * Obtém o texto formatado do cardápio
   * @returns {Promise<string>} Cardápio formatado
   */
  async getFormattedMenu() {
    const flavors = await this.pizzaApiRepository.getMenuItems();

    // Filtrar apenas sabores ativos
    const activeFlavors = flavors.filter((f) => f.isActive);

    // Agrupar por tipo
    const tradicionais = activeFlavors.filter((f) => f.type === "TRADICIONAL");
    const especiais = activeFlavors.filter((f) => f.type === "SPECIAL");
    const doces = activeFlavors.filter((f) => f.type === "DOCE");

    let menuText = "🍕 *Cardápio Pizzaria X* 🍕\n\n";

    // Tradicionais
    if (tradicionais.length > 0) {
      menuText += "*Pizzas Tradicionais*\n";
      tradicionais.forEach((flavor) => {
        menuText += `\n*${flavor.name}*\n`;
        menuText += `${flavor.description}\n`;
        menuText += `M: ${this.formatPrice(flavor.prices.middle)} | `;
        menuText += `G: ${this.formatPrice(flavor.prices.large)} | `;
        menuText += `F: ${this.formatPrice(flavor.prices.family)}`;
      });
      menuText += "\n";
    }

    // Especiais
    if (especiais.length > 0) {
      menuText += "*Pizzas Especiais*\n";
      especiais.forEach((flavor) => {
        menuText += `\n*${flavor.name}*\n`;
        menuText += `${flavor.description}\n`;
        menuText += `M: ${this.formatPrice(flavor.prices.middle)} | `;
        menuText += `G: ${this.formatPrice(flavor.prices.large)} | `;
        menuText += `F: ${this.formatPrice(flavor.prices.family)}`;
      });
      menuText += "\n";
    }

    // Doces
    if (doces.length > 0) {
      menuText += "*Pizzas Doces* 🍫\n";
      doces.forEach((flavor) => {
        menuText += `\n*${flavor.name}*\n`;
        menuText += `${flavor.description}\n`;
        menuText += `M: ${this.formatPrice(flavor.prices.middle)} | `;
        menuText += `G: ${this.formatPrice(flavor.prices.large)} | `;
        menuText += `F: ${this.formatPrice(flavor.prices.family)}`;
      });
    }

    return menuText;
  }

  /**
   * Obtém os sabores ativos
   * @returns {Promise<Array>} Lista de sabores ativos
   */
  async getActiveFlavors() {
    const flavors = await this.pizzaApiRepository.getMenuItems();
    return flavors.filter((f) => f.isActive);
  }

  /**
   * Formata preço em centavos para formato brasileiro
   * @param {number} priceInCents - Preço em centavos
   * @returns {string} Preço formatado
   */
  formatPrice(priceInCents) {
    return `R$ ${(priceInCents / 100).toFixed(2).replace(".", ",")}`;
  }
}
