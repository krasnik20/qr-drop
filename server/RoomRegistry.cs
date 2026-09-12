using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace QrDrop;

internal sealed class RoomRegistry()
{
    private static readonly Regex RoomIdRx = new(@"^[a-z]+[0-9]{2}$", RegexOptions.Compiled);
    private readonly ConcurrentDictionary<string, Room> _rooms = new();

    public async Task HandleAsync(Peer peer)
    {
        var buffer = new byte[64 * 1024];
        while (peer.Socket.State == WebSocketState.Open)
        {
            var text = await ReadTextAsync(peer.Socket, buffer);
            if (text is null) break;

            try
            {
                var msg = JsonNode.Parse(text) as JsonObject ?? throw new JsonException("Expected object");

                switch (msg["type"]?.GetValue<string>())
                {
                    case "hello": await HelloAsync(peer, msg); break;
                    case "signal": await SignalAsync(peer, msg); break;
                    default: await peer.SendAsync(Err("unknown-type")); break;
                }
            }
            catch
            {
                await peer.SendAsync(Err("bad-json"));
                continue;
            }
        }
    }

    public void Drop(Peer peer)
    {
        if (peer.RoomId is null || !_rooms.TryGetValue(peer.RoomId, out var room)) return;
        if (peer.IsHost && ReferenceEquals(room.Host, peer))
        {
            room.Host = null;
            foreach (var guest in room.Guests.Values)
                _ = guest.SendAsync(new JsonObject { ["type"] = "host-left" });
            if (room.Guests.IsEmpty) _rooms.TryRemove(room.Id, out _);
            return;
        }

        if (room.Guests.TryRemove(peer.Id, out _))
            _ = room.Host?.SendAsync(new JsonObject { ["type"] = "guest-left", ["peerId"] = peer.Id });
        if (room.Host is null && room.Guests.IsEmpty) _rooms.TryRemove(room.Id, out _);
    }

    private async Task HelloAsync(Peer peer, JsonObject msg)
    {
        var role = msg["role"]?.GetValue<string>();
        if (role == "host")
        {
            var requested = msg["room"]?.GetValue<string>()?.Trim().ToLowerInvariant();
            Room room;
            if (!string.IsNullOrWhiteSpace(requested) && RoomIdRx.IsMatch(requested))
            {
                room = _rooms.GetOrAdd(requested, id => new Room { Id = id });
                if (room.Host is { Socket.State: WebSocketState.Open } existing && !ReferenceEquals(existing, peer))
                {
                    await peer.SendAsync(Err("host-taken"));
                    return;
                }
            }
            else
            {
                room = CreateRoom();
            }

            room.Host = peer;
            peer.IsHost = true;
            peer.RoomId = room.Id;
            await peer.SendAsync(new JsonObject { ["type"] = "ready", ["role"] = "host", ["room"] = room.Id, ["peerId"] = peer.Id });
            foreach (var guest in room.Guests.Values)
            {
                await peer.SendAsync(new JsonObject { ["type"] = "guest-joined", ["peerId"] = guest.Id });
                await guest.SendAsync(new JsonObject { ["type"] = "host-back" });
            }
            return;
        }

        if (role == "guest")
        {
            var roomId = msg["room"]?.GetValue<string>()?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(roomId))
            {
                await peer.SendAsync(Err("bad-room"));
                return;
            }

            var room = _rooms.GetOrAdd(roomId, id => new Room { Id = id });
            room.Guests[peer.Id] = peer;
            peer.RoomId = roomId;
            await peer.SendAsync(new JsonObject
            {
                ["type"] = "ready", ["role"] = "guest", ["room"] = room.Id, ["peerId"] = peer.Id,
                ["hostOnline"] = room.Host?.Socket.State == WebSocketState.Open
            });
            if (room.Host is { Socket.State: WebSocketState.Open })
                await room.Host.SendAsync(new JsonObject { ["type"] = "guest-joined", ["peerId"] = peer.Id });
            return;
        }
        await peer.SendAsync(Err("bad-role"));
    }

    private async Task SignalAsync(Peer peer, JsonObject msg)
    {
        if (peer.RoomId is null || !_rooms.TryGetValue(peer.RoomId, out var room))
        {
            await peer.SendAsync(Err("no-room"));
            return;
        }
        var to = msg["to"]?.GetValue<string>();
        var payload = msg["payload"];
        if (string.IsNullOrWhiteSpace(to) || payload is null)
        {
            await peer.SendAsync(Err("bad-signal"));
            return;
        }
        Peer? target = room.Host?.Id == to ? room.Host : null;
        if (target is null) room.Guests.TryGetValue(to, out target);
        if (target is null)
        {
            await peer.SendAsync(Err("no-peer"));
            return;
        }
        await target.SendAsync(new JsonObject { ["type"] = "signal", ["from"] = peer.Id, ["payload"] = payload.DeepClone() });
    }

    private Room CreateRoom()
    {
        for (var i = 0; i < 64; i++)
        {
            var id = RoomIdGenerator.Generate();
            if (_rooms.TryAdd(id, new Room { Id = id })) return _rooms[id];
        }
        throw new InvalidOperationException("could not allocate room id");
    }

    public string CreatePairingRoom() => CreateRoom().Id;

    public bool IsHostOnline(string roomId) =>
        _rooms.TryGetValue(roomId, out var room) &&
        room.Host is { Socket.State: WebSocketState.Open };

    private static JsonObject Err(string code) => new() { ["type"] = "error", ["code"] = code };

    private static async Task<string?> ReadTextAsync(WebSocket socket, byte[] buffer)
    {
        using var ms = new MemoryStream();
        WebSocketReceiveResult result;
        do
        {
            result = await socket.ReceiveAsync(buffer, CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
                return null;
            }
            ms.Write(buffer, 0, result.Count);
        } while (!result.EndOfMessage);
        return Encoding.UTF8.GetString(ms.ToArray());
    }
}
