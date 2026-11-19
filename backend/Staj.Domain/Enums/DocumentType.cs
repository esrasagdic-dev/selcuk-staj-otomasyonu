namespace Staj.Domain.Enums;

/// <summary>
/// Sisteme yüklenen veya sistemden üretilen resmi belge türleri.
/// </summary>
public enum DocumentType
{
    /// <summary>
    /// Staj Kabul Formu (İşyeri kaşe ve ıslak imzalı).
    /// </summary>
    Form2 = 1,

    /// <summary>
    /// e-Devlet üzerinden alınan SPAS Müstehaklık Belgesi (Sağlık Provizyon Aktivasyon Sistemi).
    /// </summary>
    Spas = 2,

    /// <summary>
    /// Staj Değerlendirme / Sonuç Formu (İşyeri danışmanının ıslak imzalı doldurduğu form).
    /// </summary>
    ResultForm = 3,

    /// <summary>
    /// Stajyer maaşı alan öğrenciler için banka maaş dekontu (KPTO'ya gider).
    /// </summary>
    SalaryReceipt = 4,

    /// <summary>
    /// Staj İptal Formu (Form 7).
    /// </summary>
    Form7 = 5,

    /// <summary>
    /// Genel staj raporu (PDF formatında ciltli veya dijital).
    /// </summary>
    InternshipReport = 6,

    /// <summary>
    /// Diğer ek belgeler (izin raporu, kurum kabul yazısı vb.).
    /// </summary>
    Other = 7,

    /// <summary>
    /// Staj Devamlılık Formu (Form 3 - TF-BM-SF-03).
    /// </summary>
    Form3 = 8
}
