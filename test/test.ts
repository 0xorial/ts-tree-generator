import { generate, File } from "../src/generator";
import { expect, assert } from "chai";
import * as fs from "fs";
import { IFs, createFsFromVolume } from "memfs";
import { resolve, dirname, basename } from "path";

describe("generator", () => {
  it("should generate files", () => {
    const files = generate({ count: 1 });
    expect(files).to.have.length(1);
  });

  it("should generate correct files", () => {
    const files = generate({ count: 1 });
    const r = compileTypeScriptCode(files);
    if (r.diagnostics.length !== 0) {
      assert.fail(r.diagnostics);
    }
  });
});

import * as ts from "typescript";
import { Volume } from "memfs/lib/volume";

//
// Result of compiling TypeScript code.
//
export interface CompilationResult {
  code?: string;
  diagnostics: ts.Diagnostic[];
}

function makeCompilerHost(mfs: IFs) {
  const options = ts.getDefaultCompilerOptions();

  const defaultHost = ts.createCompilerHost(options);
  const libPath = defaultHost.getDefaultLibFileName(options);
  const tsDir = dirname(libPath);
  const libs = fs.readdirSync(tsDir).filter(x => x.endsWith(".d.ts"));
  libs.forEach(lib => {
    const libName = basename(lib);
    const c = fs.readFileSync(resolve(tsDir, lib), "utf-8");
    mfs.writeFileSync(resolve("/", libName), c);
  });  

  const host: ts.CompilerHost = {
    fileExists: path => mfs.readFileSync(path) !== undefined,
    getSourceFile: path =>
      ts.createSourceFile(
        path,
        mfs.readFileSync(path, "utf-8") as string,
        ts.ScriptTarget.Latest
      ),

    readFile: path => mfs.readFileSync(path, "utf-8") as string,
    getCurrentDirectory: () => "/",
    getNewLine: () => ts.sys.newLine,
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: path => path,
    getDefaultLibFileName: o => {
      return resolve("/", ts.getDefaultLibFileName(o));
    },
    writeFile: () => {
      /* do nothing */
    }
  };
  return { options, host };
}

function compileTypeScriptCode(code: ReadonlyArray<File>) {
  const mfs = createFsFromVolume(new Volume());
  const fileNames: string[] = [];
  code.forEach(x => {
    const absolutePath = resolve("/", x.relativePath);
    fileNames.push(absolutePath);
    mfs.writeFileSync(absolutePath, x.contents);
  });

  const { options, host } = makeCompilerHost(mfs);
  const program = ts.createProgram(fileNames, options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const emitResult = program.emit();
  return {
    diagnostics: ts.formatDiagnostics(
      emitResult.diagnostics.concat(diagnostics),
      {
        getNewLine: () => ts.sys.newLine,
        getCurrentDirectory: () => "/",
        getCanonicalFileName: x => x
      }
    )
  };
}
