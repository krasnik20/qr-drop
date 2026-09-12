using System.Net.WebSockets;
using QrDrop;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddSingleton<RoomRegistry>();
var app = builder.Build();

app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(20) });
app.UseCors(policy => policy.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true));

app.MapGet("/api/health", () => Results.Ok(new { ok = true }));
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

app.Run("http://localhost:5080");
