namespace Staj.Domain.Enums;

/// <summary>
/// KPTO (Kariyer Planlama ve Tanıtım / Sigorta) ekranındaki sigorta takip durumları.
/// </summary>
public enum KptoInsuranceStatus
{
    /// <summary>
    /// Komisyon tarafından onaylanıp KPTO ekranına yeni düşen başvurular (Gelenler listesi).
    /// </summary>
    Pending = 1,

    /// <summary>
    /// KPTO memuru tarafından SGK işe giriş bildirgesi verilmiş ve sigortası başlatılmış öğrenciler.
    /// </summary>
    InsuranceActive = 2,

    /// <summary>
    /// Evrak eksikliği, tarih değişikliği veya iptal nedeniyle sigortası başlatılmayanlar listesi.
    /// </summary>
    InsuranceNotStarted = 3
}
