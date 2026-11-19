using Staj.Domain.Enums;

namespace Staj.Domain.Entities;

/// <summary>
/// Komisyon tarafından açılan staj dönemlerini ve takvimini temsil eder.
/// Staj 1 ve Staj 2 için ayrı ayrı açılır ve öğrencilerin seçebileceği tarih sınırlarını belirler.
/// </summary>
public class Term
{
    /// <summary>
    /// Benzersiz dönem kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Dönem başlığı (Örn: "2026-2027 Yaz Dönemi Staj-1").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Akademik yıl etiketi (Örn: "2026", "2027"). Arşivleme için kullanılır.
    /// </summary>
    public string AcademicYear { get; set; } = string.Empty;

    /// <summary>
    /// Bu dönemin geçerli olduğu staj türü (Staj1 veya Staj2).
    /// </summary>
    public InternshipType InternshipType { get; set; }

    /// <summary>
    /// Öğrencilerin staja başlayabileceği en erken tarih.
    /// </summary>
    public DateOnly EarliestStartDate { get; set; }

    /// <summary>
    /// Stajın tamamlanması gereken en geç bitiş tarihi.
    /// </summary>
    public DateOnly LatestEndDate { get; set; }

    /// <summary>
    /// Son başvuru ve evrak teslim tarihi. Bu tarihten sonra başvuru yapılamaz.
    /// </summary>
    public DateOnly ApplicationDeadline { get; set; }

    /// <summary>
    /// Staj bitiminde rapor ve sonuç evraklarının teslim edilmesi gereken son tarih.
    /// </summary>
    public DateOnly ReportDeadline { get; set; }

    /// <summary>
    /// Dönem için geçerli asgari iş günü sayısı (Varsayılan 20 gün).
    /// </summary>
    public int MinWorkDays { get; set; } = 20;

    /// <summary>
    /// Dönem için geçerli azami iş günü sayısı (Varsayılan 30 gün).
    /// </summary>
    public int MaxWorkDays { get; set; } = 30;

    /// <summary>
    /// Bu dönemin öğrencilere açık ve aktif olup olmadığı.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Dönemin oluşturulma tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Bu döneme ait staj başvuruları.
    /// </summary>
    public ICollection<Internship> Internships { get; set; } = new List<Internship>();
}
