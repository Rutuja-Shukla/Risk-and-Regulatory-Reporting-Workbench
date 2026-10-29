FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["dotnet-reference/ReportingWorkbench.csproj", "dotnet-reference/"]
RUN dotnet restore "dotnet-reference/ReportingWorkbench.csproj"
COPY dotnet-reference/ dotnet-reference/
WORKDIR "/src/dotnet-reference"
RUN dotnet build "ReportingWorkbench.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ReportingWorkbench.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ReportingWorkbench.dll"]
