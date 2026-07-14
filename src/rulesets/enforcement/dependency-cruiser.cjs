// GT-515/GT-512 — dependency-cruiser config for the Node/TS runtime enforcer.
// enhancedResolveOptions + tsConfig make depcruise resolve this monorepo's TS against a
// RESTORED (deps-installed) checkout with 0 false "couldNotResolve" positives — the
// restored-environment contract GT-512 provisions. The DependencyCruiserAdapter points
// depcruise at this via buildDependencyCruiserSpec({ configPath }).
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-orphans', severity: 'warn', from: { orphan: true, pathNot: '(\\.d\\.ts|index\\.ts)$' }, to: {} },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' }, tsPreCompilationDeps: true,
    enhancedResolveOptions: { extensions: ['.ts','.tsx','.d.ts','.js','.jsx','.json'], mainFields: ['module','main','types','typings'], conditionNames: ['import','require','node','default','types'] },
    doNotFollow: { path: 'node_modules' }, exclude: 'node_modules',
  },
};
