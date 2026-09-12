using System.Collections.Concurrent;

namespace QrDrop;

internal sealed class Room
{
    public required string Id { get; init; }
    public Peer? Host { get; set; }
    public ConcurrentDictionary<string, Peer> Guests { get; } = new();
}
