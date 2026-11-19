using Microsoft.Extensions.Options;
using Staj.Application.Common;

namespace Staj.Infrastructure.Services;

/// <summary>
/// Dosya saklama ayarları (appsettings.json → "Storage" bölümü).
/// </summary>
public class StorageOptions
{
    /// <summary>Yüklenen dosyaların saklanacağı klasör yolu.</summary>
    public string Root { get; set; } = "uploads";
}

/// <summary>
/// Hocanın açık şartı doğrultusunda PDF ve diğer belgeleri veritabanını şişirmeden diskte (uploads klasörü) GUID isimle saklar.
/// </summary>
public class DiskFileStorage : IFileStorage
{
    private readonly string _root;

    /// <summary>
    /// Yeni bir disk dosya saklama servisi oluşturur ve klasörü hazırlar.
    /// </summary>
    public DiskFileStorage(IOptions<StorageOptions> options)
    {
        _root = Path.GetFullPath(options.Value.Root);
        Directory.CreateDirectory(_root);
    }

    /// <inheritdoc />
    public async Task<string> SaveAsync(Stream content, string extension, CancellationToken ct = default)
    {
        var ext = extension.StartsWith('.') ? extension : "." + extension;
        var name = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var path = Path.Combine(_root, name);
        await using var fs = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(fs, ct);
        return name;
    }

    /// <inheritdoc />
    public Stream OpenRead(string storedFileName)
    {
        var safe = Path.GetFileName(storedFileName);
        var path = Path.Combine(_root, safe);
        if (!File.Exists(path)) throw AppException.NotFound("Dosya diskte");
        return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    /// <inheritdoc />
    public void Delete(string storedFileName)
    {
        var safe = Path.GetFileName(storedFileName);
        var path = Path.Combine(_root, safe);
        if (File.Exists(path)) File.Delete(path);
    }
}
