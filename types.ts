
export type CellValue = 0 | 1;
export type Grid = CellValue[][];
export type Path = [number, number][];

export interface BFSResult {
  path: Path;
  visited: Path;
}

export type QueueState = [
  row: number,
  col: number,
  wallsBroken: number,
  path: Path
];
