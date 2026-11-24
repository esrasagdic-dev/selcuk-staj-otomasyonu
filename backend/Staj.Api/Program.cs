using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Staj.Application;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Application.Services;
using Staj.Domain.Enums;
using Staj.Infrastructure;
using Staj.Infrastructure.Persistence;
using Staj.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// JSON: Enum'lar hem string hem sayı olarak okunabilsin, yanıtta string dönsün
builder.Services.ConfigureHttpJsonOptions(opt =>
{
    opt.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("App"));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.Configure<ForwardedHeadersOptions>(opt =>
{
    opt.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    opt.KnownNetworks.Clear();
    opt.KnownProxies.Clear();
});

// CORS (Yapılandırılabilir AllowedOrigins)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins is not { Length: > 0 })
{
    allowedOrigins = new[]
    {
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:8080", "http://127.0.0.1:8080"
    };
}
builder.Services.AddCors(opt =>
{
    opt.AddDefaultPolicy(p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod());
});

// JWT Kimlik Doğrulama
var jwtSection = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection.Issuer,
            ValidAudience = jwtSection.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection.Key))
        };
    });

// Rol Politikaları
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Committee", p => p.RequireRole(
        nameof(UserRole.CommitteeMember), nameof(UserRole.DepartmentHead), nameof(UserRole.Admin)))
    .AddPolicy("DepartmentHead", p => p.RequireRole(
        nameof(UserRole.DepartmentHead), nameof(UserRole.Admin)))
    .AddPolicy("Advisor", p => p.RequireRole(
        nameof(UserRole.CompanyAdvisor), nameof(UserRole.CommitteeMember), nameof(UserRole.DepartmentHead), nameof(UserRole.Admin)))
    .AddPolicy("Kpto", p => p.RequireRole(
        nameof(UserRole.KptoOfficer), nameof(UserRole.CommitteeMember), nameof(UserRole.DepartmentHead), nameof(UserRole.Admin)));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Veritabanı şeması ve başlangıç verileri (Seed)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    var storage = scope.ServiceProvider.GetRequiredService<IFileStorage>();
    await DbSeeder.SeedAsync(db, hasher);

    if (args.Contains("--reset-internships"))
    {
        await DbSeeder.ResetInternshipsAsync(db, storage);
    }
}

// Merkezi Hata Yakalama (AppException -> JSON { error: ... })
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (AppException ex)
    {
        ctx.Response.StatusCode = ex.StatusCode;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
    catch (Exception ex)
    {
        var logger = ctx.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalException");
        logger.LogError(ex, "Beklenmeyen sunucu hatası");
        ctx.Response.StatusCode = 500;
        ctx.Response.ContentType = "application/json";
        var errMsg = app.Environment.IsDevelopment()
            ? "Sunucu hatası: " + ex.Message
            : "Beklenmeyen bir sunucu hatası oluştu.";
        await ctx.Response.WriteAsJsonAsync(new { error = errMsg });
    }
});

app.UseSwagger();
app.UseSwaggerUI();
app.UseForwardedHeaders();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup("/api");

// =========================================================================
//  1. KİMLİK DOĞRULAMA & KULLANICI YÖNETİMİ
// =========================================================================
var auth = api.MapGroup("/auth").WithTags("Auth");
auth.MapPost("/login", (LoginRequest req, AuthService svc, CancellationToken ct) => svc.LoginAsync(req, ct));
auth.MapPost("/register", (RegisterStudentRequest req, AuthService svc, CancellationToken ct) => svc.RegisterStudentAsync(req, ct));
auth.MapGet("/me", (AuthService svc, CancellationToken ct) => svc.MeAsync(ct)).RequireAuthorization();
auth.MapPost("/change-password", async (ChangePasswordRequest req, AuthService svc, CancellationToken ct) =>
{
    await svc.ChangePasswordAsync(req, ct);
    return Results.Ok(new { message = "Parolanız güncellendi." });
}).RequireAuthorization();
auth.MapPost("/accept-guide", (AuthService svc, CancellationToken ct) => svc.AcceptGuideAsync(ct)).RequireAuthorization();
auth.MapPut("/profile", (UpdateProfileRequest req, AuthService svc, CancellationToken ct) => svc.UpdateProfileAsync(req, ct)).RequireAuthorization();

var users = api.MapGroup("/users").WithTags("Users").RequireAuthorization("Committee");
users.MapGet("/", (UserRole? role, AuthService svc, CancellationToken ct) => svc.ListUsersAsync(role, ct));
users.MapPost("/staff", (CreateStaffRequest req, AuthService svc, CancellationToken ct) => svc.CreateStaffAsync(req, ct))
    .RequireAuthorization("DepartmentHead");
users.MapPut("/{id:guid}/active", (Guid id, [FromQuery] bool active, AuthService svc, CancellationToken ct) => svc.SetActiveAsync(id, active, ct))
    .RequireAuthorization("DepartmentHead");

// =========================================================================
//  2. DÖNEMLER, TATİLLER, İŞ GÜNÜ HESAPLAYICI, FİRMALAR, İLANLAR
// =========================================================================
var terms = api.MapGroup("/terms").WithTags("Terms").RequireAuthorization();
terms.MapGet("/", (bool? onlyOpen, CatalogService svc, CancellationToken ct) => svc.GetTermsAsync(onlyOpen ?? false, ct));
terms.MapPost("/", (TermUpsertRequest req, CatalogService svc, CancellationToken ct) => svc.CreateTermAsync(req, ct)).RequireAuthorization("Committee");
terms.MapPut("/{id:guid}", (Guid id, TermUpsertRequest req, CatalogService svc, CancellationToken ct) => svc.UpdateTermAsync(id, req, ct)).RequireAuthorization("Committee");
terms.MapDelete("/{id:guid}", async (Guid id, CatalogService svc, CancellationToken ct) =>
{
    await svc.DeleteTermAsync(id, ct);
    return Results.NoContent();
}).RequireAuthorization("Committee");

var holidays = api.MapGroup("/holidays").WithTags("Holidays").RequireAuthorization();
holidays.MapGet("/", (int? year, CatalogService svc, CancellationToken ct) => svc.GetHolidaysAsync(year, ct));
holidays.MapPost("/", (HolidayCreateRequest req, CatalogService svc, CancellationToken ct) => svc.AddHolidayAsync(req, ct)).RequireAuthorization("Committee");
holidays.MapDelete("/{id:guid}", async (Guid id, CatalogService svc, CancellationToken ct) =>
{
    await svc.DeleteHolidayAsync(id, ct);
    return Results.NoContent();
}).RequireAuthorization("Committee");

api.MapPost("/workdays/calculate", (CalculateEndDateRequest req, WorkDayCalculator calc, CancellationToken ct) =>
    calc.CalculateAsync(req.StartDate, req.WorkDays, req.WorksOnSaturday, ct)).WithTags("WorkDays").RequireAuthorization();

var announcements = api.MapGroup("/announcements").WithTags("Announcements").RequireAuthorization();
announcements.MapGet("/", (bool? onlyActive, CatalogService svc, CancellationToken ct) => svc.GetAnnouncementsAsync(onlyActive ?? true, ct));
announcements.MapPost("/", (AnnouncementUpsertRequest req, CatalogService svc, CancellationToken ct) => svc.CreateAnnouncementAsync(req, ct)).RequireAuthorization("Committee");
announcements.MapPut("/{id:guid}", (Guid id, AnnouncementUpsertRequest req, CatalogService svc, CancellationToken ct) => svc.UpdateAnnouncementAsync(id, req, ct)).RequireAuthorization("Committee");
announcements.MapDelete("/{id:guid}", async (Guid id, CatalogService svc, CancellationToken ct) =>
{
    await svc.DeleteAnnouncementAsync(id, ct);
    return Results.NoContent();
}).RequireAuthorization("Committee");

var companies = api.MapGroup("/companies").WithTags("Companies").RequireAuthorization();
companies.MapGet("/", (string? q, CatalogService svc, CancellationToken ct) => svc.SearchCompaniesAsync(q, ct));
companies.MapPost("/", (CompanyCreateRequest req, CatalogService svc, CancellationToken ct) => svc.CreateCompanyAsync(req, ct));
companies.MapPut("/{id:guid}", (Guid id, CompanyCreateRequest req, [FromQuery] bool verified, CatalogService svc, CancellationToken ct) =>
    svc.UpdateCompanyAsync(id, req, verified, ct)).RequireAuthorization("Committee");
companies.MapGet("/stats", (CatalogService svc, CancellationToken ct) => svc.GetCompanyStatsAsync(ct)).RequireAuthorization("Committee");

var listings = api.MapGroup("/listings").WithTags("Listings").RequireAuthorization();
listings.MapGet("/", (bool? onlyActive, CatalogService svc, CancellationToken ct) => svc.GetListingsAsync(onlyActive ?? true, ct));
listings.MapPost("/", (ListingUpsertRequest req, CatalogService svc, CancellationToken ct) => svc.CreateListingAsync(req, ct)).RequireAuthorization("Committee");
listings.MapPut("/{id:guid}", (Guid id, ListingUpsertRequest req, CatalogService svc, CancellationToken ct) => svc.UpdateListingAsync(id, req, ct)).RequireAuthorization("Committee");
listings.MapDelete("/{id:guid}", async (Guid id, CatalogService svc, CancellationToken ct) =>
{
    await svc.DeleteListingAsync(id, ct);
    return Results.NoContent();
}).RequireAuthorization("Committee");

// =========================================================================
//  3. STAJ (ÖĞRENCİ İŞLEMLERİ, BELGELER, PDF, SANAL DEFTER, İZİN)
// =========================================================================
var internships = api.MapGroup("/internships").WithTags("Internships").RequireAuthorization();
internships.MapGet("/mine", (InternshipService svc, CancellationToken ct) => svc.GetMineAsync(ct));
internships.MapGet("/{id:guid}", (Guid id, InternshipService svc, CancellationToken ct) => svc.GetDetailAsync(id, ct));
internships.MapPost("/", (InternshipUpsertRequest req, InternshipService svc, CancellationToken ct) => svc.CreateAsync(req, ct));
internships.MapPut("/{id:guid}", (Guid id, InternshipUpsertRequest req, InternshipService svc, CancellationToken ct) => svc.UpdateAsync(id, req, ct));
internships.MapPost("/{id:guid}/submit", (Guid id, InternshipService svc, CancellationToken ct) => svc.SubmitAsync(id, ct));
internships.MapDelete("/{id:guid}", async (Guid id, InternshipService svc, CancellationToken ct) =>
{
    await svc.CancelAsync(id, ct);
    return Results.NoContent();
});

// Belge Yükleme / İndirme / Silme
internships.MapPost("/{id:guid}/documents", async (Guid id, [FromForm] DocumentType type, IFormFile file, InternshipService svc, CancellationToken ct) =>
{
    await using var stream = file.OpenReadStream();
    return await svc.UploadAsync(id, type, stream, file.FileName, file.ContentType, file.Length, ct);
}).DisableAntiforgery();

api.MapGet("/documents/{documentId:guid}", async (Guid documentId, InternshipService svc, CancellationToken ct) =>
{
    var f = await svc.DownloadAsync(documentId, ct);
    return Results.Stream(f.Stream, f.ContentType, f.FileName);
}).WithTags("Documents").RequireAuthorization();

api.MapDelete("/documents/{documentId:guid}", async (Guid documentId, InternshipService svc, CancellationToken ct) =>
{
    await svc.DeleteDocumentAsync(documentId, ct);
    return Results.NoContent();
}).WithTags("Documents").RequireAuthorization();

// Resmi Form 2, Form 3, Form 4, Form 7 ve Staj Defteri PDF Üretimi
internships.MapGet("/{id:guid}/pdf/form2", async (Guid id, InternshipService svc, CancellationToken ct) =>
{
    var f = await svc.GenerateForm2Async(id, ct);
    return Results.File(f.Content, f.ContentType, f.FileName);
});

internships.MapGet("/{id:guid}/pdf/form3", async (Guid id, InternshipService svc, CancellationToken ct) =>
{
    var f = await svc.GenerateForm3Async(id, ct);
    return Results.File(f.Content, f.ContentType, f.FileName);
});

internships.MapGet("/{id:guid}/pdf/form4", async (Guid id, InternshipService svc, CancellationToken ct) =>
{
    var f = await svc.GenerateForm4Async(id, ct);
    return Results.File(f.Content, f.ContentType, f.FileName);
});

internships.MapGet("/{id:guid}/pdf/logbook", async (Guid id, InternshipService svc, CancellationToken ct) =>
{
    var f = await svc.GenerateLogbookPdfAsync(id, ct);
    return Results.File(f.Content, f.ContentType, f.FileName);
});

internships.MapGet("/{id:guid}/pdf/form7", async (Guid id, InternshipService svc, CancellationToken ct) =>
{
    var f = await svc.GenerateForm7Async(id, ct);
    return Results.File(f.Content, f.ContentType, f.FileName);
});

internships.MapPost("/{id:guid}/form7/preview", async (Guid id, Form7Request req, InternshipService svc, CancellationToken ct) =>
{
    var f = await svc.PreviewForm7Async(id, req, ct);
    return Results.File(f.Content, f.ContentType, f.FileName);
});

internships.MapPost("/{id:guid}/form7/submit", (Guid id, Form7Request req, InternshipService svc, CancellationToken ct) =>
    svc.SubmitForm7CancelRequestAsync(id, req, ct));

// Sanal Staj Defteri
internships.MapGet("/{id:guid}/logbook", (Guid id, InternshipService svc, CancellationToken ct) => svc.GetLogbookAsync(id, ct));
internships.MapPost("/{id:guid}/logbook", (Guid id, LogbookUpsertRequest req, InternshipService svc, CancellationToken ct) => svc.UpsertLogbookAsync(id, req, ct));
internships.MapPost("/{id:guid}/logbook/submit-to-advisor", (Guid id, InternshipService svc, CancellationToken ct) => svc.SubmitLogbookToAdvisorAsync(id, ct));
internships.MapPost("/{id:guid}/resend-advisor-email", (Guid id, InternshipService svc, CancellationToken ct) => svc.ResendAdvisorEmailAsync(id, ct))
    .RequireAuthorization("Committee");
internships.MapDelete("/{id:guid}/logbook/{entryId:guid}", async (Guid id, Guid entryId, InternshipService svc, CancellationToken ct) =>
{
    await svc.DeleteLogbookAsync(id, entryId, ct);
    return Results.NoContent();
});

// İzin / Telafi Talebi
internships.MapPost("/{id:guid}/leaves", (Guid id, LeaveCreateRequest req, InternshipService svc, CancellationToken ct) => svc.CreateLeaveAsync(id, req, ct));

// =========================================================================
//  4. KOMİSYON & BÖLÜM BAŞKANI PANELİ
// =========================================================================
var committee = api.MapGroup("/committee").WithTags("Committee").RequireAuthorization("Committee");
committee.MapGet("/internships", (InternshipStatus? status, Guid? termId, string? search, bool? archived, string? archiveYear, CommitteeService svc, CancellationToken ct) =>
    svc.ListAsync(status, termId, search, archived ?? false, archiveYear, ct));
committee.MapPost("/internships/{id:guid}/approve", (Guid id, CommitteeService svc, CancellationToken ct) => svc.ApproveAsync(id, ct));
committee.MapPost("/internships/{id:guid}/revision", (Guid id, NoteRequest req, CommitteeService svc, CancellationToken ct) => svc.RequestRevisionAsync(id, req.Note, ct));
committee.MapPost("/internships/{id:guid}/reject", (Guid id, NoteRequest req, CommitteeService svc, CancellationToken ct) => svc.RejectAsync(id, req.Note, ct));
committee.MapPost("/internships/{id:guid}/cancel", (Guid id, NoteRequest req, CommitteeService svc, CancellationToken ct) => svc.CancelAsync(id, req.Note, ct));
committee.MapPost("/internships/{id:guid}/reject-cancel", (Guid id, NoteRequest req, CommitteeService svc, CancellationToken ct) => svc.RejectCancelRequestAsync(id, req.Note, ct));
committee.MapPost("/internships/{id:guid}/evaluate", (Guid id, EvaluateRequest req, CommitteeService svc, CancellationToken ct) => svc.EvaluateAsync(id, req, ct));

committee.MapGet("/leaves", (LeaveRequestStatus? status, CommitteeService svc, CancellationToken ct) => svc.ListLeavesAsync(status, ct));
committee.MapPost("/leaves/{id:guid}/approve", (Guid id, NoteRequest req, CommitteeService svc, CancellationToken ct) => svc.ApproveLeaveAsync(id, req.Note, ct));
committee.MapPost("/leaves/{id:guid}/reject", (Guid id, NoteRequest req, CommitteeService svc, CancellationToken ct) => svc.RejectLeaveAsync(id, req.Note, ct));

committee.MapPost("/archive/{year}", async (string year, CommitteeService svc, CancellationToken ct) =>
{
    var count = await svc.ArchiveAsync(year, ct);
    return new { archivedCount = count };
});
committee.MapGet("/archive/years", (CommitteeService svc, CancellationToken ct) => svc.GetArchiveYearsAsync(ct));
committee.MapGet("/stats", (CommitteeService svc, CancellationToken ct) => svc.GetStatsAsync(ct));
committee.MapPost("/reset-internships", (CommitteeService svc, CancellationToken ct) => svc.ResetAllInternshipsAsync(ct));
committee.MapPost("/lifecycle/run", async (DateOnly? simulatedToday, LifecycleService svc, CancellationToken ct) =>
{
    var changed = await svc.RunAsync(simulatedToday ?? DateOnly.FromDateTime(DateTime.Today), ct);
    return new { changedCount = changed };
});

// =========================================================================
//  5. ŞİRKET YETKİLİSİ (ADVISOR) PANELİ
// =========================================================================
var advisor = api.MapGroup("/advisor").WithTags("Advisor").RequireAuthorization("Advisor");
advisor.MapGet("/internships", (AdvisorService svc, CancellationToken ct) => svc.ListMyInternsAsync(ct));
advisor.MapPost("/internships/{id:guid}/approve-logbook", (Guid id, HttpContext http, AdvisorService svc, CancellationToken ct) =>
    svc.ApproveLogbookAsync(id, http.Connection.RemoteIpAddress?.ToString(), ct));
advisor.MapPost("/internships/{id:guid}/request-logbook-revision", (Guid id, NoteRequest req, AdvisorService svc, CancellationToken ct) => svc.RequestLogbookRevisionAsync(id, req.Note, ct));

// =========================================================================
//  6. KPTO (SİGORTA BİRİMİ) PANELİ
// =========================================================================
var kpto = api.MapGroup("/kpto").WithTags("KPTO").RequireAuthorization("Kpto");
kpto.MapGet("/internships", (KptoInsuranceStatus? status, KptoService svc, CancellationToken ct) => svc.ListAsync(status, ct));
kpto.MapGet("/export", async (KptoInsuranceStatus? status, KptoService svc, CancellationToken ct) =>
{
    var f = await svc.ExportAsync(status, ct);
    return Results.File(f.Content, f.ContentType, f.FileName);
});
kpto.MapPost("/internships/{id:guid}/start-insurance", (Guid id, KptoService svc, CancellationToken ct) => svc.StartInsuranceAsync(id, ct));
kpto.MapPost("/internships/{id:guid}/not-started", (Guid id, NoteRequest req, KptoService svc, CancellationToken ct) => svc.MarkNotStartedAsync(id, req.Note, ct));
kpto.MapPost("/internships/{id:guid}/pending", (Guid id, KptoService svc, CancellationToken ct) => svc.MoveToPendingAsync(id, ct));
kpto.MapGet("/salary-receipts", (KptoService svc, CancellationToken ct) => svc.ListSalaryReceiptsAsync(ct));

// =========================================================================
//  7. BİLDİRİMLER
// =========================================================================
var notifications = api.MapGroup("/notifications").WithTags("Notifications").RequireAuthorization();
notifications.MapGet("/", (bool? unreadOnly, NotificationService svc, CancellationToken ct) => svc.GetMineAsync(unreadOnly ?? false, ct));
notifications.MapPost("/{id:guid}/read", async (Guid id, NotificationService svc, CancellationToken ct) =>
{
    await svc.MarkReadAsync(id, ct);
    return Results.NoContent();
});
notifications.MapPost("/read-all", async (NotificationService svc, CancellationToken ct) =>
{
    await svc.MarkAllReadAsync(ct);
    return Results.NoContent();
});

// =========================================================================
//  8. HERKESE AÇIK QR KOD / BELGE DOĞRULAMA
// =========================================================================
api.MapGet("/verify/{code:guid}", (Guid code, InternshipService svc, CancellationToken ct) => svc.VerifyAsync(code, ct))
    .WithTags("Verify")
    .AllowAnonymous();

app.Run();

/// <summary>
/// HTTP isteğindeki JWT claim'lerinden aktif kullanıcı bilgisini çözer.
/// </summary>
public class HttpCurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _http;

    /// <summary>
    /// Yeni bir HttpCurrentUser oluşturur.
    /// </summary>
    public HttpCurrentUser(IHttpContextAccessor http) => _http = http;

    /// <inheritdoc />
    public bool IsAuthenticated => _http.HttpContext?.User?.Identity?.IsAuthenticated == true;

    /// <inheritdoc />
    public Guid UserId
    {
        get
        {
            var id = _http.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(id, out var g) ? g : Guid.Empty;
        }
    }

    /// <inheritdoc />
    public UserRole Role
    {
        get
        {
            var r = _http.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<UserRole>(r, out var role) ? role : UserRole.Student;
        }
    }
}
