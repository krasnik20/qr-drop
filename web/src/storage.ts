export type Role = "host" | "guest";

export type ChatMessage =
  | { id: string; kind: "text"; text: string; at: number }
  | { id: string; kind: "file"; name: string; size: number; mime: string; at: number; objectUrl?: string };

type Store = {
  hostRoomId?: string;
  rooms: Record<string, { role: Role; messages: ChatMessage[] }>;
};

const KEY = "qr-drop-v1";

function load(): Store {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { rooms: {} };
    const parsed = JSON.parse(raw) as Store;
    if (!parsed.rooms) parsed.rooms = {};
    // objectUrl cannot survive reload
    for (const room of Object.values(parsed.rooms)) {
      room.messages = room.messages.map((m) =>
        m.kind === "file" ? { ...m, objectUrl: undefined } : m,
      );
    }
    return parsed;
  } catch {
    return { rooms: {} };
  }
}

function save(store: Store) {
  const clone: Store = JSON.parse(JSON.stringify(store));
  for (const room of Object.values(clone.rooms)) {
    room.messages = room.messages.map((m) =>
      m.kind === "file" ? { ...m, objectUrl: undefined } : m,
    );
  }
  sessionStorage.setItem(KEY, JSON.stringify(clone));
}

export function getHostRoomId(): string | undefined {
  return load().hostRoomId;
}

export function setHostRoomId(roomId: string) {
  const store = load();
  store.hostRoomId = roomId;
  if (!store.rooms[roomId]) store.rooms[roomId] = { role: "host", messages: [] };
  save(store);
}

export function clearHostRoom() {
  const store = load();
  delete store.hostRoomId;
  save(store);
}

export function loadMessages(roomId: string): ChatMessage[] {
  return load().rooms[roomId]?.messages ?? [];
}

export function appendMessage(roomId: string, role: Role, message: ChatMessage) {
  const store = load();
  if (!store.rooms[roomId]) store.rooms[roomId] = { role, messages: [] };
  const list = store.rooms[roomId].messages;
  const existingIndex = list.findIndex((m) => m.id === message.id);
  if (existingIndex !== -1) {
    const existing = list[existingIndex];
    if (
      existing.kind === "file" &&
      message.kind === "file" &&
      message.objectUrl &&
      !existing.objectUrl
    ) {
      list[existingIndex] = message;
      save(store);
    }
    return;
  }
  const persisted: ChatMessage =
    message.kind === "file" ? { ...message, objectUrl: undefined } : message;
  list.push(persisted);
  save(store);
}

export function mergeChat(prev: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const i = prev.findIndex((m) => m.id === message.id);
  if (i === -1) return [...prev, message];
  const old = prev[i];
  if (old.kind === "file" && message.kind === "file" && message.objectUrl && !old.objectUrl) {
    const next = [...prev];
    next[i] = message;
    return next;
  }
  return prev;
}
