using Microsoft.EntityFrameworkCore;
using Staj.Application.Common;
using Staj.Domain.Entities;

namespace Staj.Infrastructure.Persistence;

/// <summary>
/// PostgreSQL veritabanı bağlamı (EF Core).
/// </summary>
public class AppDbContext : DbContext, IAppDbContext
{
    /// <summary>
    /// Yeni bir veritabanı bağlamı oluşturur.
    /// </summary>
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    /// <inheritdoc />
    public DbSet<User> Users => Set<User>();
    /// <inheritdoc />
    public DbSet<Term> Terms => Set<Term>();
    /// <inheritdoc />
    public DbSet<Company> Companies => Set<Company>();
    /// <inheritdoc />
    public DbSet<CompanyListing> CompanyListings => Set<CompanyListing>();
    /// <inheritdoc />
    public DbSet<Internship> Internships => Set<Internship>();
    /// <inheritdoc />
    public DbSet<Document> Documents => Set<Document>();
    /// <inheritdoc />
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();
    /// <inheritdoc />
    public DbSet<LogbookEntry> LogbookEntries => Set<LogbookEntry>();
    /// <inheritdoc />
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    /// <inheritdoc />
    public DbSet<Holiday> Holidays => Set<Holiday>();
    /// <inheritdoc />
    public DbSet<Announcement> Announcements => Set<Announcement>();
    /// <inheritdoc />
    public DbSet<Notification> Notifications => Set<Notification>();
    /// <inheritdoc />
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(200);
            e.Property(u => u.FullName).HasMaxLength(200);
            e.HasOne(u => u.Company).WithMany().HasForeignKey(u => u.CompanyId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Company>(e =>
        {
            e.HasIndex(c => c.Name);
            e.Property(c => c.Name).HasMaxLength(300);
        });

        b.Entity<CompanyListing>(e =>
        {
            e.HasOne(l => l.Company).WithMany(c => c.Listings).HasForeignKey(l => l.CompanyId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Internship>(e =>
        {
            e.HasIndex(i => i.VerificationCode).IsUnique();
            e.HasOne(i => i.Student).WithMany(u => u.Internships).HasForeignKey(i => i.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(i => i.Advisor).WithMany().HasForeignKey(i => i.AdvisorId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(i => i.Term).WithMany(t => t.Internships).HasForeignKey(i => i.TermId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(i => i.Company).WithMany(c => c.Internships).HasForeignKey(i => i.CompanyId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Document>(e =>
        {
            e.HasOne(d => d.Internship).WithMany(i => i.Documents).HasForeignKey(d => d.InternshipId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<DocumentVersion>(e =>
        {
            e.HasOne(v => v.Document).WithMany(d => d.Versions).HasForeignKey(v => v.DocumentId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<LogbookEntry>(e =>
        {
            e.HasIndex(l => new { l.InternshipId, l.Date });
            e.HasOne(l => l.Internship).WithMany(i => i.LogbookEntries).HasForeignKey(l => l.InternshipId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<LeaveRequest>(e =>
        {
            e.HasOne(l => l.Internship).WithMany(i => i.LeaveRequests).HasForeignKey(l => l.InternshipId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Holiday>(e =>
        {
            e.HasIndex(h => h.Date).IsUnique();
        });

        b.Entity<Notification>(e =>
        {
            e.HasIndex(n => new { n.UserId, n.IsRead });
            e.HasIndex(n => new { n.TargetRole, n.IsRead });
        });
    }
}
