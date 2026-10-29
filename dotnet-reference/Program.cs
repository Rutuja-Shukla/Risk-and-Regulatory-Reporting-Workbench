using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using ReportingWorkbench.Worker;

var builder = WebApplication.CreateBuilder(args);

// Add controllers & JSON options
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Keycloak OIDC JWT Bearer Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Keycloak:Authority"] ?? "http://localhost:8080/realms/reporting-workbench";
        options.Audience = builder.Configuration["Keycloak:Audience"] ?? "reporting-api";
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AnalystOnly", policy => policy.RequireRole("Analyst"));
    options.AddPolicy("ApproverOnly", policy => policy.RequireRole("Approver"));
    options.AddPolicy("AuditorOnly", policy => policy.RequireRole("Auditor"));
});

// Register Application Services
builder.Services.AddSingleton<ReportingWorkbench.Controllers.IReportRunService, ReportingWorkbench.Services.InMemoryReportRunService>();
builder.Services.AddSingleton<ReportingWorkbench.Controllers.IAuditChainService, ReportingWorkbench.Services.InMemoryAuditChainService>();

// Register Hosted Background Worker for asynchronous report execution
builder.Services.AddHostedService<ReportExecutionWorker>();

// Configure OpenTelemetry Tracing & Metrics
var serviceName = "RiskReportingWorkbench";
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService(serviceName))
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation();
    })
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation();
    });

var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Local")
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
