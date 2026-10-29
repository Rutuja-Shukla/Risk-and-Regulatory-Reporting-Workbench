using ReportingWorkbench.Controllers;
using ReportingWorkbench.Models;

namespace ReportingWorkbench.Services;

public class InMemoryReportRunService : IReportRunService
{
    private readonly List<ReportRun> _runs = new();

    public Task<ServiceResult<ReportRun>> CreateRunAsync(
        CreateReportRunDto dto,
        string userId,
        string userName,
        string userEmail,
        string desk,
        string region)
    {
        // Enforce ABAC desk scope check
        if (desk != "*" && desk != "FX_RATES" && desk != "CREDIT_HY" && desk != "COMMODITIES" && desk != "EQUITIES_DERIV")
        {
            return Task.FromResult(new ServiceResult<ReportRun>
            {
                IsSuccess = false,
                StatusCode = 403,
                ErrorTitle = "ABAC Desk Scope Violation",
                ErrorMessage = $"User desk '{desk}' is not authorized to create runs for this scope.",
                ErrorType = "https://reporting-workbench.internal/errors/abac-desk-violation"
            });
        }

        var run = new ReportRun
        {
            Id = $"RUN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}",
            TemplateId = dto.TemplateId,
            TemplateVersion = dto.TemplateVersion,
            AsOfDate = dto.AsOfDate,
            IdempotencyKey = dto.IdempotencyKey ?? Guid.NewGuid().ToString(),
            RequesterUserId = userId,
            RequesterName = userName,
            RequesterEmail = userEmail,
            RequesterDesk = desk,
            RequesterRegion = region,
            Status = RunStatus.Completed,
            ApprovalStatus = ApprovalStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow,
            CompletedAt = DateTimeOffset.UtcNow.AddSeconds(2),
            SnapshotId = $"SNAP-{dto.AsOfDate:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            OutputHashSha256 = "8f434346648f6b96df89dda901c5176b10f60766576b498218f0e91f34301acb"
        };

        _runs.Add(run);
        return Task.FromResult(new ServiceResult<ReportRun> { IsSuccess = true, Value = run });
    }

    public Task<ReportRun?> GetByIdAsync(string id)
    {
        var run = _runs.FirstOrDefault(r => r.Id == id);
        return Task.FromResult(run);
    }

    public Task<ServiceResult<ReportRun>> ApproveRunAsync(
        string id,
        string approverId,
        string approverName,
        string decision,
        string comment)
    {
        var run = _runs.FirstOrDefault(r => r.Id == id);
        if (run == null)
        {
            return Task.FromResult(new ServiceResult<ReportRun>
            {
                IsSuccess = false,
                StatusCode = 404,
                ErrorTitle = "Report Run Not Found",
                ErrorMessage = $"No report run found with ID '{id}'."
            });
        }

        // Maker-Checker Separation of Duties invariant
        if (run.RequesterUserId == approverId)
        {
            return Task.FromResult(new ServiceResult<ReportRun>
            {
                IsSuccess = false,
                StatusCode = 403,
                ErrorTitle = "Maker-Checker Constraint Violation",
                ErrorMessage = $"User '{approverName}' originally created report run '{id}' and is barred from approving their own submission.",
                ErrorType = "https://reporting-workbench.internal/errors/maker-checker-violation"
            });
        }

        run.ApprovalStatus = decision == "APPROVED" ? ApprovalStatus.Approved : ApprovalStatus.Rejected;
        run.ApproverUserId = approverId;
        run.ApproverName = approverName;
        run.ApprovedAt = DateTimeOffset.UtcNow;
        run.ApprovalComment = comment;

        return Task.FromResult(new ServiceResult<ReportRun> { IsSuccess = true, Value = run });
    }

    public Task<object?> CalculateDiffAsync(string id, string againstId)
    {
        return Task.FromResult<object?>(new
        {
            baseRunId = id,
            comparisonRunId = againstId,
            identicalOutputs = false,
            grossNotionalDeltaUsd = 120000000m,
            variancePercentage = 6.59m
        });
    }
}

public class InMemoryAuditChainService : IAuditChainService
{
    public Task<AuditVerificationDto> VerifyChainIntegrityAsync()
    {
        return Task.FromResult(new AuditVerificationDto(
            IsValid: true,
            VerifiedBlocks: 24,
            TotalBlocks: 24,
            VerifiedAt: DateTimeOffset.UtcNow,
            FirstBrokenBlockSequence: null,
            ExpectedHash: null,
            ActualHash: null,
            FailureReason: null
        ));
    }
}
