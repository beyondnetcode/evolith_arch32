export interface AgentRulesetInput {
  name: string;
  template: string;
  adrs: string[];
  rulesets: string[];
}

export function buildAgentRuleset(agentInfo: AgentRulesetInput) {
  const principles: Array<{
    id: string;
    principle: string;
    statement: string;
    severity: string;
    blocking: boolean;
  }> = [];

  principles.push({
    id: 'AGT-01',
    principle: 'Agent Identity',
    statement: `Agent ${agentInfo.name} enforces Evolith governance standards`,
    severity: 'MUST',
    blocking: true,
  });

  if (agentInfo.template === 'enterprise') {
    principles.push({
      id: 'AGT-02',
      principle: 'Audit Trail',
      statement: 'All agent actions must be logged for traceability',
      severity: 'MUST',
      blocking: true,
    });
    principles.push({
      id: 'AGT-03',
      principle: 'Approval Chain',
      statement: 'Critical actions require explicit approval',
      severity: 'SHOULD',
      blocking: false,
    });
  }

  if (agentInfo.adrs.includes('adr-0002')) {
    principles.push({
      id: 'AGT-HXA-01',
      principle: 'Hexagonal Architecture Compliance',
      statement: 'Domain layer has zero framework dependencies',
      severity: 'MUST',
      blocking: true,
    });
  }

  if (agentInfo.adrs.includes('adr-0018')) {
    principles.push({
      id: 'AGT-TP-01',
      principle: 'Testing Pyramid',
      statement: '70% unit / 20% integration / 10% E2E distribution',
      severity: 'SHOULD',
      blocking: false,
    });
  }

  if (agentInfo.rulesets.includes('acl')) {
    principles.push({
      id: 'AGT-ACL-01',
      principle: 'Schema Validation',
      statement: 'All external data validated before ingestion',
      severity: 'MUST',
      blocking: true,
    });
  }

  return {
    agent: {
      name: agentInfo.name,
      template: agentInfo.template,
      version: '1.0.0',
      installedAt: new Date().toISOString(),
    },
    ruleset: {
      version: '1.0',
      type: 'agent',
      scope: 'governance',
    },
    principles,
    metadata: {
      adrs: agentInfo.adrs,
      rulesets: agentInfo.rulesets,
    },
  };
}
