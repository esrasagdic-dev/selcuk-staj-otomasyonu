using Staj.Domain.Enums;

namespace Staj.Domain.Entities;

/// <summary>
/// Öğrencinin staj sırasında girdiği izin / rapor (telafi) talebini temsil eder.
/// Komisyon onayladığında yapılmayan günler stajın sonuna eklenir ve KPTO'ya yeni bitiş tarihi bildirilir.
/// </summary>
public class LeaveRequest
{
    /// <summary>
    /// Benzersiz talep kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Talebin ait olduğu staj kimliği.
    /// </summary>
    public Guid InternshipId { get; set; }

    /// <summary>
    /// Talebin ait olduğu staj.
    /// </summary>
    public Internship Internship { get; set; } = null!;

    /// <summary>
    /// İzin türü (Mazeret izni / Sağlık raporu).
    /// </summary>
    public LeaveType Type { get; set; }

    /// <summary>
    /// İznin başladığı tarih.
    /// </summary>
    public DateOnly StartDate { get; set; }

    /// <summary>
    /// Kullanılan (telafi edilecek) iş günü sayısı.
    /// </summary>
    public int Days { get; set; }

    /// <summary>
    /// Öğrencinin belirttiği gerekçe.
    /// </summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// Talebin onay durumu.
    /// </summary>
    public LeaveRequestStatus Status { get; set; } = LeaveRequestStatus.Pending;

    /// <summary>
    /// Komisyonun karar notu.
    /// </summary>
    public string? ReviewNote { get; set; }

    /// <summary>
    /// Talebi değerlendiren komisyon üyesinin kimliği.
    /// </summary>
    public Guid? ReviewedById { get; set; }

    /// <summary>
    /// Onay öncesi staj bitiş tarihi.
    /// </summary>
    public DateOnly? OldEndDate { get; set; }

    /// <summary>
    /// Onay sonrası hesaplanan yeni staj bitiş tarihi.
    /// </summary>
    public DateOnly? NewEndDate { get; set; }

    /// <summary>
    /// Talep tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Karar tarihi.
    /// </summary>
    public DateTime? ReviewedAt { get; set; }
}
