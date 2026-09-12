import { useEffect, useRef, useState } from "react";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { appendMessage, loadMessages, mergeChat, type ChatMessage } from "./storage";
import { connectSignaling, type ServerMsg } from "./signaling";
import {
  applySignal,
  consumeGuestMessage,
  createGuestPeer,
  type WireMsg,
} from "./webrtc";
import { useTranslate } from "./i18n";
import { ChatFeed } from "./components/ChatFeed";
import { LanguageSelect } from "./components/LanguageSelect";
import { StatusChip } from "./components/StatusChip";

export function Join() {
  const { roomId = "" } = useParams();
  const connectionRoomId = roomId || location.pathname.slice(1).split("/")[0];
  const t = useTranslate();
  const [status, setStatus] = useState("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessages(connectionRoomId),
  );
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const receiveState = useRef<Parameters<typeof consumeGuestMessage>[1]>({});
  const hostId = useRef("");
  const channelRef = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    const signaling = connectSignaling((message) => void handleServerMessage(message));
    signaling.send({
      type: "hello",
      role: "guest",
      room: connectionRoomId,
    });

    function resetPeer() {
      pcRef.current?.close();
      pcRef.current = null;
    }

    function ensurePeer() {
      if (pcRef.current) return pcRef.current;
      const peer = createGuestPeer(
        (payload) => { if (hostId.current) signaling.send({ type: "signal", to: hostId.current, payload }); },
        (event) =>
          consumeGuestMessage(
            event,
            receiveState.current,
            (message) => {
              appendMessage(connectionRoomId, "guest", message);
              setMessages((previous) => mergeChat(previous, message));
            },
            (id, progress) =>
              setFileProgress((previous) => ({
                ...previous,
                [id]: progress,
              })),
          ),
        () => setStatus("channel"),
        (channel) => {
          channelRef.current = channel;
        },
      );
      pcRef.current = peer;
      return peer;
    }

    async function handleServerMessage(message: ServerMsg) {
      switch (message.type) {
        case "ready":
          if (message.role === "guest") {
            setStatus(message.hostOnline ? "waitingChannel" : "waitingHost");
          }
          break;
        case "host-left":
          setStatus("hostLeft");
          resetPeer();
          break;
        case "host-back":
          setStatus("hostBack");
          resetPeer();
          break;
        case "signal":
          hostId.current = message.from;
          await applySignal(
            ensurePeer(),
            message.payload,
            (payload) =>
              signaling.send({
                type: "signal",
                to: message.from,
                payload,
              }),
          );
          break;
        case "error":
          setStatus(message.code);
          break;
      }
    }

    return () => {
      signaling.close();
      resetPeer();
    };
  }, [connectionRoomId]);

  function requestFile(id: string) {
    if (
      status !== "channel" ||
      channelRef.current?.readyState !== "open"
    ) {
      return;
    }
    setFileProgress((previous) => ({ ...previous, [id]: 0 }));
    const request: WireMsg = { type: "file-request", id };
    channelRef.current.send(JSON.stringify(request));
  }

  return (
    <Container maxWidth="md" className="page guest">
      <Stack spacing={3}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <LanguageSelect />
        </Box>
        <Paper className="glass-card hero-card">
          <Typography
            variant="overline"
            color="secondary"
          >
            {t("room")}
          </Typography>
          <Typography
            variant="h3"
            className="room-code"
          >
            {connectionRoomId}
          </Typography>
          <StatusChip status={status} />
        </Paper>
        <ChatFeed
          messages={messages}
          onFileRequest={requestFile}
          fileProgress={fileProgress}
          filesDisabled={status !== "channel"}
        />
      </Stack>
    </Container>
  );
}
