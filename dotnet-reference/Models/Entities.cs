namespace ReportingWorkbench.Models;

public enum Role
{
    Analyst,
    Approver,
    Auditor
}

public enum RunStatus
{
    Queued,
    SnapshotSealing,
    Calculating,
    Completed,
    Failed
}

public enum ApprovalStatus
{
    Pending,
    Approved,
    Rejected
}

public class SyntheticExposure
{
    public string TradeId { get; set; } = string.Empty;
    public string CounterpartyId { get; set; } = string.Empty;
    public string CounterpartyName { get; set; } = string.Empty;
    public string CounterpartyLei { get; set; } = string.Empty;
    public string CounterpartyRating { get; set; } = string.Empty;
    public string AssetClass { get; set; } = string.Empty;
    public string Desk { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public decimal NotionalUsd { get; set; }
    public decimal MarkToMarketUsd { get; set; }
    public decimal EffectiveDurationYears { get; set; }
    public DateOnly MaturityDate { get; set; }
    public DateOnly TradeDate { get; set; }
    public string Currency { get; set; } = "USD";
    public decimal Cs01Usd { get; set; }
    public decimal Pv01Usd { get; set; }
    public decimal CollateralUsd { get; set; }
}

public class InputSnapshot
{
    public string SnapshotId { get; set; } = string.Empty;
    public DateOnly AsOfDate { get; set; }
    public DateTimeOffset SealedAt { get; set; }
    public int RecordCount { get; set; }
    public decimal TotalNotionalUsd { get; set; }
    public string DeskFilter { get; set; } = "*";
    public string RegionFilter { get; set; } = "*";
    public string ContentHashSha256 { get; set; } = string.Empty;
    public string SerializedExposuresJson { get; set; } = string.Empty; // WORM compressed payload
}

public class ReportRun
{
    public string Id { get; set; } = string.Empty;
    public string TemplateId { get; set; } = string.Empty;
    public string TemplateVersion { get; set; } = string.Empty;
    public DateOnly AsOfDate { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    
    public string RequesterUserId { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;
    public string RequesterEmail { get; set; } = string.Empty;
    public string RequesterDesk { get; set; } = string.Empty;
    public string RequesterRegion { get; set; } = string.Empty;

    public RunStatus Status { get; set; } = RunStatus.Queued;
    public ApprovalStatus ApprovalStatus { get; set; } = ApprovalStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }

    public string SnapshotId { get; set; } = string.Empty;
    public InputSnapshot? Snapshot { get; set; }

    public string? OutputJson { get; set; }
    public string? OutputHashSha256 { get; set; }

    // Maker-checker approval details
    public string? ApproverUserId { get; set; }
    public string? ApproverName { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public string? ApprovalComment { get; set; }

    // Optimistic concurrency token
    public uint RowVersion { get; set; }
}

public class AuditBlock
{
    public long SequenceNumber { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public string ActorUserId { get; set; } = string.Empty;
    public string ActorName { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public string PayloadHash { get; set; } = string.Empty;
    public string PreviousHash { get; set; } = string.Empty;
    public string BlockHash { get; set; } = string.Empty;
}
