import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import { handleIncomingMessage } from "./orderFlow.js";

const client = new Client({
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
  webVersionCache: {
    type: "remote",
    remotePath:
      "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
  },
});

client.on("qr", (qr) => {
  console.log("QR RECEIVED, escaneie com o WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Bot do WhatsApp está pronto!");
});

client.on("message_create", async (message) => {
  try {
    // Ignora mensagens enviadas pelo próprio bot e grupos
    if (message._data.id.fromMe || message.from.endsWith("@g.us")) {
      return;
    }

    console.log(message);

    const from = message.from;
    const phone = from.split("@")[0];
    const text = (message.body || "").trim();

    console.log(`Mensagem recebida de ${phone}: ${text}`);

    const reply = await handleIncomingMessage({ phone, text });

    if (reply) {
      try {
        // Usa o método direto do chat ao invés do client
        const chat = await message.getChat();
        await chat.sendMessage(reply);
        console.log(`Mensagem enviada para ${phone}`);
      } catch (sendError) {
        console.error("Erro ao enviar mensagem:", sendError.message);

        // Fallback: tenta enviar direto pelo client
        try {
          await client.sendMessage(from, reply);
          console.log(`Mensagem enviada (fallback) para ${phone}`);
        } catch (fallbackError) {
          console.error("Falha no fallback:", fallbackError.message);
        }
      }
    }
  } catch (err) {
    console.error("Erro ao processar mensagem:", err);
  }
});

client.on("disconnected", (reason) => {
  console.log("Cliente desconectado:", reason);
});

client.on("auth_failure", (msg) => {
  console.error("Falha na autenticação:", msg);
});

client.initialize();
