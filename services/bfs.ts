
import { Grid, Path, BFSResult, QueueState } from '../types';

export function findShortestPath(grid: Grid, canBreakWall: boolean): BFSResult {
  const rows = grid.length;
  if (rows === 0) return { path: [], visited: [] };
  const cols = grid[0].length;
  if (cols === 0) return { path: [], visited: [] };

  // visited[row][col][wallsBroken] tracks visited states.
  // [0] for path without breaking wall, [1] for path after breaking one wall.
  const visited = Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => [false, false])
  );

  // Queue stores: [row, col, wallsBrokenCount, currentPath]
  const queue: QueueState[] = [[0, 0, 0, [[0, 0]]]];
  visited[0][0][0] = true;

  const explorationOrder: Path = [];

  const directions = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
  ];

  while (queue.length > 0) {
    const [row, col, wallsBroken, path] = queue.shift()!;
    
    explorationOrder.push([row, col]);

    if (row === rows - 1 && col === cols - 1) {
      return { path, visited: explorationOrder };
    }

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
        const newPath: Path = [...path, [newRow, newCol]];
        const cellValue = grid[newRow][newCol];

        if (cellValue === 0) { // It's a path
          if (!visited[newRow][newCol][wallsBroken]) {
            visited[newRow][newCol][wallsBroken] = true;
            queue.push([newRow, newCol, wallsBroken, newPath]);
          }
        } else { // It's a wall
          if (canBreakWall && wallsBroken === 0 && !visited[newRow][newCol][1]) {
            visited[newRow][newCol][1] = true;
            queue.push([newRow, newCol, 1, newPath]);
          }
        }
      }
    }
  }

  // No path found
  return { path: [], visited: explorationOrder };
}
