import fs from "fs";
import { config } from "../config/index.js";

/**
 * Repository responsável por armazenamento em arquivo
 * Para trocar para banco de dados, basta criar uma nova implementação
 * seguindo a mesma interface (métodos saveOrder, getOrders)
 */
export class FileStorageRepository {
  constructor(filePath = config.ordersLogFile) {
    this.filePath = filePath;
  }

  /**
   * Salva um pedido no arquivo
   * @param {Object} order - Dados do pedido
   * @param {boolean} failed - Se o pedido falhou ao ser enviado para API
   */
  saveOrder(order, failed = false) {
    try {
      const logEntry = {
        ...order,
        failedToSend: failed,
        createdAt: new Date().toISOString(),
      };

      let content = [];
      if (fs.existsSync(this.filePath)) {
        try {
          const txt = fs.readFileSync(this.filePath, "utf-8");
          content = JSON.parse(txt || "[]");
        } catch (e) {
          console.error(
            `Erro ao ler ${this.filePath}, recriando arquivo.`,
            e.message,
          );
        }
      }

      content.push(logEntry);
      fs.writeFileSync(this.filePath, JSON.stringify(content, null, 2));
      console.log("Pedido salvo no arquivo com sucesso");
    } catch (error) {
      console.error("Erro ao salvar pedido no arquivo:", error.message);
    }
  }

  /**
   * Busca todos os pedidos salvos
   * @returns {Array} Lista de pedidos
   */
  getOrders() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }

      const txt = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(txt || "[]");
    } catch (error) {
      console.error("Erro ao ler pedidos do arquivo:", error.message);
      return [];
    }
  }
}
