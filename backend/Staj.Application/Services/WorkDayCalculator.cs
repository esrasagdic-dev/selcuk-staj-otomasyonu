using Microsoft.EntityFrameworkCore;
using Staj.Application.Common;
using Staj.Application.DTOs;

namespace Staj.Application.Services;

/// <summary>
/// İş günü hesaplamalarının saf (veritabanından bağımsız) matematiği. Birim testlerde doğrudan kullanılabilir.
/// Pazar günleri, cumartesi çalışmıyorsa cumartesi günleri ve verilen tatil günleri iş günü sayılmaz.
/// </summary>
public static class WorkDayMath
{
    /// <summary>
    /// Verilen tarihin iş günü olup olmadığını döner.
    /// <paramref name="worksOnSaturday"/> true ise Cumartesi iş günü sayılır, Pazar sayılmaz.
    /// </summary>
    public static bool IsWorkDay(DateOnly date, ISet<DateOnly> holidays, bool worksOnSaturday = false) =>
        date.DayOfWeek != DayOfWeek.Sunday &&
        (worksOnSaturday || date.DayOfWeek != DayOfWeek.Saturday) &&
        !holidays.Contains(date);

    /// <summary>
    /// Başlangıç gününü 1. iş günü sayarak, <paramref name="workDays"/>. iş gününün tarihini (staj bitiş tarihi) hesaplar.
    /// </summary>
    public static DateOnly CalculateEndDate(DateOnly start, int workDays, ISet<DateOnly> holidays, bool worksOnSaturday = false)
    {
        if (workDays < 1) throw new ArgumentOutOfRangeException(nameof(workDays));
        var date = start;
        var counted = IsWorkDay(date, holidays, worksOnSaturday) ? 1 : 0;
        while (counted < workDays)
        {
            date = date.AddDays(1);
            if (IsWorkDay(date, holidays, worksOnSaturday)) counted++;
        }
        return date;
    }

    /// <summary>
    /// Verilen tarihten SONRA gelen <paramref name="days"/> adet iş gününü ekler (izin/telafi günlerinin sona eklenmesi).
    /// </summary>
    public static DateOnly AddWorkDaysAfter(DateOnly date, int days, ISet<DateOnly> holidays, bool worksOnSaturday = false)
    {
        var counted = 0;
        while (counted < days)
        {
            date = date.AddDays(1);
            if (IsWorkDay(date, holidays, worksOnSaturday)) counted++;
        }
        return date;
    }

    /// <summary>
    /// İki tarih arasındaki (ikisi de dahil) iş günü sayısını döner.
    /// </summary>
    public static int CountWorkDays(DateOnly from, DateOnly to, ISet<DateOnly> holidays, bool worksOnSaturday = false)
    {
        var count = 0;
        for (var d = from; d <= to; d = d.AddDays(1))
            if (IsWorkDay(d, holidays, worksOnSaturday)) count++;
        return count;
    }
}

/// <summary>
/// Veritabanındaki resmi tatilleri kullanarak staj bitiş tarihini, izin uzatmalarını ve "Stajın X. günü" sayacını hesaplar.
/// </summary>
public class WorkDayCalculator
{
    private readonly IAppDbContext _db;

    /// <summary>
    /// Sunum / test tarih simülatörü çalıştırıldığında aktif tarihi tutar; null ise gerçek bugünün tarihini döner.
    /// </summary>
    public static DateOnly? SimulatedToday { get; set; }

    /// <summary>
    /// Sistemin baz aldığı güncel tarih (simüle edilen tarih varsa o, yoksa DateTime.Today).
    /// </summary>
    public static DateOnly EffectiveToday => SimulatedToday ?? DateOnly.FromDateTime(DateTime.Today);

    /// <summary>
    /// Yeni bir hesaplayıcı oluşturur.
    /// </summary>
    public WorkDayCalculator(IAppDbContext db) => _db = db;

    /// <summary>
    /// Belirtilen aralıktaki resmi tatilleri küme olarak yükler.
    /// </summary>
    public async Task<HashSet<DateOnly>> LoadHolidaysAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var list = await _db.Holidays.Where(h => h.Date >= from && h.Date <= to).Select(h => h.Date).ToListAsync(ct);
        return list.ToHashSet();
    }

    /// <summary>
    /// Haftanın gününü işletim sistemi dil ayarından bağımsız olarak Türkçe döndürür.
    /// </summary>
    private static string TurkishDayName(DayOfWeek d) => d switch
    {
        DayOfWeek.Monday => "Pazartesi",
        DayOfWeek.Tuesday => "Salı",
        DayOfWeek.Wednesday => "Çarşamba",
        DayOfWeek.Thursday => "Perşembe",
        DayOfWeek.Friday => "Cuma",
        DayOfWeek.Saturday => "Cumartesi",
        _ => "Pazar"
    };

    /// <summary>
    /// Başlangıç tarihi, iş günü sayısı ve cumartesi çalışma durumuna göre bitiş tarihini hesaplar; atlanan tatilleri ve gün-gün dökümü de döner.
    /// </summary>
    public async Task<EndDateResponse> CalculateAsync(DateOnly start, int workDays, bool worksOnSaturday = false, CancellationToken ct = default)
    {
        var horizon = start.AddDays(workDays * 2 + 30);
        var rawHolidays = await _db.Holidays
            .Where(h => h.Date >= start && h.Date <= horizon)
            .OrderBy(h => h.Date)
            .ToListAsync(ct);
        var holidayMap = rawHolidays
            .GroupBy(h => h.Date)
            .ToDictionary(g => g.Key, g => g.First().Name);
        var holidays = holidayMap.Keys.ToHashSet();

        if (!WorkDayMath.IsWorkDay(start, holidays, worksOnSaturday))
        {
            throw AppException.BadRequest(worksOnSaturday
                ? "Staj başlangıç tarihi Pazar günü veya resmi tatil olamaz."
                : "Staj başlangıç tarihi hafta sonu (Cumartesi/Pazar) veya resmi tatil olamaz.");
        }

        var end = WorkDayMath.CalculateEndDate(start, workDays, holidays, worksOnSaturday);
        var skipped = rawHolidays
            .Where(h => h.Date >= start && h.Date <= end &&
                        h.Date.DayOfWeek != DayOfWeek.Sunday &&
                        (worksOnSaturday || h.Date.DayOfWeek != DayOfWeek.Saturday))
            .Select(h => new HolidayDto(h.Id, h.Date, h.Name))
            .ToList();

        var breakdown = new List<WorkDayBreakdownItemDto>();
        int workDayNo = 0, skippedSaturdays = 0, skippedSundays = 0;
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            var dayName = TurkishDayName(d.DayOfWeek);
            if (d.DayOfWeek == DayOfWeek.Sunday)
            {
                skippedSundays++;
                breakdown.Add(new WorkDayBreakdownItemDto(d, dayName, false, null, "Hafta Sonu (Pazar)"));
            }
            else if (holidayMap.TryGetValue(d, out var hName))
            {
                breakdown.Add(new WorkDayBreakdownItemDto(d, dayName, false, null, $"Resmî Tatil: {hName}"));
            }
            else if (d.DayOfWeek == DayOfWeek.Saturday && !worksOnSaturday)
            {
                skippedSaturdays++;
                breakdown.Add(new WorkDayBreakdownItemDto(d, dayName, false, null, "Cumartesi (İşyeri Çalışmıyor)"));
            }
            else
            {
                workDayNo++;
                var reason = d.DayOfWeek == DayOfWeek.Saturday ? "İş Günü (Cumartesi Dahil)" : "İş Günü";
                breakdown.Add(new WorkDayBreakdownItemDto(d, dayName, true, workDayNo, reason));
            }
        }

        return new EndDateResponse(start, end, workDays, end.DayNumber - start.DayNumber + 1, skipped, breakdown, skippedSaturdays, skippedSundays);
    }

    /// <summary>
    /// Mevcut bitiş tarihine izin günlerini ekleyerek yeni bitiş tarihini hesaplar.
    /// </summary>
    public async Task<DateOnly> ExtendAsync(DateOnly currentEnd, int days, bool worksOnSaturday = false, CancellationToken ct = default)
    {
        var holidays = await LoadHolidaysAsync(currentEnd, currentEnd.AddDays(days * 2 + 30), ct);
        return WorkDayMath.AddWorkDaysAfter(currentEnd, days, holidays, worksOnSaturday);
    }

    /// <summary>
    /// Staj başlangıcından bugüne kadar geçen iş günü sayısı ("Stajın X. günündesiniz").
    /// Başlangıç tarihi geldiği anda (today == start) 1. Gün olarak başlar.
    /// </summary>
    public async Task<int> CurrentDayAsync(DateOnly start, DateOnly end, DateOnly today, bool worksOnSaturday = false, CancellationToken ct = default)
    {
        if (today < start) return 0;
        var until = today > end ? end : today;
        var holidays = await LoadHolidaysAsync(start, until, ct);
        var counted = WorkDayMath.CountWorkDays(start, until, holidays, worksOnSaturday);
        return counted < 1 ? 1 : counted;
    }

    /// <summary>
    /// Verilen tarihin stajın kaçıncı iş günü olduğunu hesaplar (sanal defter sayfa numarası).
    /// </summary>
    public async Task<int> DayNumberOfAsync(DateOnly start, DateOnly date, bool worksOnSaturday = false, CancellationToken ct = default)
    {
        var holidays = await LoadHolidaysAsync(start, date, ct);
        if (!WorkDayMath.IsWorkDay(date, holidays, worksOnSaturday))
            throw AppException.BadRequest("Defter sayfası yalnızca iş günleri için yazılabilir.");
        return WorkDayMath.CountWorkDays(start, date, holidays, worksOnSaturday);
    }
}
