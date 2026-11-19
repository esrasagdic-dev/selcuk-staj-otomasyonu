namespace SelcukStaj.Api.Models;

public enum DocumentType
{
    Form2_KabulFormu = 1,
    Spas_Mustehaklik = 2,
    Form5_OgrenciBeyani = 3,
    Form3_DevamFormu = 4,
    Form4_DegerlendirmeFormu = 5,
    Form7_IptalFormu = 6,
    Other = 7
}

public enum DocumentStatus
{
    Pending = 1,          // İnceleme bekliyor
    Approved = 2,         // Onaylandı
    RevisionRequested = 3,// Düzeltme istendi
    Rejected = 4          // Reddedildi
}

public class Document
{
    public int Id { get; set; }
    public int InternshipApplicationId { get; set; }
    public InternshipApplication? InternshipApplication { get; set; }

    public DocumentType Type { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Pending;
    public string? CommissionFeedback { get; set; } // Düzeltme gerekçesi

    public int CurrentVersionNumber { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DocumentVersion> Versions { get; set; } = new List<DocumentVersion>();
}

public class DocumentVersion
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    public int VersionNumber { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty; // Güvenli GUID dosya adı
    public string ContentType { get; set; } = "application/pdf";
    public long FileSizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public int UploadedByUserId { get; set; }
}
