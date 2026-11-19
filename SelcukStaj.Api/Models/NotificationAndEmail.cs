namespace SelcukStaj.Api.Models;

public enum NotificationType
{
    Info = 1,
    Success = 2,
    Warning = 3,
    Error = 4
}

public class UserNotification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; } = NotificationType.Info;
    public int? RelatedApplicationId { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}

public class EmailLog
{
    public int Id { get; set; }
    public string ToEmail { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string TemplateType { get; set; } = string.Empty;
    public int? RelatedApplicationId { get; set; }
    public string Status { get; set; } = "Sent";
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
