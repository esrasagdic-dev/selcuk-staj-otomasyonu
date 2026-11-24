namespace Staj.Domain.Enums;

/// <summary>
/// Komisyon tarafından staj sonunda verilen 3 kademeli akademik değerlendirme sonucu.
/// </summary>
public enum AcademicResultType
{
    /// <summary>
    /// Staj henüz komisyon tarafından değerlendirilmemiştir.
    /// </summary>
    None = 0,

    /// <summary>
    /// Staj tüm iş günleriyle başarılı bulunmuş ve tam kabul edilmiştir.
    /// </summary>
    Successful = 1,

    /// <summary>
    /// Staj kısmen başarılı bulunmuş ve belirli sayıda iş günü kabul edilmiştir.
    /// </summary>
    PartiallySuccessful = 2,

    /// <summary>
    /// Staj başarısız sayılmıştır (Kaldı / Reddedildi).
    /// </summary>
    Unsuccessful = 3
}
