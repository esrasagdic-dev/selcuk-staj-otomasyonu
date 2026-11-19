namespace Staj.Domain.Enums;

/// <summary>
/// İzin talebinin türü.
/// </summary>
public enum LeaveType
{
    /// <summary>
    /// Mazeret izni.
    /// </summary>
    Excuse = 1,

    /// <summary>
    /// Sağlık raporu.
    /// </summary>
    MedicalReport = 2
}

/// <summary>
/// İzin talebinin onay durumu.
/// </summary>
public enum LeaveRequestStatus
{
    /// <summary>
    /// Komisyon kararı bekleniyor.
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Komisyon onayladı; bitiş tarihi ileri kaydırıldı.
    /// </summary>
    Approved = 1,

    /// <summary>
    /// Komisyon reddetti.
    /// </summary>
    Rejected = 2
}

/// <summary>
/// Bildirim kategorisi (arayüzde ikon/renk seçimi için).
/// </summary>
public enum NotificationType
{
    /// <summary>
    /// Genel bilgilendirme.
    /// </summary>
    Info = 0,

    /// <summary>
    /// Başarılı işlem (onay, sigorta başlatıldı vb.).
    /// </summary>
    Success = 1,

    /// <summary>
    /// Uyarı (revize, bitiş yaklaşıyor vb.).
    /// </summary>
    Warning = 2,

    /// <summary>
    /// Tarih değişikliği (KPTO sigorta çıkış tarihi güncellemesi).
    /// </summary>
    DateChanged = 3,

    /// <summary>
    /// Maaş dekontu yüklendi (KPTO).
    /// </summary>
    SalaryReceipt = 4
}
