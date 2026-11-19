# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["SelcukStaj.Api.csproj", "./"]
RUN dotnet restore "SelcukStaj.Api.csproj"

COPY . .
RUN dotnet publish "SelcukStaj.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Veri ve dosya yükleme klasörleri
RUN mkdir -p /app/data /app/uploads

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ConnectionStrings__DefaultConnection="Data Source=/app/data/selcuk_staj.db"
ENV FileStorage__BasePath=/app/uploads

EXPOSE 5000
ENTRYPOINT ["dotnet", "SelcukStaj.Api.dll"]
