namespace Staj.Application.Common;

/// <summary>
/// İş kuralı ihlallerinde fırlatılan temel uygulama hatası. API katmanında uygun HTTP durum koduna çevrilir.
/// </summary>
public class AppException : Exception
{
    /// <summary>
    /// Karşılık gelen HTTP durum kodu.
    /// </summary>
    public int StatusCode { get; }

    /// <summary>
    /// Yeni bir uygulama hatası oluşturur.
    /// </summary>
    public AppException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }

    /// <summary>
    /// 404 - Kayıt bulunamadı hatası.
    /// </summary>
    public static AppException NotFound(string what = "Kayıt") => new($"{what} bulunamadı.", 404);

    /// <summary>
    /// 403 - Yetkisiz erişim hatası.
    /// </summary>
    public static AppException Forbidden(string message = "Bu işlem için yetkiniz yok.") => new(message, 403);

    /// <summary>
    /// 400 - Geçersiz istek / iş kuralı ihlali.
    /// </summary>
    public static AppException BadRequest(string message) => new(message, 400);
}
