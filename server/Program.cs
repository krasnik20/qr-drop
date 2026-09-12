using System.Net.WebSockets;
using QrDrop;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddSingleton<RoomRegistry>();
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(20) });
app.UseCors(policy => policy.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true));

app.MapGet("/api/health", () => Results.Ok(new { ok = true }));
app.MapPost("/api/rooms/pair", (RoomRegistry rooms) =>
    Results.Ok(new { room = rooms.CreatePairingRoom() }));
app.MapGet("/api/rooms/{roomId}/status", (string roomId, RoomRegistry rooms) =>
    Results.Ok(new { hostOnline = rooms.IsHostOnline(roomId) }));
app.Map("/ws", async (HttpContext ctx, RoomRegistry rooms) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest)
    {
        ctx.Response.StatusCode = 400;
        return;
    }

    using var socket = await ctx.WebSockets.AcceptWebSocketAsync();
    var peer = new Peer(socket);
    try
    {
        await rooms.HandleAsync(peer);
    }
    catch (WebSocketException)
    {
        // Closed by the client.
    }
    finally
    {
        rooms.Drop(peer);
    }
});

app.MapFallbackToFile("index.html");

app.Run();
