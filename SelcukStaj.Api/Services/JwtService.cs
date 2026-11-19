using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SelcukStaj.Api.Models;

namespace SelcukStaj.Api.Services;

public interface IJwtService
{
    string GenerateToken(User user);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var secret = _configuration["Jwt:SecretKey"] ?? "Selcuk_Universitesi_Bilgisayar_Muhendisligi_Staj_Gizli_Anahtar_2026_Key!";
        var issuer = _configuration["Jwt:Issuer"] ?? "SelcukStajApi";
        var audience = _configuration["Jwt:Audience"] ?? "SelcukStajClient";
        var expireHours = int.TryParse(_configuration["Jwt:ExpireHours"], out var hours) ? hours : 24;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        if (user.StudentProfile != null)
        {
            claims.Add(new Claim("StudentNumber", user.StudentProfile.StudentNumber));
            claims.Add(new Claim("NationalId", user.StudentProfile.NationalId));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expireHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
