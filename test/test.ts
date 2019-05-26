import { generate } from "../src/generator";
import { expect, assert } from "chai";
import { compileTypeScriptCode } from "./compiler";
import * as fs from "fs";
import { resolve } from "path";

describe("generator", () => {
  it("should generate files", () => {
    const files = generate({ count: 1, seed: "42", makeRoot: false });
    expect(files).to.have.length(1);
  });

  it("should generate correct files", () => {
    const files = generate({ count: 1, seed: "42", makeRoot: true });
    const r = compileTypeScriptCode(files);
    if (r.diagnostics.length !== 0) {
      const diagnostics = r.diagnostics[0];
      assert.fail(diagnostics.error + diagnostics.file);
    }
  });

  it("should generate many files", () => {
    const count = 15000;
    const files = generate({ count: count, seed: "42", makeRoot: true });
    const r = compileTypeScriptCode(files);
    if (r.diagnostics.length !== 0) {
      const diagnostics = r.diagnostics[0];
      assert.fail(diagnostics.error + diagnostics.file);
    }
    expect(files).to.have.length(count + 1);

    console.log(
      "max references: " + Math.max(...files.map(x => x.referencedBy.length))
    );

    files.forEach(x => {
      fs.writeFileSync(
        resolve(process.cwd(), "generated", x.relativePath),
        x.contents
      );
    });
  });
});
