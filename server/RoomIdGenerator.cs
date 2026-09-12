namespace QrDrop;

internal sealed class RoomIdGenerator
{
    private static readonly string[] Words =
    [
        "amber", "dusk", "haze", "keen", "navy", "quartz", "rust", "sage",
        "umber", "warm", "cedar", "dune", "haven", "nest", "zen"
    ];

    public static string Generate() =>
        $"{Words[Random.Shared.Next(Words.Length)]}{Random.Shared.Next(10, 100)}";
}
