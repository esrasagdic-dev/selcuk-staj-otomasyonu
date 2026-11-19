namespace SelcukStaj.Api.Models;

public class InternshipDiary
{
    public int Id { get; set; }
    public int InternshipApplicationId { get; set; }
    public InternshipApplication? InternshipApplication { get; set; }

    public bool IsSubmittedToAdvisor { get; set; } = false;
    public DateTime? SubmittedAt { get; set; }
    public bool IsApprovedByAdvisor { get; set; } = false;
    public DateTime? ApprovedAt { get; set; }
    public string? AdvisorIpAddress { get; set; }
    public string? AdvisorNotes { get; set; }

    // Otomatik Hatırlatıcı & Süre Sonu Defter Kilitleme
    public bool IsLocked { get; set; } = false;
    public string? LockReason { get; set; }

    // İşyeri Defter Değerlendirmesinde Revizyon / Düzeltme Talebi
    public bool IsRevisionRequestedByAdvisor { get; set; } = false;
    public string? AdvisorRevisionNotes { get; set; }
    public DateTime? RevisionRequestedAt { get; set; }

    // Resmî Kapak Sayfa 2 (İşyeri & Personel Tanıtımı) Bilgileri
    public string? TotalEmployees { get; set; }
    public string? CoverPageDataJson { get; set; }

    public ICollection<DiaryEntry> Entries { get; set; } = new List<DiaryEntry>();
}

public class DiaryCoverInfoDto
{
    public string? TotalEmployees { get; set; }
    public string? WorkplacePhone { get; set; }
    public string? WorkplaceEmail { get; set; }
    public string? WorkplaceWebSite { get; set; }
    public string? WorkplaceAddress { get; set; }
    public string? WorkplaceCity { get; set; }
    public List<string> ActivityAreas { get; set; } = new();
    public List<WorkplaceStaffDto> StaffMembers { get; set; } = new();
}

public class WorkplaceStaffDto
{
    public int RowNo { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string GraduatedUniversityAndDepartment { get; set; } = string.Empty;
    public string TitleOrPosition { get; set; } = string.Empty;
}

public class DiaryEntry
{
    public int Id { get; set; }
    public int InternshipDiaryId { get; set; }
    public InternshipDiary? Diary { get; set; }

    public int DayNumber { get; set; } // 1, 2, ... 20 veya 30
    public DateTime EntryDate { get; set; }
    public string Title { get; set; } = string.Empty; // Yapılan İşin Başlığı
    public string Content { get; set; } = string.Empty; // Rapor içeriği (Arial 12pt formatında min 1 sayfa kuralı)
    public bool IsDraft { get; set; } = false;
    
    // Her gün için ayrı teknik görsel veya şema ekleme
    public string? ImageUrl { get; set; } // Sunucuda saklanan görsel adı
    public string? ImageCaption { get; set; } // Görsel açıklaması (Örn: Şekil 1: Ağ ve Sistem Mimarisi Şeması)

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
