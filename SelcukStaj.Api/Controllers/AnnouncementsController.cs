using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;

namespace SelcukStaj.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnnouncementsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AnnouncementsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _context.Announcements
            .Where(a => a.IsPublished)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Summary,
                a.Content,
                a.Category,
                a.CreatedAt,
                a.Author,
                a.RelatedPeriodId
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _context.Announcements.FindAsync(id);
        if (item == null) return NotFound(new { message = "Duyuru bulunamadı." });
        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Content))
        {
            return BadRequest(new { message = "Başlık ve içerik alanları zorunludur." });
        }

        var item = new Announcement
        {
            Title = dto.Title.Trim(),
            Summary = string.IsNullOrWhiteSpace(dto.Summary) 
                ? (dto.Content.Length > 150 ? dto.Content[..150] + "..." : dto.Content) 
                : dto.Summary.Trim(),
            Content = dto.Content.Trim(),
            Category = dto.Category ?? "Genel",
            CreatedAt = DateTime.Now,
            IsPublished = true,
            Author = dto.Author ?? "Staj Komisyonu"
        };

        _context.Announcements.Add(item);
        await _context.SaveChangesAsync();

        return Ok(item);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _context.Announcements.FindAsync(id);
        if (item == null) return NotFound();

        _context.Announcements.Remove(item);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Duyuru silindi." });
    }
}

public class CreateAnnouncementDto
{
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Category { get; set; } = "Takvim";
    public string? Author { get; set; } = "Staj Komisyonu";
}
