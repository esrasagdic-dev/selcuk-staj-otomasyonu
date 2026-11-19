namespace Staj.Application.Common;

/// <summary>
/// Uygulama genel ayarları (appsettings.json → "App" bölümü).
/// </summary>
public class AppSettings
{
    /// <summary>
    /// Öğrencilerin kayıt olabileceği okul e-posta alan adı (Örn: "ogr.selcuk.edu.tr").
    /// </summary>
    public string StudentEmailDomain { get; set; } = "ogr.selcuk.edu.tr";

    /// <summary>
    /// Arayüzün herkese açık adresi. E-postalardaki bağlantılar ve PDF'lerdeki QR kodlar bu adresi kullanır.
    /// </summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:3000";

    /// <summary>
    /// Yüklenebilecek en büyük dosya boyutu (MB).
    /// </summary>
    public int MaxUploadMb { get; set; } = 10;
}
