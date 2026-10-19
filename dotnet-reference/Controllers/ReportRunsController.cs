using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReportingWorkbench.Models;
using System.Security.Claims;

namespace ReportingWorkbench.Controllers;

[ApiController]
[Route("api/v1/report-runs")]
[Authorize]
public class ReportRunsController : ControllerBase
{
    private readonly IReportRunService _reportRunService;
    private readonly ILogger<ReportRunsController> _logger;

    public ReportRunsController(IReportRunService reportRunService, ILogger<ReportRunsController> logger)
    {
        _reportRunService = reportRunService;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/v1/report-runs
    /// Initiates a reproducible report run "as of" a target date.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Analyst,Approver")]
    public async Task<IActionResult> CreateReportRun([FromBody] CreateReportRunDto request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "User";
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "";
        var userDesk = User.FindFirstValue("desk") ?? "*";
        var userRegion = User.FindFirstValue("region") ?? "*";

        var result = await _reportRunService.CreateRunAsync(
            request,
            userId,
            userName,
            userEmail,
            userDesk,
            userRegion
        );

        if (!result.IsSuccess)
        {
            return Problem(
                statusCode: result.StatusCode,
                title: result.ErrorTitle,
                detail: result.ErrorMessage,
                type: result.ErrorType,
                instance: HttpContext.Request.Path
            );
        }

        return CreatedAtAction(nameof(GetReportRunById), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// GET /api/v1/report-runs/{id}
    /// Retrieves a report run and its immutable snapshot metadata.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetReportRunById(string id)
    {
        var run = await _reportRunService.GetByIdAsync(id);
        if (run == null)
        {
            return NotFound(new ProblemDetails
            {
                Status = 404,
                Title = "Report Run Not Found",
                Detail = $"No report run found matching ID '{id}'."
            });
        }
        return Ok(run);
    }

    /// <summary>
    /// POST /api/v1/report-runs/{id}/approve
    /// Maker-Checker 4-eyes approval. Requester cannot approve their own run.
    /// </summary>
    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Approver")]
    public async Task<IActionResult> ApproveReportRun(string id, [FromBody] ApproveRequestDto request)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "Approver";

        var result = await _reportRunService.ApproveRunAsync(
            id,
            currentUserId,
            currentUserName,
            request.Decision,
            request.Comment
        );

        if (!result.IsSuccess)
        {
            return Problem(
                statusCode: result.StatusCode,
                title: result.ErrorTitle,
                detail: result.ErrorMessage,
                type: result.ErrorType,
                instance: HttpContext.Request.Path
            );
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// GET /api/v1/report-runs/{id}/diff?against={comparisonId}
    /// Compares two report runs, calculating variance across notional, sensitivities, and exposure deltas.
    /// </summary>
    [HttpGet("{id}/diff")]
    public async Task<IActionResult> GetRunDiff(string id, [FromQuery] string against)
    {
        var diff = await _reportRunService.CalculateDiffAsync(id, against);
        if (diff == null)
        {
            return NotFound(new ProblemDetails
            {
                Status = 404,
                Title = "Diff Target Not Found",
                Detail = $"One or both runs ('{id}' or '{against}') were not found."
            });
        }
        return Ok(diff);
    }
}

public record CreateReportRunDto(string TemplateId, string TemplateVersion, DateOnly AsOfDate, string? IdempotencyKey);
public record ApproveRequestDto(string Decision, string Comment);
public interface IReportRunService
{
    Task<ServiceResult<ReportRun>> CreateRunAsync(CreateReportRunDto dto, string userId, string userName, string userEmail, string desk, string region);
    Task<ReportRun?> GetByIdAsync(string id);
    Task<ServiceResult<ReportRun>> ApproveRunAsync(string id, string approverId, string approverName, string decision, string comment);
    Task<object?> CalculateDiffAsync(string id, string againstId);
}
public class ServiceResult<T>
{
    public bool IsSuccess { get; init; }
    public T? Value { get; init; }
    public int StatusCode { get; init; } = 200;
    public string ErrorTitle { get; init; } = string.Empty;
    public string ErrorMessage { get; init; } = string.Empty;
    public string ErrorType { get; init; } = string.Empty;
}
