import sr = require("seedrandom");

export interface GenerateOptions {
  count: number;
  seed: string;
  makeRoot: boolean;
}

export interface UsedReference {
  file: File;
  exports: string[];
}

export interface File {
  relativePath: string;
  contents: string;
  exports: Array<{ name: string }>;
  referencedBy: Array<File>;
  references: Array<UsedReference>;
}

export interface Invocation {
  name: string;
  file: File;
}

export function generate(options: GenerateOptions): ReadonlyArray<File> {
  const rng = sr(options.seed);

  const r: File[] = [];
  for (let i = 0; i < options.count; i++) {
    const file = makeFile();
    const fullFile = {
      ...file,
      relativePath: "./test" + i + ".ts",
      referencedBy: []
    };
    r.push(fullFile);
    fullFile.references.forEach(x => x.file.referencedBy.push(fullFile));
  }


  if (options.makeRoot) {
    const refs = r
      .filter(x => x.referencedBy.length === 0)
      .map(x => ({ file: x, name: x.exports[0].name }));
    const file = makeFileWithInvocations(refs, 1);
    const fullFile = {
      ...file,
      relativePath: "./test-root.ts",
      referencedBy: []
    };
    r.push(fullFile);
  }


  return r;


  function randomInt(max: number) {
    return Math.floor(rng() * max);
  }

  function makeFile(maxFunctions = 21) {
    const referencesCount = randomInt(Math.min(15, r.length));
    const invocations: Array<Invocation> = [];
    for (let i = 0; i < referencesCount; i++) {
      // reference files in the beginning more often, giving something similar to Paretto distribution
      const fileIndex = Math.floor(randomInt(r.length));
      const file = r[fileIndex];
      const fn = file.exports[randomInt(file.exports.length)];
      invocations.push({ file, name: fn.name });
    }

    return makeFileWithInvocations(invocations, maxFunctions);
  }

  function makeFileWithInvocations(invocations: Invocation[], maxFunctions: number) {
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

    const header = Object.keys(groupedInvocations)
      .map(
        path =>
          `import { ${Object.keys(
            groupedInvocations[path].imports
          ).join()} } from '${path.substring(0, path.length - 3)}';`
      )
      .join("\n");

    const functions = [];
    const newFunctions = [];
    const calls = invocations.map(x => x.name);
    const length = Math.max(1, randomInt(maxFunctions));
    for (let i = 0; i < length; i++) {
      const name = "fn" + randomInt(10000000);
      newFunctions.push(name);
      const body = makeFunctionBody(name, calls);
      functions.push(body);
    }

    const references: UsedReference[] = Object.keys(groupedInvocations).map(
      path => ({
        file: groupedInvocations[path].file,
        exports: Object.keys(groupedInvocations[path].imports)
      })
    );

    return {
      references,
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
