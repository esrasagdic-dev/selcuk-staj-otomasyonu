using Microsoft.EntityFrameworkCore;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Domain.Enums;

namespace Staj.Application.Services;

/// <summary>
/// Şirket yetkilisi (Advisor) ve danışman işlemleri: stajyerleri görme, sanal defteri inceleme,
/// "Defteri gördüm / inceledim" onayı verme veya beğenilmeyen defter için revize isteme (Madde 15, 16).
/// </summary>
public class AdvisorService
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly InternshipService _internships;
    private readonly NotificationService _notify;

    /// <summary>
    /// Yeni bir şirket yetkilisi servisi oluşturur.
    /// </summary>
    public AdvisorService(IAppDbContext db, ICurrentUser currentUser, InternshipService internships, NotificationService notify)
    {
        _db = db;
        _currentUser = currentUser;
        _internships = internships;
        _notify = notify;
    }

    /// <summary>
    /// Şirket yetkilisine atanmış stajyerleri listeler.
    /// </summary>
    public async Task<List<InternshipSummaryDto>> ListMyInternsAsync(CancellationToken ct = default)
    {
        var list = await _internships.Query()
            .Where(i => i.AdvisorId == _currentUser.UserId && i.Status != InternshipStatus.Cancelled)
            .OrderByDescending(i => i.StartDate)
            .ToListAsync(ct);
        return list.Select(i => i.ToSummary()).ToList();
    }

    /// <summary>
    /// Staj sonunda "Staj defterini gördüm ve inceledim" onayını verir. Eksik deftere onay açılmaz (Madde 16).
    /// </summary>
    public async Task<InternshipDetailDto> ApproveLogbookAsync(Guid id, string? ipAddress = null, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (_currentUser.Role == UserRole.CompanyAdvisor && i.AdvisorId != _currentUser.UserId)
            throw AppException.Forbidden();
        if (i.Status is not (InternshipStatus.ApprovedByCommittee or InternshipStatus.InsuranceStarted or InternshipStatus.InProgress or InternshipStatus.CompletedPendingReview))
            throw AppException.BadRequest("Defter onayı yalnızca aktif veya tamamlanmış staj sürecinde verilebilir.");
        var completedCount = i.LogbookEntries.Count(e => !e.IsDraft);
        if (completedCount < i.WorkDays)
            throw AppException.BadRequest($"Eksik staj defterine onay açılamaz! Öğrenci {i.WorkDays} iş gününün tamamını taslaktan çıkarıp tamamlamalıdır (Tamamlanan: {completedCount} / {i.WorkDays} gün).");

        i.AdvisorLogbookApproved = true;
        i.AdvisorApprovedAt = DateTime.UtcNow;
        i.AdvisorApprovedIpAddress = string.IsNullOrWhiteSpace(ipAddress) ? null : ipAddress.Trim();
        i.IsLogbookLocked = true;
        i.LogbookLockReason = $"Sorumlu mühendis ({i.AdvisorName}) tarafından {DateTime.Now:dd.MM.yyyy HH:mm} tarihinde onaylanarak kilitlendi.";
        i.LogbookRevisionRequested = false;
        i.LogbookRevisionNote = null;
        i.AdvisorEmailStatus = $"Sorumlu mühendis ({i.AdvisorName}) staj defterini inceledi ve onayladı ({DateTime.Now:dd.MM.yyyy HH:mm}).";
        i.UpdatedAt = DateTime.UtcNow;
        _notify.ToUser(i.StudentId, "Staj Defteriniz Onaylandı", $"Sorumlu mühendis ({i.AdvisorName}) sanal staj defterinizi inceledi ve onayladı.", NotificationType.Success, i.Id);
        _notify.Audit("Advisor.ApproveLogbook", "Internship", i.Id, $"IP: {i.AdvisorApprovedIpAddress ?? "-"}");
        await _db.SaveChangesAsync(ct);
        return await _internships.ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Danışman / Sorumlu mühendis staj defterini beğenmediğinde veya eksik bulduğunda öğrenciden revize ister (Madde 15).
    /// </summary>
    public async Task<InternshipDetailDto> RequestLogbookRevisionAsync(Guid id, string? note, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(note))
            throw AppException.BadRequest("Lütfen staj defteri için revize / düzeltme gerekçesini yazınız.");

        var i = await _internships.LoadAsync(id, ct);
        if (_currentUser.Role == UserRole.CompanyAdvisor && i.AdvisorId != _currentUser.UserId)
            throw AppException.Forbidden();

        i.AdvisorLogbookApproved = false;
        i.AdvisorApprovedAt = null;
        i.IsLogbookLocked = false;
        i.LogbookLockReason = null;
        i.LogbookSubmittedToAdvisorAt = null;
        i.LogbookRevisionRequested = true;
        i.LogbookRevisionNote = note.Trim();
        i.AdvisorEmailStatus = $"Danışman ({i.AdvisorName}) staj defteri için revize talep etti ({DateTime.Now:dd.MM.yyyy HH:mm}).";
        i.UpdatedAt = DateTime.UtcNow;

        _notify.ToUser(i.StudentId, "Staj Defteriniz İçin Revize İstendi",
            $"Danışman ({i.AdvisorName}) staj defterinizde düzeltme talep etti: {note.Trim()}",
            NotificationType.Warning, i.Id);
        _notify.Audit("Advisor.RequestLogbookRevision", "Internship", i.Id, note.Trim());
        await _db.SaveChangesAsync(ct);

        await _notify.TryEmailAsync(i.Student.Email, "Staj Defteriniz İçin Revize İstendi",
            $"<p>Sayın {i.Student.FullName},</p><p>Staj danışmanınız <b>{i.AdvisorName}</b> sanal staj defterinizi incelemiş ve aşağıdaki gerekçeyle revize (düzeltme) talep etmiştir:</p><blockquote>{System.Net.WebUtility.HtmlEncode(note.Trim())}</blockquote><p>Lütfen sanal staj defterinizi düzenleyip tekrar onaya gönderiniz.</p>", ct, i.Id);

        return await _internships.ToDetailAsync(i, ct);
    }
}
