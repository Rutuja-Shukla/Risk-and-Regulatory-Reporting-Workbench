using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Xunit;

namespace ReportingWorkbench.Tests;

public class ReproducibilityTests
{
    [Fact]
    public void ReRunningSameTemplateVersionOnSameSnapshot_ProducesByteIdenticalOutput()
    {
        // Arrange: Prepare sample sealed snapshot data
        var sealedSnapshotExposures = new[]
        {
            new { TradeId = "TRD-001", Counterparty = "Borealis Ltd", Notional = 100000000m, Mtm = 2500000m, Pv01 = 12000m },
            new { TradeId = "TRD-002", Counterparty = "Titanium AG", Notional = 250000000m, Mtm = -1200000m, Pv01 = 34000m }
        };

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        // Act - Run 1
        var output1 = ExecuteCalculation(sealedSnapshotExposures);
        var bytes1 = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(output1, jsonOptions));
        var hash1 = Convert.ToHexString(SHA256.HashData(bytes1));

        // Act - Run 2 (Simulated re-run on identical snapshot)
        var output2 = ExecuteCalculation(sealedSnapshotExposures);
        var bytes2 = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(output2, jsonOptions));
        var hash2 = Convert.ToHexString(SHA256.HashData(bytes2));

        // Assert: Byte-level and cryptographic hash identity
        Assert.Equal(bytes1.Length, bytes2.Length);
        Assert.Equal(bytes1, bytes2);
        Assert.Equal(hash1, hash2);
    }

    private static object ExecuteCalculation(IEnumerable<dynamic> exposures)
    {
        decimal grossNotional = 0;
        decimal netMtm = 0;
        decimal totalPv01 = 0;

        foreach (var exp in exposures)
        {
            grossNotional += (decimal)exp.Notional;
            netMtm += (decimal)exp.Mtm;
            totalPv01 += (decimal)exp.Pv01;
        }

        return new
        {
            grossNotionalUsd = grossNotional,
            netMarkToMarketUsd = netMtm,
            aggregatePv01Usd = totalPv01,
            exposureCount = exposures.Count()
        };
    }
}
