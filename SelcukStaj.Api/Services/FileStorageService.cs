namespace SelcukStaj.Api.Services;

public interface IFileStorageService
{
    Task<(string storedFileName, long fileSizeBytes)> SaveFileAsync(IFormFile file, string subFolder, CancellationToken cancellationToken = default);
    Task<(byte[] fileBytes, string contentType, string originalFileName)?> GetFileAsync(string subFolder, string storedFileName, CancellationToken cancellationToken = default);
    bool DeleteFile(string subFolder, string storedFileName);
}

public class FileStorageService : IFileStorageService
{
    private readonly string _baseStoragePath;
    private readonly HashSet<string> _allowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".png", ".jpg", ".jpeg"
    };

    public FileStorageService(IConfiguration configuration, IWebHostEnvironment env)
    {
        // Web kökü dışında güvenli depolama klasörü
        var configuredPath = configuration["FileStorage:BasePath"];
        _baseStoragePath = !string.IsNullOrEmpty(configuredPath)
            ? configuredPath
            : Path.Combine(env.ContentRootPath, "..", "SecureUploads");

        if (!Directory.Exists(_baseStoragePath))
        {
            Directory.CreateDirectory(_baseStoragePath);
        }
    }

    public async Task<(string storedFileName, long fileSizeBytes)> SaveFileAsync(IFormFile file, string subFolder, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("Dosya boş olamaz.");
        }

        var ext = Path.GetExtension(file.FileName);
        if (!_allowedExtensions.Contains(ext))
        {
            throw new InvalidOperationException($"'{ext}' uzantılı dosya yüklenemez. Yalnızca PDF, PNG veya JPG yükleyebilirsiniz.");
        }

        // Max 15 MB
        if (file.Length > 15 * 1024 * 1024)
        {
            throw new InvalidOperationException("Dosya boyutu 15 MB'ı aşamaz.");
        }

        var targetFolder = Path.Combine(_baseStoragePath, subFolder);
        if (!Directory.Exists(targetFolder))
        {
            Directory.CreateDirectory(targetFolder);
        }

        var storedFileName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(targetFolder, storedFileName);

        await using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream, cancellationToken);

        return (storedFileName, file.Length);
    }

    public async Task<(byte[] fileBytes, string contentType, string originalFileName)?> GetFileAsync(string subFolder, string storedFileName, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_baseStoragePath, subFolder, storedFileName);
        if (!File.Exists(fullPath))
        {
            return null;
        }

        var ext = Path.GetExtension(storedFileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };

        var bytes = await File.ReadAllBytesAsync(fullPath, cancellationToken);
        return (bytes, contentType, storedFileName);
    }

    public bool DeleteFile(string subFolder, string storedFileName)
    {
        var fullPath = Path.Combine(_baseStoragePath, subFolder, storedFileName);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            return true;
        }
        return false;
    }
}
