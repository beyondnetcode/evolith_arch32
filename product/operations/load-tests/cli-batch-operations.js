import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { exec } from 'k6/execution';

const cliLatency = new Trend('cli_operation_latency', true);

export const options = {
  scenarios: {
    cli_batch: {
      executor: 'constant-vus',
      vus: 1,
      duration: '60s',
    },
  },
  thresholds: {
    cli_operation_latency: ['p(99)<5000', 'p(95)<3000'],
  },
};

const CLI_COMMANDS = [
  'evolith topology list',
  'evolith topology describe test-topology',
  'evolith gate list',
  'evolith gate evaluate --topology test-topology --gate phase-gate',
  'evolith status',
  'evolith validate',
];

export default function () {
  const cmdIndex = __ITER % CLI_COMMANDS.length;
  const cmd = CLI_COMMANDS[cmdIndex];

  const startTime = Date.now();

  const result = exec.exec('sh', ['-c', cmd], {
    timeout: '30s',
  });

  const duration = Date.now() - startTime;
  cliLatency.add(duration);

  check(result, {
    'CLI command succeeded': (r) => r.code === 0,
    'CLI output is not empty': (r) => r.stdout.length > 0 || r.stderr.length === 0,
  });

  sleep(0.5);
}
