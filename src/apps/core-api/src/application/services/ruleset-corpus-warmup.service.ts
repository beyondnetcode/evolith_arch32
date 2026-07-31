import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CachingRulesetRepository } from '@beyondnet/evolith-infra-providers';
import type { EnvConfig } from '../../infrastructure/config/env.validation';

/**
 * GT-648 — read the ruleset corpus at startup, so no request ever pays for it.
 *
 * The cache alone would already fix the steady state: request #2 onwards would
 * be served from memory. It would not fix request #1, which is exactly the
 * request a readiness probe lets through the door — the deployment would look
 * ready and then stall the event loop on the first real evaluation.
 *
 * So the corpus is loaded here, before the server accepts traffic, and the rule
 * count is logged as the evidence that it happened once rather than per request.
 *
 * A failure is logged and swallowed on purpose. `CachingRulesetRepository` does
 * not cache rejections, so a corpus that is unreadable at boot is retried by the
 * first request that needs it and fails there — as a request-scoped
 * `RulesetsNotFoundError` with its full probe trail, which is where an operator
 * can see it. Refusing to boot would instead turn a misconfigured `CORE_PATH`
 * into a crash-loop with the useful diagnostic buried in restart noise, and
 * `GET /health/ready` already answers whether the corpus is reachable.
 */
@Injectable()
export class RulesetCorpusWarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RulesetCorpusWarmupService.name);

  constructor(
    @Inject('IRulesetRepository')
    private readonly rulesetRepo: unknown,
    private readonly config: ConfigService<EnvConfig>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Only a caching repository has a corpus to warm. A deployment wired to the
    // plain disk repository (or a test double) is left alone rather than made to
    // pay for a load whose result nothing would keep.
    if (!(this.rulesetRepo instanceof CachingRulesetRepository)) return;

    const corePath = this.config.get('CORE_PATH', { infer: true }) as
      | string
      | undefined;
    if (!corePath) {
      this.logger.warn(
        'CORE_PATH is not set; the ruleset corpus will be loaded on first use instead of at startup',
      );
      return;
    }

    const startedAt = Date.now();
    try {
      const ruleCount = await this.rulesetRepo.preload(corePath);
      this.logger.log(
        `Ruleset corpus loaded at startup: ${ruleCount} rules from ${corePath} in ${Date.now() - startedAt} ms (loaded once; evaluations no longer re-read disk)`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Ruleset corpus could not be preloaded from ${corePath}; the first evaluation will retry and report the fault: ${message}`,
      );
    }
  }
}
