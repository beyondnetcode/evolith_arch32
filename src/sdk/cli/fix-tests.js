const fs = require('fs');
const file = 'src/application/services/phase-transition.use-case.spec.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
`      const result = await failingExistsUseCase.validateGatesWithValidator('/project');`,
`      const result = await failingExistsUseCase.execute('phase-0', 'phase-1', [], '/project');`
);

fs.writeFileSync(file, content);
