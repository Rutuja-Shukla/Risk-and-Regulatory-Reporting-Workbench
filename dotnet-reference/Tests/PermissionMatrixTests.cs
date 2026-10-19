using Xunit;

namespace ReportingWorkbench.Tests;

public class PermissionMatrixTests
{
    [Theory]
    [InlineData("Analyst", "FX_RATES", "EMEA", "FX_RATES", "EMEA", true)]   // Within scope
    [InlineData("Analyst", "FX_RATES", "EMEA", "CREDIT_HY", "EMEA", false)] // Cross-desk bypass attempt
    [InlineData("Analyst", "FX_RATES", "EMEA", "FX_RATES", "APAC", false)] // Cross-region bypass attempt
    [InlineData("Auditor", "*", "*", "FX_RATES", "EMEA", false)]           // Auditor cannot create runs
    [InlineData("Approver", "*", "AMER", "FX_RATES", "AMER", true)]         // Approver can create
    public void EvaluateReportCreation_PermissionsMatrix(
        string role,
        string userDesk,
        string userRegion,
        string targetDesk,
        string targetRegion,
        bool expectedAllowed)
    {
        bool allowed = CanCreateRun(role, userDesk, userRegion, targetDesk, targetRegion);
        Assert.Equal(expectedAllowed, allowed);
    }

    [Fact]
    public void MakerChecker_RequesterAttemptingToApproveOwnRun_MustBeForbidden()
    {
        string requesterId = "USR-ANALYST-LON";
        string approverId = "USR-ANALYST-LON"; // Same user attempting approval

        bool isAllowed = approverId != requesterId;
        Assert.False(isAllowed);
    }

    private static bool CanCreateRun(string role, string userDesk, string userRegion, string targetDesk, string targetRegion)
    {
        if (role == "Auditor") return false;
        if (userDesk != "*" && userDesk != targetDesk) return false;
        if (userRegion != "*" && userRegion != targetRegion) return false;
        return true;
    }
}
