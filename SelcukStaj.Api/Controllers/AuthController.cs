using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;
using SelcukStaj.Api.Services;

namespace SelcukStaj.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IJwtService _jwtService;

    public AuthController(AppDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public record LoginRequest(string Email, string Password);
    public record LoginResponse(string Token, int UserId, string Email, string FullName, string Role, string Department, object? StudentProfile);

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "E-posta veya şifre hatalı." });
        }

        if (!user.IsActive)
        {
            return Forbid("Kullanıcı hesabı pasif durumda.");
        }

        var token = _jwtService.GenerateToken(user);
        var dept = !string.IsNullOrEmpty(user.Department) ? user.Department : (user.StudentProfile?.Department ?? "Bilgisayar Mühendisliği");

        return Ok(new LoginResponse(
            Token: token,
            UserId: user.Id,
            Email: user.Email,
            FullName: user.FullName,
            Role: user.Role.ToString(),
            Department: dept,
            StudentProfile: user.StudentProfile != null ? new
            {
                user.StudentProfile.StudentNumber,
                user.StudentProfile.NationalId,
                user.StudentProfile.Faculty,
                user.StudentProfile.Department,
                user.StudentProfile.ClassLevel,
                user.StudentProfile.Address,
                user.StudentProfile.HasAcceptedGuide
            } : null
        ));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return NotFound();
        }

        var dept = !string.IsNullOrEmpty(user.Department) ? user.Department : (user.StudentProfile?.Department ?? "Bilgisayar Mühendisliği");

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FullName,
            Role = user.Role.ToString(),
            Department = dept,
            StudentProfile = user.StudentProfile
        });
    }

    [Authorize]
    [HttpPost("accept-guide")]
    public async Task<IActionResult> AcceptGuide()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            return BadRequest(new { message = "Öğrenci profili bulunamadı." });
        }

        profile.HasAcceptedGuide = true;
        profile.GuideAcceptedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Staj kılavuzu başarıyla onaylandı.", hasAcceptedGuide = true });
    }
}
