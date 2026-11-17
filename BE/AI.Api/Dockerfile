# Build context = BE/ :  docker build -f AI.Api/Dockerfile BE
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY Shared.Contracts/Shared.Contracts.csproj Shared.Contracts/
COPY AI.Api/AI.Api.csproj AI.Api/
RUN dotnet restore AI.Api/AI.Api.csproj
COPY Shared.Contracts/ Shared.Contracts/
COPY AI.Api/ AI.Api/
RUN dotnet publish AI.Api/AI.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
ENV DOTNET_gcServer=0 DOTNET_EnableDiagnostics=0
RUN mkdir -p /data/uploads /data/keys && chown -R app:app /data
COPY --from=build /app .
USER app
ENTRYPOINT ["dotnet", "AI.Api.dll"]
