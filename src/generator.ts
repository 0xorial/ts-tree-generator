import sr = require("seedrandom");

export interface GenerateOptions {
  count: number;
}

export interface File {
  relativePath: string;
  contents: string;
  exports: Array<{ name: string }>;
}

export function generate(options: GenerateOptions): ReadonlyArray<File> {
  const rng = sr("42");

  const r: File[] = [];
  for (let i = 0; i < options.count; i++) {
    const file = makeFile();
    r.push({ ...file, relativePath: "./test" + i + ".ts" });
  }
  return r;

  function randomInt(max: number) {
    return Math.floor(rng() * max);
  }

  function makeFile() {
    const length = Math.max(1, randomInt(20));
    const referencesCount = randomInt(Math.min(15, r.length));

    const invocations: Array<{ name: string; file: File }> = [];
    for (let i = 0; i < referencesCount; i++) {
      const file = r[randomInt(r.length)];
      const fn = file.exports[randomInt(file.exports.length)];
      invocations.push({ file, name: fn.name });
    }

    const groupedInvocations = invocations.reduce<{
      [relativePath: string]: {
        file: File;
        imports: { [name: string]: boolean };
      };
    }>((p, a) => {
      if (p[a.file.relativePath] === undefined) {
        p[a.file.relativePath] = { file: a.file, imports: {} };
      }
      p[a.file.relativePath].imports[a.name] = true;
      return p;
    }, {});

    const header = Object.keys(groupedInvocations).map(
      path =>
        `import { ${Object.keys(
          groupedInvocations[path].imports
        ).join()} } from '${path.substring(0, path.length - 3)}';`
    ).join("\n");

    const functions = [];
    const newFunctions = [];
    const calls = invocations.map(x => x.name);
    for (let i = 0; i < length; i++) {
      const name = "fn" + randomInt(10000000);
      newFunctions.push(name);
      const body = makeFunctionBody(name, calls);
      functions.push(body);
    }

    return {
      contents: header + functions.join("\n"),
      exports: newFunctions.map(x => ({
        name: x
      }))
    };
  }

  function makeFunctionBody(name: string, invocations: string[]) {
    if (invocations.length === 0) {
      return `export function ${name} (){
        return ${rng()} * ${rng()};
       }`;
    } else {
      return `export function ${name} (){
        ${invocations.map(x => `${x}();`).join("\n")}
       }`;
    }
  }
}
