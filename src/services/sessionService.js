/**
 * Service responsável por gerenciar sessões de usuários
 * Mantém o estado da conversa de cada usuário
 */
export class SessionService {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Obtém ou cria uma sessão para um telefone
   * @param {string} phone - Número de telefone
   * @returns {Object} Sessão do usuário
   */
  getSession(phone) {
    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, {
        state: "IDLE",
        order: this.createEmptyOrder(phone),
      });
    }
    return this.sessions.get(phone);
  }

  /**
   * Reseta a sessão de um usuário
   * @param {string} phone - Número de telefone
   */
  resetSession(phone) {
    this.sessions.delete(phone);
  }

  /**
   * Cria um objeto de pedido vazio
   * @param {string} phone - Número de telefone
   * @returns {Object} Objeto de pedido
   */
  createEmptyOrder(phone) {
    return {
      code: this.generateCode(),
      products: [],
      customer: { name: "", phone: phone },
      address: {
        street: "",
        number: "",
        neighborhood: "",
        complement: "",
      },
      payment: "",
      hash: "",
      observation: "",
    };
  }

  /**
   * Gera um código único para o pedido
   * @returns {string} Código do pedido
   */
  generateCode() {
    const code = (Math.random() + 1)
      .toString(36)
      .replace("0", "")
      .replace("o", "")
      .replace("i", "")
      .replace("j", "")
      .substring(2, 7)
      .toUpperCase();
    return code;
  }
}
