using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Models;

namespace SelcukStaj.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<AcademicYear> AcademicYears => Set<AcademicYear>();
    public DbSet<InternshipPeriod> InternshipPeriods => Set<InternshipPeriod>();
    public DbSet<Workplace> Workplaces => Set<Workplace>();
    public DbSet<WorkplaceAdvisor> WorkplaceAdvisors => Set<WorkplaceAdvisor>();
    public DbSet<InternshipApplication> InternshipApplications => Set<InternshipApplication>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();
    public DbSet<InternshipDiary> InternshipDiaries => Set<InternshipDiary>();
    public DbSet<DiaryEntry> DiaryEntries => Set<DiaryEntry>();
    public DbSet<AttendanceAbsence> AttendanceAbsences => Set<AttendanceAbsence>();
    public DbSet<PhysicalDelivery> PhysicalDeliveries => Set<PhysicalDelivery>();
    public DbSet<InsuranceRecord> InsuranceRecords => Set<InsuranceRecord>();
    public DbSet<SalaryReceipt> SalaryReceipts => Set<SalaryReceipt>();
    public DbSet<PublicHoliday> PublicHolidays => Set<PublicHoliday>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
    public DbSet<EmailLog> EmailLogs => Set<EmailLog>();
    public DbSet<CompanyJobPosting> CompanyJobPostings => Set<CompanyJobPosting>();
    public DbSet<InternshipExtensionRequest> InternshipExtensionRequests => Set<InternshipExtensionRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User - StudentProfile (1 - 1)
        modelBuilder.Entity<User>()
            .HasOne(u => u.StudentProfile)
            .WithOne(p => p.User)
            .HasForeignKey<StudentProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // InternshipApplication - Advisor (1 - 1)
        modelBuilder.Entity<InternshipApplication>()
            .HasOne(a => a.Advisor)
            .WithOne(ad => ad.InternshipApplication)
            .HasForeignKey<WorkplaceAdvisor>(ad => ad.InternshipApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        // InternshipApplication - Diary (1 - 1)
        modelBuilder.Entity<InternshipApplication>()
            .HasOne(a => a.Diary)
            .WithOne(d => d.InternshipApplication)
            .HasForeignKey<InternshipDiary>(d => d.InternshipApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        // InternshipApplication - PhysicalDelivery (1 - 1)
        modelBuilder.Entity<InternshipApplication>()
            .HasOne(a => a.PhysicalDelivery)
            .WithOne(pd => pd.InternshipApplication)
            .HasForeignKey<PhysicalDelivery>(pd => pd.InternshipApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        // InternshipApplication - InsuranceRecord (1 - 1)
        modelBuilder.Entity<InternshipApplication>()
            .HasOne(a => a.InsuranceRecord)
            .WithOne(ir => ir.InternshipApplication)
            .HasForeignKey<InsuranceRecord>(ir => ir.InternshipApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique indexes
        modelBuilder.Entity<WorkplaceAdvisor>()
            .HasIndex(wa => wa.AccessToken)
            .IsUnique();
    }
}
