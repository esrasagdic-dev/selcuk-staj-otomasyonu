using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SelcukStaj.Api.Models;
using SelcukStaj.Api.Services;

namespace SelcukStaj.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;
    private readonly IDeadlineReminderService _deadlineReminderService;

    public NotificationsController(
        INotificationService notificationService, 
        IEmailService emailService,
        IDeadlineReminderService deadlineReminderService)
    {
        _notificationService = notificationService;
        _emailService = emailService;
        _deadlineReminderService = deadlineReminderService;
    }

    private int GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idStr, out var id) ? id : 0;
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    }

    private string GetCurrentUserEmail()
    {
        return User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] int limit = 30)
    {
        var userId = GetCurrentUserId();
        var list = await _notificationService.GetNotificationsAsync(userId, limit);
        var unreadCount = await _notificationService.GetUnreadCountAsync(userId);

        return Ok(new
        {
            unreadCount,
            notifications = list.Select(n => new
            {
                n.Id,
                n.Title,
                n.Message,
                Type = n.Type.ToString(),
                n.RelatedApplicationId,
                n.IsRead,
                CreatedAt = DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            })
        });
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        var count = await _notificationService.GetUnreadCountAsync(userId);
        return Ok(new { unreadCount = count });
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = GetCurrentUserId();
        await _notificationService.MarkAsReadAsync(id, userId);
        return Ok(new { success = true });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetCurrentUserId();
        await _notificationService.MarkAllAsReadAsync(userId);
        return Ok(new { success = true });
    }

    [HttpGet("emails")]
    public async Task<IActionResult> GetSentEmails([FromQuery] int? applicationId, [FromQuery] int limit = 50)
    {
        var userId = GetCurrentUserId();
        var userRole = GetCurrentUserRole();
        var userEmail = GetCurrentUserEmail();

        var list = await _emailService.GetEmailsForUserAsync(userId, userEmail, userRole, applicationId, limit);
        return Ok(list.Select(e => new
        {
            e.Id,
            e.ToEmail,
            e.RecipientName,
            e.Subject,
            e.TemplateType,
            e.BodyHtml,
            e.RelatedApplicationId,
            e.Status,
            e.SentAt
        }));
    }

    [HttpPost("dispatch-deadline-reminders")]
    [Authorize(Roles = "CommissionMember,CommissionChair,SystemAdmin,DepartmentHead")]
    public async Task<IActionResult> DispatchDeadlineReminders([FromQuery] int thresholdDays = 7, [FromQuery] bool ignoreCooldown = false)
    {
        var result = await _deadlineReminderService.ProcessUpcomingDeadlinesAsync(thresholdDays, ignoreCooldown);
        return Ok(new
        {
            success = true,
            thresholdDays,
            result.ApplicationDeadlinesSent,
            result.DocumentDeadlinesSent,
            result.DiaryRemindersSent,
            result.DiariesLockedCount,
            result.TotalRemindersSent,
            result.Details,
            message = result.TotalRemindersSent > 0
                ? $"İşlem tamamlandı: {result.DiaryRemindersSent} defter uyarısı, {result.DiariesLockedCount} kilitlenen defter, {result.ApplicationDeadlinesSent} başvuru ve {result.DocumentDeadlinesSent} evrak hatırlatması iletildi."
                : "Şu anda hatırlatma kriterlerine uyan veya süresi kritik yaklaşan yeni öğrenci bulunmamaktadır."
        });
    }
}
