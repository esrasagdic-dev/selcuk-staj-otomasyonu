namespace SelcukStaj.Api.Models;

public enum InternshipType
{
    Staj1 = 1,
    Staj2 = 2
}

public class AcademicYear
{
    public int Id { get; set; }
    public string Title { get; set; } = "2026-2027"; // Örn: 2026-2027
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<InternshipPeriod> Periods { get; set; } = new List<InternshipPeriod>();
}

public class InternshipPeriod
{
    public int Id { get; set; }
    public int AcademicYearId { get; set; }
    public AcademicYear? AcademicYear { get; set; }

    public string Title { get; set; } = string.Empty; // Örn: "2026-2027 Yaz Dönemi - Staj 1"
    public InternshipType Type { get; set; } = InternshipType.Staj1;
    public int DefaultWorkDays { get; set; } = 20; // 20 veya 30 gün
    
    // Tarih Sınırları
    public DateTime ApplicationStartDate { get; set; }
    public DateTime ApplicationEndDate { get; set; }
    public DateTime EarliestStartDate { get; set; }
    public DateTime LatestEndDate { get; set; }
    public DateTime DocumentDeadlineDate { get; set; } // Ortak Son Teslim Tarihi

    public bool IsSaturdayAllowed { get; set; } = true;
    public bool IsActive { get; set; } = true;

    public ICollection<InternshipApplication> Applications { get; set; } = new List<InternshipApplication>();
}
