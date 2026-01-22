const sessions = new Map(); // phone -> { state, order }

export function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, {
      state: "IDLE",
      order: {
        phone,
        items: [],
        address: "",
        payment: "",
        name: "",
        notes: "",
      },
    });
  }
  return sessions.get(phone);
}

export function resetSession(phone) {
  sessions.delete(phone);
}
