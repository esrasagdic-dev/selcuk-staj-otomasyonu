namespace Staj.Domain.Enums;

/// <summary>
/// Komisyonun yüklenen resmi belgeler için verdiği belge bazlı inceleme durumu.
/// </summary>
public enum DocumentStatus
{
    /// <summary>
    /// Belge henüz incelenmedi, komisyon incelemesi bekliyor.
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Belge komisyon tarafından onaylandı.
    /// </summary>
    Approved = 1,

    /// <summary>
    /// Belgede eksiklik veya hata tespit edildi; yeniden yüklenmesi istendi.
    /// </summary>
    RevisionRequested = 2,

    /// <summary>
    /// Belge komisyon tarafından reddedildi.
    /// </summary>
    Rejected = 3
}
