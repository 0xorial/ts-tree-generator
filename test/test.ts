import { generate, File } from "../src/generator";
import { expect } from "chai";
import MemoryFileSystem = require("memory-fs");

describe("generator", () => {
  it("should generate files", () => {
    const files = generate({ count: 1 });
    expect(files).to.have.length(1);
  });

  it("should generate correct files", () => {

    const files = generate({ count: 1 });
    const r = compileTypeScriptCode(files)
    if (r.diagnostics.length !== 0){
      chai.assert.fail(r.diagnostics);
    }
  });
});

import * as ts from "typescript";

//
// Result of compiling TypeScript code.
//
export interface CompilationResult {
  code?: string;
  diagnostics: ts.Diagnostic[];
}

//
// Check and compile in-memory TypeScript code for errors.
//
function compileTypeScriptCode(code: ReadonlyArray<File>): CompilationResult {
  const options = ts.getDefaultCompilerOptions();
  const realHost = ts.createCompilerHost(options, true);
  const fs = new MemoryFileSystem();

  const sourceFiles: { [x: string]: ts.SourceFile } = {};
  const fileNames: string[] = [];
  code.forEach(x => {
    sourceFiles[x.relativePath] = ts.createSourceFile(
      x.relativePath,
      x.contents,
      ts.ScriptTarget.Latest
    );
    fileNames.push(x.relativePath);
  });

  const host: ts.CompilerHost = {
    fileExists: path => fs.readFileSync(path) !== undefined,
    getCurrentDirectory: () => ".",
    getNewLine: () => ts.sys.newLine,
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: path => path,
    getSourceFile: path =>
      ts.createSourceFile(
        path,
        fs.readFileSync(path, "utf-8"),
        ts.ScriptTarget.Latest
      ),
    readFile: path => fs.readFileSync(path, "utf-8"),
    getDefaultLibFileName: ts.getDefaultLibFileName,
    writeFile: () => {
      /* do nothing */
    }
  };

  const program = ts.createProgram(fileNames, options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const emitResult = program.emit();
  return {
    diagnostics: emitResult.diagnostics.concat(diagnostics)
  };
}
