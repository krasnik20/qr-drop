using System.Net.WebSockets;
using System.Text;
using System.Text.Json.Nodes;

namespace QrDrop;

internal sealed class Peer(WebSocket socket)
{
    public string Id { get; } = "p-" + Guid.NewGuid().ToString("N")[..8];
    public WebSocket Socket { get; } = socket;
    public string? RoomId { get; set; }
    public bool IsHost { get; set; }

    public async Task SendAsync(JsonObject payload, CancellationToken ct = default)
    {
        if (Socket.State != WebSocketState.Open) return;
        var bytes = Encoding.UTF8.GetBytes(payload.ToJsonString());
        await Socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
    }
}
