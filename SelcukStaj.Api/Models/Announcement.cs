namespace SelcukStaj.Api.Models;

public class Announcement
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = "Takvim"; // Takvim, Mevzuat, Sigorta, Rehber
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public bool IsPublished { get; set; } = true;
    public string Author { get; set; } = "Staj Komisyonu";
    public int? RelatedPeriodId { get; set; }
    public InternshipPeriod? RelatedPeriod { get; set; }
}
