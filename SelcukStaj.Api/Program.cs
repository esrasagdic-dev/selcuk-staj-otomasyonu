using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Veritabanı (SQLite - Sıfır kurulum ve anında çalışabilirlik için varsayılan)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=selcuk_staj.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// 2. İş Mantığı Servisleri
builder.Services.AddScoped<IWorkDayCalculator, WorkDayCalculator>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IDeadlineReminderService, DeadlineReminderService>();
builder.Services.AddHostedService<DeadlineReminderBackgroundService>();

// 3. Kimlik Doğrulama (JWT Bearer)
var jwtSecret = builder.Configuration["Jwt:SecretKey"] ?? "Selcuk_Universitesi_Bilgisayar_Muhendisligi_Staj_Gizli_Anahtar_2026_Key_SuperSecure!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SelcukStajApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SelcukStajClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// 4. CORS Politikası (React frontend için)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClient", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddOpenApi();

var app = builder.Build();

// Veritabanını oluştur ve Seed verilerini yükle
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbInitializer.SeedAsync(context);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowClient");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
