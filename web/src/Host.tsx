import { useEffect, useRef, useState } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { useTranslate } from "./i18n";
import {
  appendMessage,
  clearHostRoom,
  getHostRoomId,
  loadMessages,
  mergeChat,
  setHostRoomId,
  type ChatMessage,
} from "./storage";
import {
  connectSignaling,
  type ServerMsg,
  type SignalPayload,
} from "./signaling";
import {
  applySignal,
  createHostPeer,
  hostOffer,
  newId,
  replayHistory,
  sendFile,
  sendFileAvailable,
  sendText,
} from "./webrtc";
import { ChatFeed } from "./components/ChatFeed";
import { InviteCard } from "./components/InviteCard";
import { LanguageSelect } from "./components/LanguageSelect";
import { MessageComposer } from "./components/MessageComposer";

type PeerLink = { pc: RTCPeerConnection; dc: RTCDataChannel };
type FileMessage = Extract<ChatMessage, { kind: "file" }>;

export function Host() {
  const t = useTranslate();
  const [roomId, setRoomId] = useState<string | null>(getHostRoomId() ?? null);
  const [status, setStatus] = useState("connecting");
  const [guests, setGuests] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => roomId ? loadMessages(roomId) : []);
  const filesRef = useRef(new Map<string, File>());
  const fileTimesRef = useRef(new Map<string, number>());
  const peersRef = useRef(new Map<string, PeerLink>());
  const roomRef = useRef(roomId);
  roomRef.current = roomId;

  useEffect(() => {
    const saved = getHostRoomId();
    const signaling = connectSignaling((message) => void handleServerMessage(message));
    signaling.send({ type: "hello", role: "host", room: saved ?? null });

    function dropPeer(id: string) {
      const link = peersRef.current.get(id);
      if (!link) return;
      link.dc.close();
      link.pc.close();
      peersRef.current.delete(id);
      setGuests(peersRef.current.size);
    }

    async function handleServerMessage(message: ServerMsg) {
      switch (message.type) {
        case "ready":
          if (message.role !== "host") break;
          setRoomId(message.room);
          setHostRoomId(message.room);
          setMessages(loadMessages(message.room));
          setStatus("roomOpen");
          break;
        case "guest-joined": {
          dropPeer(message.peerId);
          const onLocalSignal = (payload: SignalPayload) =>
            signaling.send({
              type: "signal",
              to: message.peerId,
              payload,
            });
          const { pc, dc } = createHostPeer(
            onLocalSignal,
            () => {
              const room = roomRef.current;
              if (room) void replayHistory(dc, loadMessages(room), filesRef.current);
            },
            (id, channel) => {
              const file = filesRef.current.get(id);
              const at = fileTimesRef.current.get(id);
              if (file && at) void sendFile([channel], id, file, at);
            },
          );
          peersRef.current.set(message.peerId, { pc, dc });
          setGuests(peersRef.current.size);
          await hostOffer(pc, onLocalSignal);
          break;
        }
        case "guest-left":
          dropPeer(message.peerId);
          break;
        case "signal": {
          const link = peersRef.current.get(message.from);
          if (link) await applySignal(link.pc, message.payload);
          break;
        }
        case "error":
          if (message.code === "host-taken") {
            setStatus("hostTaken");
            break;
          }
          setStatus(message.code);
          break;
      }
    }

    return () => {
      signaling.close();
      for (const id of peersRef.current.keys()) dropPeer(id);
    };
  }, []);

  function pushMessage(message: ChatMessage) {
    if (!roomId) return;
    appendMessage(roomId, "host", message);
    setMessages((previous) => mergeChat(previous, message));
  }

  async function sendMessage(text: string) {
    if (!text || status === "hostTaken") return;
    const message: ChatMessage = { id: newId(), kind: "text", text, at: Date.now() };
    pushMessage(message);
    await sendText([...peersRef.current.values()].map((peer) => peer.dc), message);
  }

  async function addFiles(list: FileList | File[]) {
    if (!roomId || !list.length || status === "hostTaken") return;
    const channels = [...peersRef.current.values()].map((peer) => peer.dc);
    for (const file of Array.from(list)) {
      const id = newId();
      filesRef.current.set(id, file);
      const message: FileMessage = {
        id,
        kind: "file",
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        at: Date.now(),
        objectUrl: URL.createObjectURL(file),
      };
      fileTimesRef.current.set(id, message.at);
      pushMessage(message);
      sendFileAvailable(channels, message);
    }
  }

  return (
    <Container maxWidth="md" className="page">
      <Stack spacing={3}>
        <Box className="hero">
          <Box className="hero-heading" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h1">{t("title")}</Typography>
            <LanguageSelect />
          </Box>
          <Typography className="lede">{t("lede")}</Typography>
        </Box>
        <InviteCard
          roomId={roomId}
          status={status}
          guests={guests}
        />
        <ChatFeed
          messages={messages}
          mine
        />
        <MessageComposer
          onSend={sendMessage}
          onFiles={addFiles}
          disabled={status === "hostTaken"}
        />
      </Stack>
    </Container>
  );
}
