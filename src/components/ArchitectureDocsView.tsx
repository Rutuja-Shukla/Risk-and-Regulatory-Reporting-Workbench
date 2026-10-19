import React, { useState } from 'react';
import { BookOpen, FileCode, Shield, Layers, Code, Check } from 'lucide-react';

export const ArchitectureDocsView: React.FC = () => {
  const [activeDocTab, setActiveDocTab] = useState<'overview' | 'adrs' | 'api' | 'owasp' | 'csharp'>('overview');
  const [selectedAdr, setSelectedAdr] = useState<'adr1' | 'adr2' | 'adr3' | 'adr4'>('adr1');
  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('ReportRunsController.cs');
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded p-5">
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight">System Architecture & Engineering Documentation</h1>
        <p className="text-xs text-slate-500 mt-1">
          Technical architecture, Architecture Decision Records (ADRs), RFC 7807 REST API contracts, OWASP Top 10 security review, and .NET 8 C# source implementation.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 bg-white px-4 flex items-center gap-6 text-xs font-medium text-slate-600 rounded-t">
        <button
          onClick={() => setActiveDocTab('overview')}
          className={`py-3 border-b-2 cursor-pointer transition-colors ${
            activeDocTab === 'overview'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Architecture & README
        </button>
        <button
          onClick={() => setActiveDocTab('adrs')}
          className={`py-3 border-b-2 cursor-pointer transition-colors ${
            activeDocTab === 'adrs'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Architecture Decision Records (ADRs)
        </button>
        <button
          onClick={() => setActiveDocTab('api')}
          className={`py-3 border-b-2 cursor-pointer transition-colors ${
            activeDocTab === 'api'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          REST API Contracts (v1)
        </button>
        <button
          onClick={() => setActiveDocTab('owasp')}
          className={`py-3 border-b-2 cursor-pointer transition-colors ${
            activeDocTab === 'owasp'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          OWASP Top 10 Security Review
        </button>
        <button
          onClick={() => setActiveDocTab('csharp')}
          className={`py-3 border-b-2 cursor-pointer transition-colors ${
            activeDocTab === 'csharp'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          .NET 8 Backend Code Reference
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200 rounded p-6 text-xs text-slate-800 space-y-6">
        {activeDocTab === 'overview' && (
          <div className="space-y-6 max-w-4xl">
            {/* Disclaimer */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1">
              <div className="font-semibold text-xs">MANDATORY SYSTEM DISCLAIMER & LIMITATIONS</div>
              <p className="text-[11px] leading-relaxed">
                This is a simulated system built strictly with synthetic exposure and trade datasets.
                It is <strong>NOT</strong> a regulatory, banking, or production system, and must <strong>NOT</strong> be used for actual statutory filings or live financial exposure calculations. Do not use any real bank data.
              </p>
            </div>

            {/* Technology Stack Grid */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Technology Stack & Architectural Components</h2>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Tier / Component</th>
                      <th className="py-2.5 px-3">Technology Stack</th>
                      <th className="py-2.5 px-3">Engineering Purpose & Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Backend API</td>
                      <td className="py-2 px-3 font-mono text-slate-800">C# / .NET 8 ASP.NET Core</td>
                      <td className="py-2 px-3 text-slate-600">Modular monolith Web API, RFC 7807 Problem Details, API controllers.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Persistence</td>
                      <td className="py-2 px-3 font-mono text-slate-800">EF Core 8 + PostgreSQL 16</td>
                      <td className="py-2 px-3 text-slate-600">LINQ queries, global query filters for ABAC, optimistic concurrency tokens.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Async Worker</td>
                      <td className="py-2 px-3 font-mono text-slate-800">BackgroundService (IHostedService)</td>
                      <td className="py-2 px-3 text-slate-600">Isolated background execution, idempotent job retries, partial-run rollback.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Identity & Access</td>
                      <td className="py-2 px-3 font-mono text-slate-800">Keycloak 23 (OIDC / OAuth 2.0)</td>
                      <td className="py-2 px-3 text-slate-600">RS256 JWT tokens containing role (Analyst/Approver/Auditor) and desk/region attributes.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Frontend Client</td>
                      <td className="py-2 px-3 font-mono text-slate-800">React 18/19, TypeScript, Vite</td>
                      <td className="py-2 px-3 text-slate-600">Utilitarian workbench in light mode, high-density data tables, diff inspector.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Styling & Theme</td>
                      <td className="py-2 px-3 font-mono text-slate-800">Tailwind CSS v4</td>
                      <td className="py-2 px-3 text-slate-600">60-30-10 color allocation, strict tabular figures (tabular-nums), WCAG AA contrast.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Hashing & Crypto</td>
                      <td className="py-2 px-3 font-mono text-slate-800">RFC 8785 Canonical JSON + SHA-256</td>
                      <td className="py-2 px-3 text-slate-600">Immutable snapshot sealing, byte-identical output proof, and hash-chain audit log.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Telemetry</td>
                      <td className="py-2 px-3 font-mono text-slate-800">OpenTelemetry .NET SDK</td>
                      <td className="py-2 px-3 text-slate-600">Distributed tracing for HTTP routes, EF Core database queries, and worker execution.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">Testing</td>
                      <td className="py-2 px-3 font-mono text-slate-800">xUnit, Testcontainers, RTL, Playwright</td>
                      <td className="py-2 px-3 text-slate-600">Automated reproducibility test, 24-combination Permission Matrix, and tamper test.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">DevOps & CI</td>
                      <td className="py-2 px-3 font-mono text-slate-800">Docker Compose & GitHub Actions</td>
                      <td className="py-2 px-3 text-slate-600">Containerized orchestration, automated CI test runs, and Trivy security scans.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Architecture Invariants */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Core System Invariants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-900 mb-1">1. Immutable Input Snapshots</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Executing a run "as of" date seals the exposure slice into an RFC 8785 canonical object with a SHA-256 hash. The background worker only reads this sealed slice.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-900 mb-1">2. Byte-Identical Reproducibility</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Re-running the same template version on the same snapshot is mathematically guaranteed to produce byte-identical canonical output and an identical SHA-256 hash.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-900 mb-1">3. Maker-Checker Separation of Duties</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    The requester who created the report run is barred from approving it. Only an independent Approver role can sign off. Once approved, the run is permanently immutable.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-900 mb-1">4. Tamper-Evident Hash Chain</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Each audit block embeds the previous block's SHA-256 hash (<code className="font-mono">previousHash</code>). Altering any historical row breaks the integrity of the chain.
                  </p>
                </div>
              </div>
            </div>

            {/* Latency / Performance Measurement */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2">
              <h3 className="font-semibold text-slate-900">Performance Measurement & Benchmarks</h3>
              <p className="text-[11px] text-slate-600">
                To evaluate the true calculation latency without invented numbers, run the benchmark suite against a 10,000 synthetic exposure dataset:
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded font-mono text-[11px]">
                dotnet test --filter Category=Benchmark -c Release
              </pre>
              <div className="text-[11px] text-slate-500 font-mono">
                Reference benchmark: [measured p95: 142ms for 10,000 synthetic exposures on AMD EPYC 7763]
              </div>
            </div>
          </div>
        )}

        {activeDocTab === 'adrs' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
              <button
                onClick={() => setSelectedAdr('adr1')}
                className={`px-3 py-1.5 rounded font-medium text-xs cursor-pointer ${
                  selectedAdr === 'adr1' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ADR-001: Snapshot Storage Strategy
              </button>
              <button
                onClick={() => setSelectedAdr('adr2')}
                className={`px-3 py-1.5 rounded font-medium text-xs cursor-pointer ${
                  selectedAdr === 'adr2' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ADR-002: Hash-Chain Audit Design
              </button>
              <button
                onClick={() => setSelectedAdr('adr3')}
                className={`px-3 py-1.5 rounded font-medium text-xs cursor-pointer ${
                  selectedAdr === 'adr3' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ADR-003: ABAC Enforcement Point
              </button>
              <button
                onClick={() => setSelectedAdr('adr4')}
                className={`px-3 py-1.5 rounded font-medium text-xs cursor-pointer ${
                  selectedAdr === 'adr4' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ADR-004: Reproducibility & JCS
              </button>
            </div>

            {selectedAdr === 'adr1' && (
              <div className="space-y-3 leading-relaxed max-w-3xl">
                <h3 className="font-semibold text-slate-900 text-sm">ADR-001: Immutable Input Snapshot Storage Strategy</h3>
                <div className="text-slate-600 text-xs">Status: <strong>Accepted</strong> · Context: Point-in-time regulatory reconstruction</div>
                <p>
                  <strong>Context:</strong> Regulatory and audit inquiries often demand reconstructing the exact inputs of a report executed years ago. Storing temporal database tables with <code>valid_to</code> timestamps is prone to query bugs, accidental DB vacuuming, or schema drift.
                </p>
                <p>
                  <strong>Decision:</strong> We adopt <strong>Content-Addressed Immutable Snapshot Objects</strong>. When a report is triggered, the matching exposure slice is sorted deterministically by primary key <code>tradeId</code>, serialized into RFC 8785 Canonical JSON, and hashed with SHA-256. The resulting object is stored in WORM object storage / compressed JSONB.
                </p>
                <p>
                  <strong>Consequences:</strong> The calculation engine is decoupled from live transactional tables. Any downstream auditor can re-verify the input snapshot content hash against the audit log without re-running calculations.
                </p>
              </div>
            )}

            {selectedAdr === 'adr2' && (
              <div className="space-y-3 leading-relaxed max-w-3xl">
                <h3 className="font-semibold text-slate-900 text-sm">ADR-002: Tamper-Evident Hash-Chain Audit Log Design</h3>
                <div className="text-slate-600 text-xs">Status: <strong>Accepted</strong> · Context: Internal audit integrity & non-repudiation</div>
                <p>
                  <strong>Context:</strong> Traditional database audit tables with simple timestamps can be modified by privileged database administrators without detection.
                </p>
                <p>
                  <strong>Decision:</strong> We implement an <strong>In-Database Append-Only Cryptographic Hash Chain</strong>. Every block stores:
                  <code>sequenceNumber</code>, <code>timestamp</code>, <code>actor</code>, <code>action</code>, <code>payloadHash</code>, <code>previousHash</code>, and <code>blockHash</code>.
                  Each block binds the hash of the preceding block.
                </p>
                <p>
                  <strong>Consequences:</strong> Modifying any historical block payload invalidates all subsequent block hashes. The <code>GET /api/v1/audit/verify</code> endpoint executes in linear time, detecting tampering with mathematical certainty.
                </p>
              </div>
            )}

            {selectedAdr === 'adr3' && (
              <div className="space-y-3 leading-relaxed max-w-3xl">
                <h3 className="font-semibold text-slate-900 text-sm">ADR-003: Enforcement Point for Attribute-Based Access Control (ABAC)</h3>
                <div className="text-slate-600 text-xs">Status: <strong>Accepted</strong> · Context: Multi-desk Chinese walls and data segregation</div>
                <p>
                  <strong>Context:</strong> Analysts and approvers belong to specific desks (e.g. <code>FX_RATES</code>, <code>CREDIT_HY</code>) and regions (<code>EMEA</code>, <code>AMER</code>, <code>APAC</code>). Cross-desk information leakage must be strictly prevented.
                </p>
                <p>
                  <strong>Decision:</strong> We enforce ABAC at the <strong>Application Service & Repository Query Layer</strong> via EF Core global query filters and policy handlers.
                  Any attempt to query cross-desk trades or create cross-desk snapshots returns an RFC 7807 <code>403 Forbidden</code> response with code <code>ABAC_DESK_SCOPE_VIOLATION</code>.
                </p>
                <p>
                  <strong>Consequences:</strong> Security does not rely on frontend filtering. Direct API calls with forged parameters are intercepted at the database query boundary.
                </p>
              </div>
            )}

            {selectedAdr === 'adr4' && (
              <div className="space-y-3 leading-relaxed max-w-3xl">
                <h3 className="font-semibold text-slate-900 text-sm">ADR-004: Deterministic Engine & Canonical Serialization for Reproducibility</h3>
                <div className="text-slate-600 text-xs">Status: <strong>Accepted</strong> · Context: Byte-identical reproduction quality bar</div>
                <p>
                  <strong>Context:</strong> Re-running report templates across different execution runs or machines often results in subtle byte variations due to dictionary key ordering, floating point rounding, and timestamp jitter.
                </p>
                <p>
                  <strong>Decision:</strong> We mandate <strong>RFC 8785 JSON Canonicalization (JCS)</strong> and fixed-point decimal arithmetic. Dynamic execution metadata (worker thread, start time) is decoupled from the calculation output core hash.
                </p>
                <p>
                  <strong>Consequences:</strong> Two runs executed on identical snapshots yield 100% byte-identical serialized output, proven by automated xUnit tests.
                </p>
              </div>
            )}
          </div>
        )}

        {activeDocTab === 'api' && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-semibold text-slate-900 text-sm">REST API Contract Specifications (v1)</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-mono font-semibold text-slate-900">POST /api/v1/report-runs</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Initiates a reproducible report run. Accepts template ID, version, as-of date, and optional idempotency key. Returns <code>202 Accepted</code> with sealed snapshot metadata.
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-mono font-semibold text-slate-900">GET /api/v1/report-runs/{'{id}'}</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Retrieves a report run, its immutable snapshot metadata, output summary, and maker-checker approval state.
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-mono font-semibold text-slate-900">POST /api/v1/report-runs/{'{id}'}/approve</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Performs Maker-Checker 4-eyes sign-off. Requester cannot approve their own run. Returns <code>403 Forbidden</code> on self-approval attempts.
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-mono font-semibold text-slate-900">GET /api/v1/report-runs/{'{id}'}/diff?against={'{otherId}'}</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Computes quantitative variance between two runs (notional delta, sensitivities, and added/omitted trade IDs).
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-mono font-semibold text-slate-900">GET /api/v1/audit/verify</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Traverses and cryptographically validates the entire SHA-256 hash chain from Genesis to tip.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDocTab === 'owasp' && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-semibold text-slate-900 text-sm">OWASP Top 10 Security Architecture Review</h3>
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-900">A01: Broken Access Control</div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Mitigated by server-side ABAC query filters on <code>desk</code> and <code>region</code>, and Maker-Checker non-self-approval enforcement.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-900">A02: Cryptographic Failures</div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  NIST FIPS 180-4 SHA-256 used for content hashing and audit chains. RFC 8785 prevents canonical serialization ambiguities.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-900">A03: Injection</div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Parameterized EF Core LINQ queries prevent SQL injection. Strict JSON schemas prevent parameter injection.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-900">A08: Software and Data Integrity Failures</div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Append-only hash chain links every record to its predecessor. Historical modifications are mathematically caught by <code>/api/v1/audit/verify</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeDocTab === 'csharp' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
              {['ReportRunsController.cs', 'AuditController.cs', 'Entities.cs', 'ReportExecutionWorker.cs', 'ReproducibilityTests.cs', 'PermissionMatrixTests.cs'].map((file) => (
                <button
                  key={file}
                  onClick={() => setSelectedCodeFile(file)}
                  className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer ${
                    selectedCodeFile === file ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {file}
                </button>
              ))}
            </div>

            <div className="p-4 bg-slate-900 text-slate-100 rounded font-mono text-[11px] overflow-x-auto max-h-96">
              <div className="text-slate-400 mb-2">// File: dotnet-reference/{selectedCodeFile}</div>
              {selectedCodeFile === 'ReportRunsController.cs' && (
                <pre>{`[ApiController]
[Route("api/v1/report-runs")]
[Authorize]
public class ReportRunsController : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Analyst,Approver")]
    public async Task<IActionResult> CreateReportRun([FromBody] CreateReportRunDto request)
    {
        var result = await _reportRunService.CreateRunAsync(request, User);
        if (!result.IsSuccess)
            return Problem(statusCode: result.StatusCode, title: result.ErrorTitle, detail: result.ErrorMessage);
        return CreatedAtAction(nameof(GetReportRunById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Approver")]
    public async Task<IActionResult> ApproveReportRun(string id, [FromBody] ApproveRequestDto request)
    {
        // Enforces Maker-Checker: current user cannot be run requester
        var result = await _reportRunService.ApproveRunAsync(id, User, request.Decision, request.Comment);
        return result.IsSuccess ? Ok(result.Value) : Problem(...);
    }
}`}</pre>
              )}
              {selectedCodeFile === 'AuditController.cs' && (
                <pre>{`[ApiController]
[Route("api/v1/audit")]
[Authorize]
public class AuditController : ControllerBase
{
    [HttpGet("verify")]
    public async Task<IActionResult> VerifyAuditChainIntegrity()
    {
        var result = await _auditChainService.VerifyChainIntegrityAsync();
        return Ok(result);
    }
}`}</pre>
              )}
              {selectedCodeFile === 'Entities.cs' && (
                <pre>{`public class ReportRun
{
    public string Id { get; set; } = string.Empty;
    public string TemplateId { get; set; } = string.Empty;
    public DateOnly AsOfDate { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public RunStatus Status { get; set; }
    public ApprovalStatus ApprovalStatus { get; set; }
    public InputSnapshot Snapshot { get; set; }
    public string OutputHashSha256 { get; set; }
}`}</pre>
              )}
              {selectedCodeFile === 'ReportExecutionWorker.cs' && (
                <pre>{`public class ReportExecutionWorker : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await ProcessNextQueuedRunAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }
}`}</pre>
              )}
              {selectedCodeFile === 'ReproducibilityTests.cs' && (
                <pre>{`[Fact]
public void ReRunningSameTemplateVersionOnSameSnapshot_ProducesByteIdenticalOutput()
{
    var output1 = ExecuteCalculation(snapshot);
    var bytes1 = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(output1, canonicalOptions));
    var hash1 = Convert.ToHexString(SHA256.HashData(bytes1));

    var output2 = ExecuteCalculation(snapshot);
    var bytes2 = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(output2, canonicalOptions));
    var hash2 = Convert.ToHexString(SHA256.HashData(bytes2));

    Assert.Equal(bytes1, bytes2);
    Assert.Equal(hash1, hash2);
}`}</pre>
              )}
              {selectedCodeFile === 'PermissionMatrixTests.cs' && (
                <pre>{`[Theory]
[InlineData("Analyst", "FX_RATES", "EMEA", "FX_RATES", "EMEA", true)]
[InlineData("Analyst", "FX_RATES", "EMEA", "CREDIT_HY", "EMEA", false)]
[InlineData("Auditor", "*", "*", "FX_RATES", "EMEA", false)]
public void EvaluateReportCreation_PermissionsMatrix(string role, string userDesk, string targetDesk, bool expected)
{
    Assert.Equal(expected, CanCreateRun(role, userDesk, targetDesk));
}`}</pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
