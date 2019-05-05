import * as ts from "typescript";
import { Volume } from "memfs/lib/volume";
import { dirname, basename, resolve } from "path";
import { IFs, createFsFromVolume } from "memfs";
import * as fs from "fs";
import { File } from "../src/generator";

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

export function compileTypeScriptCode(code: ReadonlyArray<File>) {
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
  const formatHost: ts.FormatDiagnosticsHost = {
    getNewLine: () => ts.sys.newLine,
    getCurrentDirectory: () => "/",
    getCanonicalFileName: x => x
  };
  const diag = emitResult.diagnostics.concat(diagnostics);
  return {
    diagnostics: diag.map(x => ({
      error: ts.formatDiagnostic(x, formatHost),
      file: x.file!.getText()
    }))
  };
}
