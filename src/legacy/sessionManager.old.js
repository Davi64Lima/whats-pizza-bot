const sessions = new Map(); // phone -> { state, order }

export function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, {
      state: "IDLE",
      order: {
        code: generateCode(),
        products: [],
        customer: { name: "", phone: phone },
        address: {},
        payment: "",
        hash: "",
        observation: "",
      },
    });
  }
  return sessions.get(phone);
}

export function resetSession(phone) {
  sessions.delete(phone);
}

const generateCode = () => {
  const code = (Math.random() + 1)
    .toString(36)
    .replace("0", "")
    .replace("o", "")
    .replace("i", "")
    .replace("j", "")
    .substring(2, 7)
    .toUpperCase();
  return code;
};
