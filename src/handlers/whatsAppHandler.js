import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import { config } from "../config/index.js";

/**
 * Handler responsável por gerenciar o cliente WhatsApp
 * Encapsula toda lógica de conexão e comunicação com WhatsApp
 */
export class WhatsAppHandler {
  constructor(messageHandler) {
    this.messageHandler = messageHandler;
    this.client = null;
  }

  /**
   * Inicializa o cliente WhatsApp
   */
  initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      },
    });

    this.setupEventHandlers();

    console.log("Inicializando cliente WhatsApp...");
    this.client.initialize();
  }

  /**
   * Configura os event handlers do cliente
   */
  setupEventHandlers() {
    this.client.on("qr", (qr) => {
      console.log("QR RECEIVED, escaneie com o WhatsApp:");
      qrcode.generate(qr, { small: true });
    });

    this.client.on("ready", () => {
      console.log("Bot do WhatsApp está pronto!");
      console.log("Versão do client:", this.client.info);
    });

    this.client.on("message", async (message) => {
      await this.handleIncomingMessage(message);
    });

    this.client.on("disconnected", (reason) => {
      console.log("Cliente desconectado:", reason);
    });

    this.client.on("auth_failure", (msg) => {
      console.error("Falha na autenticação:", msg);
    });
  }

  /**
   * Processa mensagem recebida
   * @param {Object} message - Mensagem do WhatsApp
   */
  async handleIncomingMessage(message) {
    try {
      // Ignora mensagens enviadas pelo bot ou que não são de conversa individual
      if (message._data.id.fromMe || !message.from.endsWith("@c.us")) {
        return;
      }

      // Processa mensagens de localização
      if (message.type === "location") {
        const fullDescription = message.location.description || "";
        const lines = fullDescription.split("\n");
        message.body =
          lines.length > 1 ? lines.slice(1).join("\n") : fullDescription;
      }

      const from = message.from;
      const phone = from.split("@")[0];

      // Verifica se o número está na lista permitida
      if (!this.isAllowedNumber(phone)) {
        console.log(`Número não permitido: ${phone}`);
        return;
      }

      const text = (message.body || "").trim();

      // Processa a mensagem através do handler de pedidos
      const reply = await this.messageHandler.handleMessage({ phone, text });

      if (reply) {
        await this.sendMessage(from, reply);
      } else {
        console.log("Nenhuma resposta gerada");
      }
    } catch (err) {
      console.error("✗ Erro ao processar mensagem:", err.message);
      console.error("Stack trace:", err.stack);
    }
  }

  /**
   * Envia mensagem para um chat
   * @param {string} chatId - ID do chat
   * @param {string} message - Mensagem a enviar
   */
  async sendMessage(chatId, message) {
    try {
      await this.client.pupPage.evaluate(
        async ({ chatId, message }) => {
          const chat = window.Store.Chat.get(chatId);
          if (!chat) throw new Error("Chat não encontrado");

          return await window.WWebJS.sendMessage(chat, message, {
            linkPreview: false,
          });
        },
        { chatId, message },
      );
    } catch (sendError) {
      console.error("✗ Erro ao enviar mensagem:", sendError.message);
      console.error("Stack trace:", sendError.stack);
    }
  }

  /**
   * Verifica se o número está permitido
   * @param {string} phone - Número de telefone
   * @returns {boolean} Se o número está permitido
   */
  isAllowedNumber(phone) {
    return config.whatsapp.allowedNumbers.includes(phone);
  }
}
