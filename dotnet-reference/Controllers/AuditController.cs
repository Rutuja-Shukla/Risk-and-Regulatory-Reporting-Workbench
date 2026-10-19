using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ReportingWorkbench.Controllers;

[ApiController]
[Route("api/v1/audit")]
[Authorize]
public class AuditController : ControllerBase
{
    private readonly IAuditChainService _auditChainService;

    public AuditController(IAuditChainService auditChainService)
    {
        _auditChainService = auditChainService;
    }

    /// <summary>
    /// GET /api/v1/audit/verify
    /// Traverses the append-only cryptographic hash chain, recomputing SHA-256 blocks
    /// and validating the previous_hash link from Genesis to Tip.
    /// </summary>
    [HttpGet("verify")]
    public async Task<IActionResult> VerifyAuditChainIntegrity()
    {
        var result = await _auditChainService.VerifyChainIntegrityAsync();
        return Ok(result);
    }
}

public interface IAuditChainService
{
    Task<AuditVerificationDto> VerifyChainIntegrityAsync();
}

public record AuditVerificationDto(
    bool IsValid,
    int VerifiedBlocks,
    int TotalBlocks,
    DateTimeOffset VerifiedAt,
    long? FirstBrokenBlockSequence,
    string? ExpectedHash,
    string? ActualHash,
    string? FailureReason
);
