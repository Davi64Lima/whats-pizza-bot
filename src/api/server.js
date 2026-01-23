/**
 * Servidor HTTP para receber requisições externas
 * Permite disparar mensagens via API REST
 */

import express from "express";
import { config } from "../config/index.js";

export class ApiServer {
  constructor(whatsAppHandler, orderFlowHandler) {
    this.whatsAppHandler = whatsAppHandler;
    this.orderFlowHandler = orderFlowHandler;
    this.app = express();

    this.setupMiddlewares();
    this.setupRoutes();
  }

  setupMiddlewares() {
    // Parse JSON bodies
    this.app.use(express.json());

    // CORS
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      );
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      next();
    });

    // Logger
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error("Error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
      });
    });
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        success: true,
        status: "running",
        timestamp: new Date().toISOString(),
      });
    });

    // Enviar mensagem para um número
    this.app.post("/api/messages/send", async (req, res) => {
      try {
        const { phone, message } = req.body;

        if (!phone || !message) {
          return res.status(400).json({
            success: false,
            error: "Phone and message are required",
          });
        }
        const number = phone.replace(/\D/g, "");

        const numberId = await this.whatsAppHandler.client.getNumberId(number);

        if (!numberId) {
          throw new Error("Número não possui WhatsApp");
        }

        await this.whatsAppHandler.sendMessage(numberId._serialized, message);

        res.json({
          success: true,
          message: "Message sent successfully",
          data: { phone, message },
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Enviar mensagem em massa (broadcast)
    this.app.post("/api/messages/broadcast", async (req, res) => {
      try {
        const { phones, message } = req.body;

        if (!phones || !Array.isArray(phones) || phones.length === 0) {
          return res.status(400).json({
            success: false,
            error: "Phones must be a non-empty array",
          });
        }

        if (!message) {
          return res.status(400).json({
            success: false,
            error: "Message is required",
          });
        }

        const results = [];
        for (const phone of phones) {
          try {
            const chatId = `${phone}@c.us`;
            await this.whatsAppHandler.sendMessage(chatId, message);
            results.push({ phone, status: "sent" });
          } catch (error) {
            results.push({ phone, status: "failed", error: error.message });
          }
        }

        res.json({
          success: true,
          message: "Broadcast completed",
          data: results,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Enviar template de mensagem
    this.app.post("/api/messages/template", async (req, res) => {
      try {
        const { phone, templateName, variables } = req.body;

        if (!phone || !templateName) {
          return res.status(400).json({
            success: false,
            error: "Phone and templateName are required",
          });
        }

        const message = this.getTemplate(templateName, variables);

        const chatId = `${phone}@c.us`;
        await this.whatsAppHandler.sendMessage(chatId, message);

        res.json({
          success: true,
          message: "Template sent successfully",
          data: { phone, templateName, message },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Simular mensagem recebida (útil para testes)
    this.app.post("/api/messages/simulate", async (req, res) => {
      try {
        const { phone, text } = req.body;

        if (!phone || !text) {
          return res.status(400).json({
            success: false,
            error: "Phone and text are required",
          });
        }

        const chatId = `${phone}@c.us`;

        const response = await this.orderFlowHandler.handleIncomingMessage({
          phone: chatId,
          text,
        });

        res.json({
          success: true,
          message: "Message simulated successfully",
          data: { phone, text, response },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Obter sessão de um cliente
    this.app.get("/api/sessions/:phone", (req, res) => {
      try {
        const { phone } = req.params;
        const session = this.orderFlowHandler.sessionService.getSession(phone);

        res.json({
          success: true,
          data: session,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Resetar sessão de um cliente
    this.app.delete("/api/sessions/:phone", (req, res) => {
      try {
        const { phone } = req.params;
        this.orderFlowHandler.sessionService.resetSession(phone);

        res.json({
          success: true,
          message: "Session reset successfully",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Listar todas as sessões ativas
    this.app.get("/api/sessions", (req, res) => {
      try {
        const sessions = this.orderFlowHandler.sessionService.getAllSessions();

        res.json({
          success: true,
          data: sessions,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Obter cardápio
    this.app.get("/api/menu", async (req, res) => {
      try {
        const menuText = await this.orderFlowHandler.menuService.getMenuText();

        res.json({
          success: true,
          data: { menuText },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Webhook para receber notificações (pode ser usado por sistemas externos)
    this.app.post("/api/webhook", async (req, res) => {
      try {
        const { event, data } = req.body;

        console.log("Webhook received:", event, data);

        // Aqui você pode processar diferentes tipos de eventos
        switch (event) {
          case "order.created":
            // Notificar cliente sobre pedido criado
            if (data.phone && data.orderId) {
              await this.whatsAppHandler.sendMessage(
                data.phone,
                `✅ Seu pedido #${data.orderId} foi recebido e está sendo preparado!`,
              );
            }
            break;

          case "order.ready":
            // Notificar cliente que pedido está pronto
            if (data.phone && data.orderId) {
              await this.whatsAppHandler.sendMessage(
                data.phone,
                `🍕 Seu pedido #${data.orderId} está pronto e saiu para entrega!`,
              );
            }
            break;

          case "order.delivered":
            // Agradecer pela compra
            if (data.phone) {
              await this.whatsAppHandler.sendMessage(
                data.phone,
                "🎉 Obrigado pela preferência! Esperamos que tenha gostado da sua pizza!",
              );
            }
            break;

          default:
            console.log("Unknown event type:", event);
        }

        res.json({
          success: true,
          message: "Webhook processed",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  getTemplate(templateName, variables = {}) {
    const templates = {
      welcome: `Olá! 👋 Bem-vindo à Pizzaria X!\n\nEstamos prontos para atender seu pedido.`,

      promotion: `🎉 *PROMOÇÃO ESPECIAL* 🎉\n\n${variables.promotionText || "Promoção válida até hoje!"}\n\nFaça já seu pedido!`,

      orderConfirmed: `✅ Pedido confirmado!\n\nSeu pedido foi recebido e já está sendo preparado.\n\nTempo estimado: ${variables.estimatedTime || "40-50 minutos"}`,

      orderReady: `🍕 Seu pedido está pronto!\n\nO entregador já saiu e está a caminho do seu endereço.`,

      thankYou: `Obrigado pela preferência! 🙏\n\nFoi um prazer atendê-lo. Até a próxima!`,
    };

    return templates[templateName] || "Template não encontrado";
  }

  start(port = config.api.port) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`✓ API Server rodando na porta ${port}`);
        console.log(`✓ Health check: http://localhost:${port}/health`);
        console.log(`✓ Documentação: http://localhost:${port}/api/docs`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("✓ API Server encerrado");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
