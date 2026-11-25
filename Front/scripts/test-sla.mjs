import assert from "node:assert/strict";
import { applySla, countryCode, defaultSlaPolicy, emptyFilters, filterInventory, metrics } from "../src/lib/inventory.ts";

const ages = ["AGE_0_7D", "AGE_8_30D", "AGE_31_90D", "AGE_91_180D", "AGE_GT180D"];
const servers = [
  { ServerID: "C", AssetCriticality: "CRITICAL", RegionGroup: "REGION_CENTRAL", Country: "México", FunctionalRole: "DATABASE", OSFamily: "LINUX_SERVER" },
  { ServerID: "M", AssetCriticality: "MEDIUM", RegionGroup: "REGION_CENTRAL", Country: "MEX", FunctionalRole: "DATABASE", OSFamily: "LINUX_SERVER" },
  { ServerID: "L", AssetCriticality: "LOW", RegionGroup: "REGION_SOUTH", Country: "076", FunctionalRole: "DATABASE", OSFamily: "LINUX_SERVER" },
  { ServerID: "U", AssetCriticality: "UNRECOGNIZED", RegionGroup: "REGION_SOUTH", Country: "Costa vacía", FunctionalRole: "DATABASE", OSFamily: "LINUX_SERVER" },
];
const findings = servers.slice(0, 3).flatMap(server => ages.map((AgeBand, index) => ({
  ServerID: server.ServerID, FindingID: `${server.ServerID}-${index}`,
  AssetCriticality: "LOW", FindingStatus: "ACTIVE", AgeBand, SLAStatus: "SOURCE",
})));
const snapshot = { servers, findings };
const computed = applySla(snapshot, defaultSlaPolicy);
const overdue = filterInventory(computed, { ...emptyFilters, sla: "BREACHED" }).findings;
assert.equal(metrics(computed).overdue, 7);
assert.deepEqual(overdue.map(f => f.FindingID), ["C-1", "C-2", "C-3", "C-4", "M-3", "M-4", "L-4"]);
assert.ok(computed.findings.every(finding => finding.OriginalSLAStatus === "SOURCE"));
assert.ok(snapshot.findings.every(finding => finding.SLAStatus === "SOURCE"));
assert.equal(computed.findings.find(finding => finding.FindingID === "C-1").SLATargetDays, "7");

const relaxed = applySla(computed, { ...defaultSlaPolicy, CRITICAL: 30 });
assert.equal(metrics(relaxed).overdue, 6);
assert.equal(relaxed.findings.find(finding => finding.FindingID === "C-1").SLAStatus, "WITHIN");
assert.equal(relaxed.findings.find(finding => finding.FindingID === "C-1").OriginalSLAStatus, "SOURCE");
assert.deepEqual(relaxed.findings.filter(finding => finding.ServerID !== "C"), computed.findings.filter(finding => finding.ServerID !== "C"));
const custom = applySla(snapshot, { ...defaultSlaPolicy, CRITICAL: 15, LOW: 181 });
assert.deepEqual(custom.findings.filter(f => f.ServerID === "C").map(f => f.SLAStatus), ["WITHIN", "UNKNOWN", "BREACHED", "BREACHED", "BREACHED"]);
assert.equal(custom.findings.find(f => f.FindingID === "C-1").SLATargetDays, "15");
assert.deepEqual(filterInventory(custom, { ...emptyFilters, sla: "UNKNOWN" }).findings.map(f => f.FindingID), ["C-1", "L-4"]);
assert.equal(metrics(custom).overdue, 5);
assert.deepEqual(filterInventory(custom, { ...emptyFilters, sla: "BREACHED" }).findings.map(f => f.FindingID), ["C-2", "C-3", "C-4", "M-3", "M-4"]);
const sameDay = applySla(snapshot, { ...defaultSlaPolicy, CRITICAL: 0 });
assert.equal(sameDay.findings.find(f => f.FindingID === "C-0").SLAStatus, "UNKNOWN");
assert.equal(sameDay.findings.find(f => f.FindingID === "C-1").SLAStatus, "BREACHED");
for (const invalid of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "15"]) {
  assert.throws(() => applySla(snapshot, { ...defaultSlaPolicy, CRITICAL: invalid }), /plazo SLA.*días enteros/);
}

const special = applySla({ ...snapshot, findings: [
  { ServerID: "C", FindingStatus: "REMEDIATED", AgeBand: "AGE_GT180D" },
  { ServerID: "C", FindingStatus: "ACTIVE", AgeBand: "INVALID" },
  { ServerID: "U", FindingStatus: "ACTIVE", AgeBand: "AGE_0_7D" },
] }, defaultSlaPolicy);
assert.deepEqual(special.findings.map(finding => finding.SLAStatus), ["NOT_APPLICABLE", "UNKNOWN", "UNKNOWN"]);
assert.equal(metrics(special).overdue, 0);

assert.equal(countryCode("EE. UU."), "US");
assert.equal(countryCode("Costa vacía"), undefined);
assert.deepEqual(filterInventory(computed, { ...emptyFilters, country: "MX" }).servers.map(server => server.ServerID), ["C", "M"]);
assert.equal(filterInventory(computed, { ...emptyFilters, country: "MX", region: "REGION_SOUTH" }).findings.length, 0);
assert.equal(filterInventory(computed, { ...emptyFilters, country: "BR", sla: "BREACHED" }).findings.length, 1);
console.log("PASS: plazos por criticidad del servidor, límites, filtro SLA, país normalizado y casos no evaluables.");
