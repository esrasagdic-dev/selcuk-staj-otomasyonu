using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Staj.Application.Common;
using Staj.Domain.Entities;

namespace Staj.Infrastructure.Services;

/// <summary>
/// JWT yapılandırma ayarları (appsettings.json → "Jwt" bölümü).
/// </summary>
public class JwtOptions
{
    /// <summary>İmza anahtarı (en az 32 karakter).</summary>
    public string Key { get; set; } = "BuCokGizliVeGucluBirAnahtardirEnAz32KarakterOlmali_2026";
    /// <summary>Üretici (Issuer).</summary>
    public string Issuer { get; set; } = "StajSistemi";
    /// <summary>Hedef kitle (Audience).</summary>
    public string Audience { get; set; } = "StajSistemi";
}

/// <summary>
/// BCrypt tabanlı parola özetleme servisi.
/// </summary>
public class BcryptPasswordHasher : IPasswordHasher
{
    /// <inheritdoc />
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);
    /// <inheritdoc />
    public bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}

/// <summary>
/// Kullanıcı kimliği ve rolünü içeren JWT erişim belirteci üretir.
/// </summary>
public class JwtTokenService : ITokenService
{
    private readonly JwtOptions _options;

    /// <summary>
    /// Yeni bir JWT servisi oluşturur.
    /// </summary>
    public JwtTokenService(IOptions<JwtOptions> options) => _options = options.Value;

    /// <inheritdoc />
    public string CreateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
