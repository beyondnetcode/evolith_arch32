import { formatCoverageReport, validateTopologyRuleCoverage } from '../generate-rule-coverage.mjs';

const result = validateTopologyRuleCoverage();
console.log(formatCoverageReport(result));
if (result.errors.length) process.exit(1);
