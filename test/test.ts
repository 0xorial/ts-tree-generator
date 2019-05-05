import { generate} from "../src/generator";
import { expect, assert } from "chai";
import { compileTypeScriptCode } from "./compiler";
import * as fs from "fs";
import { resolve } from "path";

describe("generator", () => {
  it("should generate files", () => {
    const files = generate({ count: 1, seed: "42" });
    expect(files).to.have.length(1);
  });

  it("should generate correct files", () => {
    const files = generate({ count: 1, seed: "42" });
    const r = compileTypeScriptCode(files);
    if (r.diagnostics.length !== 0) {
      const diagnostics = r.diagnostics[0];
      assert.fail(diagnostics.error + diagnostics.file);
    }
  });

  it("should generate many files", () => {
    const count = 1000;
    const files = generate({ count: count, seed: "42" });
    const r = compileTypeScriptCode(files);
    if (r.diagnostics.length !== 0) {
      const diagnostics = r.diagnostics[0];
      assert.fail(diagnostics.error + diagnostics.file);
    }
    expect(files).to.have.length(count);
    
    // files.forEach(x => {
    //   fs.writeFileSync(resolve(process.cwd(), "generated", x.relativePath), x.contents);
    // })
  });
});

