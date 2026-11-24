namespace Staj.Domain.Enums;

/// <summary>
/// Staj sürecinin anlık durumunu belirten durum makinesi değerleri.
/// </summary>
public enum InternshipStatus
{
    /// <summary>
    /// Öğrenci başvuruyu taslak olarak kaydetmiştir, henüz komisyona göndermemiştir.
    /// </summary>
    Draft = 0,

    /// <summary>
    /// Öğrenci Form 2 ve SPAS belgesini yükleyip başvuruyu komisyon incelemesine göndermiştir.
    /// </summary>
    Submitted = 1,

    /// <summary>
    /// Komisyon evraklarda eksik veya hata tespit etmiş ve gerekçe belirterek revize istemiştir.
    /// </summary>
    RevisionRequested = 2,

    /// <summary>
    /// Komisyon staj yerini ve evrakları onaylamıştır. Şirkete şifre gönderilmiş ve KPTO'ya sigorta talebi düşmüştür.
    /// </summary>
    ApprovedByCommittee = 3,

    /// <summary>
    /// KPTO birimi SGK girişini yapmış ve stajın başlamasına onay vermiştir.
    /// </summary>
    InsuranceStarted = 4,

    /// <summary>
    /// Staj başlangıç tarihi gelmiş ve öğrenci fiilen staja başlamıştır. (Sanal defter doldurma aşaması).
    /// </summary>
    InProgress = 5,

    /// <summary>
    /// Staj süresi tamamlanmış, öğrenci defteri doldurmuş, şirket danışmanı onaylamış ve komisyon değerlendirmesi beklenmektedir.
    /// </summary>
    CompletedPendingReview = 6,

    /// <summary>
    /// Komisyon stajı başarılı bulmuş ve staj tamamlanmıştır (Geçti).
    /// </summary>
    Passed = 7,

    /// <summary>
    /// Komisyon stajı yetersiz bulmuş veya devamsızlık nedeniyle staj başarısız sayılmıştır (Kaldı).
    /// </summary>
    Failed = 8,

    /// <summary>
    /// Öğrenci veya komisyon tarafından staj iptal edilmiştir (Form 7).
    /// </summary>
    Cancelled = 9,

    /// <summary>
    /// Öğrenci Form 7 (Staj İptal Formu) doldurarak staj iptal talebini komisyona göndermiştir; komisyon incelemesi beklenmektedir.
    /// </summary>
    CancellationRequested = 10,

    /// <summary>
    /// Komisyon başvuruyu gerekçeli olarak reddetmiştir; öğrenci yeni başvuru yapabilir.
    /// </summary>
    Rejected = 11
}
