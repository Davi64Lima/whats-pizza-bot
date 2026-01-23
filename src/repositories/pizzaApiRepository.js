import axios from "axios";
import { config } from "../config/index.js";

/**
 * Repository responsável por comunicação com a API de Pizzas
 * Para trocar para outra API, basta implementar outra classe
 * seguindo a mesma interface (métodos getMenuItems, createOrder)
 */
export class PizzaApiRepository {
  constructor(baseUrl = config.apiBaseUrl) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Busca todos os sabores disponíveis
   * @returns {Promise<Array>} Lista de sabores
   */
  async getMenuItems() {
    try {
      const response = await this.client.get("/flavors");
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar sabores da API:", error.message);
      throw new Error("Não foi possível carregar o cardápio");
    }
  }

  /**
   * Cria um novo pedido
   * @param {Object} order - Dados do pedido
   * @returns {Promise<Object>} Pedido criado
   */
  async createOrder(order) {
    try {
      const response = await this.client.post("/orders", order);
      console.log("Pedido enviado para API com sucesso:", response.data);
      return response.data;
    } catch (error) {
      console.error("Erro ao enviar pedido para API:", error.message);
      throw new Error("Não foi possível registrar o pedido");
    }
  }
}
