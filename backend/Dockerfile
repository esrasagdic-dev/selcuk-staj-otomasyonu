# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore
COPY ["Staj.Domain/Staj.Domain.csproj", "Staj.Domain/"]
COPY ["Staj.Application/Staj.Application.csproj", "Staj.Application/"]
COPY ["Staj.Infrastructure/Staj.Infrastructure.csproj", "Staj.Infrastructure/"]
COPY ["Staj.Api/Staj.Api.csproj", "Staj.Api/"]

RUN dotnet restore "Staj.Api/Staj.Api.csproj"

# Copy all files and publish
COPY . .
WORKDIR "/src/Staj.Api"
RUN dotnet publish "Staj.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Create uploads folder
RUN mkdir -p /app/uploads

EXPOSE 5000
ENTRYPOINT ["dotnet", "Staj.Api.dll"]
