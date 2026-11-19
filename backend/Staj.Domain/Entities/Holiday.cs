namespace Staj.Domain.Entities;

/// <summary>
/// Resmi tatil günlerini temsil eder. İş günü hesaplayıcı bu günleri atlayarak staj bitiş tarihini hesaplar.
/// </summary>
public class Holiday
{
    /// <summary>
    /// Benzersiz tatil kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Tatil günü.
    /// </summary>
    public DateOnly Date { get; set; }

    /// <summary>
    /// Tatilin adı (Örn: "15 Temmuz Demokrasi ve Milli Birlik Günü").
    /// </summary>
    public string Name { get; set; } = string.Empty;
}
