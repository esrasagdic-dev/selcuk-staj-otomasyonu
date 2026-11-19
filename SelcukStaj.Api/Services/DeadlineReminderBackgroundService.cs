using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace SelcukStaj.Api.Services;

public class DeadlineReminderBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DeadlineReminderBackgroundService> _logger;

    public DeadlineReminderBackgroundService(
        IServiceProvider serviceProvider, 
        ILogger<DeadlineReminderBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DeadlineReminderBackgroundService başlatıldı. Staj takvimi ve evrak teslim tarihleri periyodik olarak taranacak.");

        // Uygulamanın ve veri tabanı tohumlarının tam yüklenmesi için başlangıçta 45 saniye bekle
        await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var reminderService = scope.ServiceProvider.GetRequiredService<IDeadlineReminderService>();
                
                var result = await reminderService.ProcessUpcomingDeadlinesAsync(thresholdDays: 7);
                if (result.TotalRemindersSent > 0)
                {
                    _logger.LogInformation(
                        "DeadlineReminderBackgroundService: Süre sonu yaklaşan öğrencilere {Total} adet hatırlatıcı gönderildi (Başvuru: {AppCount}, Evrak: {DocCount}).",
                        result.TotalRemindersSent, result.ApplicationDeadlinesSent, result.DocumentDeadlinesSent);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DeadlineReminderBackgroundService çalışırken bir hata oluştu.");
            }

            // Her 12 saatte bir tara
            await Task.Delay(TimeSpan.FromHours(12), stoppingToken);
        }
    }
}
