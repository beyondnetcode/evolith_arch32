import { Injectable } from '@nestjs/common';
import { RulesetValidatorService } from '@beyondnet/evolith-core';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

/**
 * `evolith-ruleset-list` — what this Core can evaluate, for an agent that has to
 * choose (GT-660).
 *
 * `evolith-validate` has carried a `select` argument since GT-659 whose own
 * description points at «ids as published by GET /api/v1/reference/rulesets».
 * On MCP that was an instruction to leave the protocol: an agent holding this
 * tool had no way to ask what the menu was, so "configurable per tenant" was
 * true of the REST surface and untrue of this one.
 *
 * The owner's principle is the division of labour here: **the Core PROPOSES;
 * the Tracker, CLI and MCP configure and select.** This tool is the proposing
 * half. It evaluates nothing, reads no satellite and returns no verdict.
 *
 * It shares {@link RulesetValidatorService.catalog} with the CLI, which derives
 * from the same `loadAllRulesets` the engine evaluates — so the refs it hands an
 * agent are the refs `select` accepts. That property is what makes the menu worth
 * having, and it is asserted rather than assumed.
 */
@Injectable()
export class RulesetCatalogTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-ruleset-list',
    description:
      'List the ruleset packs this Core can evaluate. Returns the canonical refs accepted by ' +
      "`evolith-validate`'s `select` argument, with the rule count and — per pack — how many of " +
      'those rules can FAIL a run. Read this before selecting: a ref this Core does not carry is ' +
      'a blocking failure, never a quiet pass.',
    inputSchema: {
      type: 'object',
      properties: {
        corePath: {
          type: 'string',
          description: 'Optional explicit path to the Evolith core repository',
        },
      },
      required: [],
    },
  };

  constructor(private readonly validator: RulesetValidatorService) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const corePath = args.corePath as string | undefined;
    const catalog = await this.validator.catalog(corePath);

    if (catalog.packs === 0) {
      // An empty menu is far more often a Core that did not resolve than a Core
      // with nothing to offer. Returning `[]` would let a broken `corePath`
      // read to an agent as "this Core evaluates nothing", which it would then
      // report to a user as fact.
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text:
              'No ruleset packs resolved. This is NOT an empty catalogue — it is a Core that could ' +
              'not be read. Pass `corePath`, or set EVOLITH_CORE_PATH on the server.',
          },
        ],
      };
    }

    return {
      packs: catalog.packs,
      rules: catalog.rules,
      // Published deliberately: an agent choosing on a tenant's behalf must be
      // able to tell a pack that reports from a pack that blocks BEFORE it
      // recommends adopting one.
      blocking: catalog.blocking,
      entries: catalog.entries,
    };
  }
}
