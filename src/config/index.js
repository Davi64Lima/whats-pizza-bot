export const config = {
  // API Configuration
  apiBaseUrl: process.env.PIZZA_API_URL || "http://localhost:3001",

  // WhatsApp Configuration
  whatsapp: {
    allowedNumbers: process.env.ALLOWED_NUMBERS
      ? process.env.ALLOWED_NUMBERS.split(",")
      : ["557185350004"],
  },

  // File Storage Configuration
  ordersLogFile: process.env.ORDERS_LOG_FILE || "orders-log.json",

  api: {
    port: process.env.API_PORT || 3003,
    host: process.env.API_HOST || "localhost",
  },
};
