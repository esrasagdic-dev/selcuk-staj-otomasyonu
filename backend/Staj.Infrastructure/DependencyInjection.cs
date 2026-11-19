using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Staj.Application.Common;
using Staj.Application.Services;
using Staj.Infrastructure.Persistence;
using Staj.Infrastructure.Services;

namespace Staj.Infrastructure;

/// <summary>
/// Staj başlama/bitiş tarihlerini ve son 1 hafta uyarısını periyodik olarak kontrol eden arka plan servisi.
/// </summary>
public class LifecycleBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LifecycleBackgroundService> _logger;

    /// <summary>
    /// Yeni bir arka plan servisi oluşturur.
    /// </summary>
    public LifecycleBackgroundService(IServiceScopeFactory scopeFactory, ILogger<LifecycleBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var lifecycle = scope.ServiceProvider.GetRequiredService<LifecycleService>();
                var changed = await lifecycle.RunAsync(DateOnly.FromDateTime(DateTime.Today), stoppingToken);
                if (changed > 0)
                    _logger.LogInformation("Lifecycle kontrolü tamamlandı: {Changed} staj kaydı güncellendi.", changed);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lifecycle arka plan görevinde hata oluştu.");
            }

            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }
}

/// <summary>
/// Infrastructure katmanı bağımlılık enjeksiyonu kayıtları.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Veritabanı, dosya saklama, e-posta, PDF, Excel, JWT ve arka plan servislerini kaydeder.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<JwtOptions>(config.GetSection("Jwt"));
        services.Configure<StorageOptions>(config.GetSection("Storage"));
        services.Configure<SmtpOptions>(config.GetSection("Smtp"));

        var conn = config.GetConnectionString("Default")
            ?? "Host=localhost;Port=5432;Database=staj_db;Username=postgres;Password=postgres123";

        var usePostgres = CanReachPostgres(conn);

        services.AddDbContext<AppDbContext>(opt =>
        {
            if (usePostgres)
                opt.UseNpgsql(conn, npgsql => npgsql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
            else
                opt.UseSqlite("Data Source=staj.db", sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
        });

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IFileStorage, DiskFileStorage>();
        services.AddSingleton<IEmailService, SmtpEmailService>();
        services.AddSingleton<IPdfService, QuestPdfService>();
        services.AddSingleton<IExcelService, ClosedXmlExcelService>();
        services.AddHostedService<LifecycleBackgroundService>();

        return services;
    }

    private static bool CanReachPostgres(string conn)
    {
        try
        {
            var builder = new Npgsql.NpgsqlConnectionStringBuilder(conn) { Timeout = 2 };
            using var tcp = new System.Net.Sockets.TcpClient();
            var task = tcp.ConnectAsync(builder.Host ?? "localhost", builder.Port);
            return task.Wait(TimeSpan.FromSeconds(1.5)) && tcp.Connected;
        }
        catch
        {
            return false;
        }
    }
}
