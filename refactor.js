const fs = require('fs');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
};

const dirs = ['sdk/cli/src/commands', 'sdk/cli/src/infrastructure', 'sdk/cli/test', 'sdk/cli/src/main.ts', 'sdk/cli/src/app.module.ts'];
let files = [];
dirs.forEach(d => {
  if (fs.existsSync(d)) {
    if (fs.statSync(d).isDirectory()) {
      files = files.concat(walk(d));
    } else {
      files.push(d);
    }
  }
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/(from\s+['"])(?:\.\.\/)+domain\//g, "$1@evolith/core-domain/domain/");
  newContent = newContent.replace(/(from\s+['"])(?:\.\.\/)+application\//g, "$1@evolith/core-domain/application/");
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Refactored', file);
  }
});
