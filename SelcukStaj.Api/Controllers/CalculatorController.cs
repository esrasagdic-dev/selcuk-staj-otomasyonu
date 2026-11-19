using Microsoft.AspNetCore.Mvc;
using SelcukStaj.Api.Services;

namespace SelcukStaj.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CalculatorController : ControllerBase
{
    private readonly IWorkDayCalculator _calculator;

    public CalculatorController(IWorkDayCalculator calculator)
    {
        _calculator = calculator;
    }

    public record CalculateRequest(DateTime StartDate, int RequiredWorkDays, bool IncludesSaturday);
    public record CalculateAbsenceRequest(DateTime StartDate, DateTime EndDate, bool IncludesSaturday, DateTime CurrentEndDate);

    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate([FromBody] CalculateRequest request)
    {
        if (request.RequiredWorkDays != 20 && request.RequiredWorkDays != 30)
        {
            return BadRequest(new { message = "Staj süresi yalnızca 20 veya 30 iş günü seçilebilir." });
        }

        var result = await _calculator.CalculateEndDateAsync(request.StartDate, request.RequiredWorkDays, request.IncludesSaturday);
        return Ok(result);
    }

    [HttpPost("calculate-absence")]
    public async Task<IActionResult> CalculateAbsence([FromBody] CalculateAbsenceRequest request)
    {
        if (request.EndDate < request.StartDate)
        {
            return BadRequest(new { message = "Bitiş tarihi başlangıç tarihinden önce olamaz." });
        }

        var missedWorkDays = await _calculator.CalculateWorkDaysBetweenAsync(request.StartDate, request.EndDate, request.IncludesSaturday);
        var newEndDate = await _calculator.CalculateMakeUpDateAsync(request.CurrentEndDate, missedWorkDays, request.IncludesSaturday);

        return Ok(new
        {
            missedWorkDays,
            originalEndDate = request.CurrentEndDate,
            newCalculatedEndDate = newEndDate,
            startDate = request.StartDate,
            endDate = request.EndDate
        });
    }
}
