import type { ChatMessage } from "./storage";
import type { SignalPayload } from "./signaling";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CHUNK = 16 * 1024;
const iceWait = new WeakMap<RTCPeerConnection, RTCIceCandidateInit[]>();

export type WireMsg =
  | { type: "text"; id: string; text: string; at: number }
  | { type: "file-available"; id: string; name: string; size: number; mime: string; at: number }
  | { type: "file-request"; id: string }
  | { type: "file-start"; id: string; name: string; size: number; mime: string; at: number }
  | { type: "file-end"; id: string };

export function newId() {
  return crypto.randomUUID();
}

function descJson(d: RTCSessionDescription | null): RTCSessionDescriptionInit {
  return { type: d!.type, sdp: d!.sdp };
}

export function createHostPeer(
  onLocalSignal: (payload: SignalPayload) => void,
  onOpen: () => void,
  onFileRequest: (id: string, dc: RTCDataChannel) => void,
) {
  const pc = new RTCPeerConnection(ICE);
  const dc = pc.createDataChannel("drop", { ordered: true });
  dc.binaryType = "arraybuffer";
  dc.bufferedAmountLowThreshold = 256 * 1024;
  dc.addEventListener("open", onOpen);
  dc.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    const message = JSON.parse(event.data) as WireMsg;
    if (message.type === "file-request") onFileRequest(message.id, dc);
  });
  pc.addEventListener("icecandidate", (e) => {
    if (e.candidate) onLocalSignal({ ice: e.candidate.toJSON() });
  });
  return { pc, dc };
}

export async function hostOffer(pc: RTCPeerConnection, onLocalSignal: (payload: SignalPayload) => void) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  onLocalSignal({ sdp: descJson(pc.localDescription) });
}

export function createGuestPeer(
  onLocalSignal: (payload: SignalPayload) => void,
  onMessage: (ev: MessageEvent) => void,
  onOpen: () => void,
  onChannel: (dc: RTCDataChannel) => void,
) {
  const pc = new RTCPeerConnection(ICE);
  pc.addEventListener("icecandidate", (e) => {
    if (e.candidate) onLocalSignal({ ice: e.candidate.toJSON() });
  });
  pc.addEventListener("datachannel", (e) => {
    e.channel.binaryType = "arraybuffer";
    e.channel.addEventListener("message", async (event) => {
      if (event.data instanceof Blob) {
        onMessage(
          new MessageEvent("message", {
            data: await event.data.arrayBuffer(),
          }),
        );
        return;
      }
      onMessage(event);
    });
    e.channel.addEventListener("open", onOpen);
    onChannel(e.channel);
  });
  return pc;
}

export async function applySignal(
  pc: RTCPeerConnection,
  payload: SignalPayload,
  onLocalSignal?: (payload: SignalPayload) => void,
) {
  if (payload.sdp) {
    await pc.setRemoteDescription(payload.sdp);
    if (payload.sdp.type === "offer" && onLocalSignal) {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      onLocalSignal({ sdp: descJson(pc.localDescription) });
    }
    const queued = iceWait.get(pc) ?? [];
    iceWait.delete(pc);
    for (const ice of queued) await pc.addIceCandidate(ice);
  }
  if (payload.ice) {
    if (!pc.remoteDescription) {
      const q = iceWait.get(pc) ?? [];
      q.push(payload.ice);
      iceWait.set(pc, q);
      return;
    }
    try {
      await pc.addIceCandidate(payload.ice);
    } catch {
      // ignore
    }
  }
}

export async function sendText(channels: RTCDataChannel[], message: Extract<ChatMessage, { kind: "text" }>) {
  const wire: WireMsg = { type: "text", id: message.id, text: message.text, at: message.at };
  const raw = JSON.stringify(wire);
  for (const dc of openChannels(channels)) dc.send(raw);
}

export function sendFileAvailable(
  channels: RTCDataChannel[],
  message: Extract<ChatMessage, { kind: "file" }>,
) {
  const wire: WireMsg = {
    type: "file-available",
    id: message.id,
    name: message.name,
    size: message.size,
    mime: message.mime,
    at: message.at,
  };
  for (const dc of openChannels(channels)) dc.send(JSON.stringify(wire));
}

export async function sendFile(channels: RTCDataChannel[], id: string, file: File, at: number) {
  const start: WireMsg = {
    type: "file-start",
    id,
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
    at,
  };
  const end: WireMsg = { type: "file-end", id };
  const list = openChannels(channels);
  for (const dc of list) dc.send(JSON.stringify(start));

  let offset = 0;
  while (offset < file.size) {
    const blob = file.slice(offset, offset + CHUNK);
    const buf = await blob.arrayBuffer();
    for (const dc of list) {
      await waitBuffer(dc);
      if (dc.readyState === "open") dc.send(buf);
    }
    offset += CHUNK;
  }
  for (const dc of list) {
    if (dc.readyState === "open") dc.send(JSON.stringify(end));
  }
}

export async function replayHistory(
  dc: RTCDataChannel,
  messages: ChatMessage[],
  files: Map<string, File>,
) {
  await waitOpen(dc);
  for (const m of messages) {
    if (m.kind === "text") {
      dc.send(
        JSON.stringify({
          type: "text",
          id: m.id,
          text: m.text,
          at: m.at,
        } satisfies WireMsg),
      );
    } else {
      const file = files.get(m.id);
      if (file) {
        sendFileAvailable([dc], m);
      }
    }
  }
}

export function consumeGuestMessage(
  ev: MessageEvent,
  state: { current?: { id: string; name: string; size: number; mime: string; at: number; parts: ArrayBuffer[] } },
  onChat: (m: ChatMessage) => void,
  onProgress?: (id: string, progress: number) => void,
) {
  if (typeof ev.data === "string") {
    const msg = JSON.parse(ev.data) as WireMsg;
    if (msg.type === "text") {
      onChat({ id: msg.id, kind: "text", text: msg.text, at: msg.at });
    } else if (msg.type === "file-available") {
      onChat({
        id: msg.id,
        kind: "file",
        name: msg.name,
        size: msg.size,
        mime: msg.mime,
        at: msg.at,
      });
    } else if (msg.type === "file-start") {
      state.current = {
        id: msg.id,
        name: msg.name,
        size: msg.size,
        mime: msg.mime,
        at: msg.at,
        parts: [],
      };
      onProgress?.(msg.id, 0);
      onChat({
        id: msg.id,
        kind: "file",
        name: msg.name,
        size: msg.size,
        mime: msg.mime,
        at: msg.at,
      });
    } else if (msg.type === "file-end" && state.current?.id === msg.id) {
      const cur = state.current;
      const blob = new Blob(cur.parts, { type: cur.mime });
      onChat({
        id: cur.id,
        kind: "file",
        name: cur.name,
        size: cur.size,
        mime: cur.mime,
        at: cur.at,
        objectUrl: URL.createObjectURL(blob),
      });
      onProgress?.(cur.id, 100);
      state.current = undefined;
    }
    return;
  }
  if (state.current && ev.data instanceof ArrayBuffer) {
    state.current.parts.push(ev.data);
    const received = state.current.parts.reduce((sum, part) => sum + part.byteLength, 0);
    onProgress?.(
      state.current.id,
      Math.min(100, (received / state.current.size) * 100),
    );
    return;
  }
}

function openChannels(channels: RTCDataChannel[]) {
  return channels.filter((c) => c.readyState === "open");
}

function waitBuffer(dc: RTCDataChannel) {
  if (dc.bufferedAmount < 1024 * 1024) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const onLow = () => {
      dc.removeEventListener("bufferedamountlow", onLow);
      resolve();
    };
    dc.addEventListener("bufferedamountlow", onLow);
  });
}

function waitOpen(dc: RTCDataChannel) {
  if (dc.readyState === "open") return Promise.resolve();
  return new Promise<void>((resolve) => {
    dc.addEventListener("open", () => resolve(), { once: true });
  });
}
