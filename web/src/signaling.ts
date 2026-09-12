export type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  ice?: RTCIceCandidateInit | null;
};

export type ServerMsg =
  | { type: "ready"; role: "host" | "guest"; room: string; peerId: string; hostOnline?: boolean }
  | { type: "guest-joined"; peerId: string }
  | { type: "guest-left"; peerId: string }
  | { type: "host-left" }
  | { type: "host-back" }
  | { type: "signal"; from: string; payload: SignalPayload }
  | { type: "error"; code: string };

export function connectSignaling(onMessage: (msg: ServerMsg) => void | Promise<void>) {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws`);
  let chain = Promise.resolve();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(String(ev.data)) as ServerMsg;
    chain = chain.then(() => onMessage(msg)).catch((err) => console.error(err));
  });
  return {
    ws,
    send(data: unknown) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
      else ws.addEventListener("open", () => ws.send(JSON.stringify(data)), { once: true });
    },
    close() {
      ws.close();
    },
  };
}
