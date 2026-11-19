using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;

namespace SelcukStaj.Api.Services;

public class WorkDayBreakdownItem
{
    public DateTime Date { get; set; }
    public string DayName { get; set; } = string.Empty;
    public bool IsCounted { get; set; }
    public string Reason { get; set; } = string.Empty; // "İş Günü", "Hafta Sonu (Pazar)", "Resmî Tatil: 15 Temmuz"
    public int? CumulativeDayCount { get; set; }
}

public class WorkDayCalculationResult
{
    public DateTime StartDate { get; set; }
    public DateTime CalculatedEndDate { get; set; }
    public int RequiredWorkDays { get; set; }
    public bool IncludesSaturday { get; set; }
    public int TotalCalendarDays { get; set; }
    public int TotalSkippedSundays { get; set; }
    public int TotalSkippedSaturdays { get; set; }
    public int TotalSkippedHolidays { get; set; }
    public List<WorkDayBreakdownItem> Breakdown { get; set; } = new();
}

public interface IWorkDayCalculator
{
    Task<WorkDayCalculationResult> CalculateEndDateAsync(DateTime startDate, int requiredWorkDays, bool includesSaturday, CancellationToken cancellationToken = default);
    Task<DateTime> CalculateMakeUpDateAsync(DateTime currentEndDate, int additionalDays, bool includesSaturday, CancellationToken cancellationToken = default);
    Task<int> CalculateWorkDaysBetweenAsync(DateTime startDate, DateTime endDate, bool includesSaturday, CancellationToken cancellationToken = default);
}

public class WorkDayCalculator : IWorkDayCalculator
{
    private readonly AppDbContext _context;

    public WorkDayCalculator(AppDbContext context)
    {
        _context = context;
    }

    public async Task<WorkDayCalculationResult> CalculateEndDateAsync(DateTime startDate, int requiredWorkDays, bool includesSaturday, CancellationToken cancellationToken = default)
    {
        // Resmî tatilleri çek
        var holidays = await _context.PublicHolidays
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var holidayDict = holidays.ToDictionary(h => h.Date.Date, h => h.Description);

        var result = new WorkDayCalculationResult
        {
            StartDate = startDate.Date,
            RequiredWorkDays = requiredWorkDays,
            IncludesSaturday = includesSaturday
        };

        var currentDate = startDate.Date;
        var countedWorkDays = 0;

        while (countedWorkDays < requiredWorkDays)
        {
            var isSunday = currentDate.DayOfWeek == DayOfWeek.Sunday;
            var isSaturday = currentDate.DayOfWeek == DayOfWeek.Saturday;
            var isHoliday = holidayDict.TryGetValue(currentDate, out var holidayDescription);

            var item = new WorkDayBreakdownItem
            {
                Date = currentDate,
                DayName = currentDate.ToString("dddd", new System.Globalization.CultureInfo("tr-TR"))
            };

            if (isSunday)
            {
                item.IsCounted = false;
                item.Reason = "Pazar günü (İş günü sayılmaz)";
                result.TotalSkippedSundays++;
            }
            else if (isHoliday)
            {
                item.IsCounted = false;
                item.Reason = $"Resmî Tatil: {holidayDescription}";
                result.TotalSkippedHolidays++;
            }
            else if (isSaturday && !includesSaturday)
            {
                item.IsCounted = false;
                item.Reason = "Cumartesi (İşyeri cumartesi çalışmıyor)";
                result.TotalSkippedSaturdays++;
            }
            else
            {
                countedWorkDays++;
                item.IsCounted = true;
                item.Reason = "İş Günü";
                item.CumulativeDayCount = countedWorkDays;
            }

            result.Breakdown.Add(item);

            if (countedWorkDays == requiredWorkDays)
            {
                result.CalculatedEndDate = currentDate;
                break;
            }

            currentDate = currentDate.AddDays(1);
        }

        result.TotalCalendarDays = (result.CalculatedEndDate - result.StartDate).Days + 1;
        return result;
    }

    public async Task<DateTime> CalculateMakeUpDateAsync(DateTime currentEndDate, int additionalDays, bool includesSaturday, CancellationToken cancellationToken = default)
    {
        var holidays = await _context.PublicHolidays
            .AsNoTracking()
            .Select(h => h.Date.Date)
            .ToHashSetAsync(cancellationToken);

        var currentDate = currentEndDate.Date.AddDays(1);
        var addedDays = 0;

        while (addedDays < additionalDays)
        {
            var isSunday = currentDate.DayOfWeek == DayOfWeek.Sunday;
            var isSaturday = currentDate.DayOfWeek == DayOfWeek.Saturday;
            var isHoliday = holidays.Contains(currentDate);

            if (!isSunday && !isHoliday && (!isSaturday || includesSaturday))
            {
                addedDays++;
                if (addedDays == additionalDays)
                {
                    return currentDate;
                }
            }

            currentDate = currentDate.AddDays(1);
        }

        return currentDate;
    }

    public async Task<int> CalculateWorkDaysBetweenAsync(DateTime startDate, DateTime endDate, bool includesSaturday, CancellationToken cancellationToken = default)
    {
        var holidays = await _context.PublicHolidays
            .AsNoTracking()
            .Select(h => h.Date.Date)
            .ToHashSetAsync(cancellationToken);

        int workDays = 0;
        var current = startDate.Date;
        var targetEnd = endDate.Date;

        if (targetEnd < current)
        {
            (current, targetEnd) = (targetEnd, current);
        }

        while (current <= targetEnd)
        {
            var isSunday = current.DayOfWeek == DayOfWeek.Sunday;
            var isSaturday = current.DayOfWeek == DayOfWeek.Saturday;
            var isHoliday = holidays.Contains(current);

            if (!isSunday && !isHoliday && (!isSaturday || includesSaturday))
            {
                workDays++;
            }
            current = current.AddDays(1);
        }

        return Math.Max(1, workDays);
    }
}
