export interface GenerateOptions {
    count: number;
}

export interface File {
    relativePath: string;
    contents: string;
}

export function generate(options: GenerateOptions): ReadonlyArray<File> {
    return [{contents: 'const x = 1;', relativePath: './test.ts'}];
    

}