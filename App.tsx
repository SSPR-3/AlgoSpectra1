import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Grid, Path, CellValue } from './types';
import { findShortestPath } from './services/bfs';

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 15;
const AUTO_PLAY_SPEED = 30; // ms per step for auto-play

const createSolvableGrid = (rows: number, cols: number): Grid => {
    let newGrid: Grid;
    let pathExists = false;

    // Keep generating grids until one is found that has a path without breaking walls.
    // This ensures the base case is always solvable.
    do {
        newGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
        for (let i = 0; i < Math.floor(rows * cols * 0.25); i++) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            if ((r === 0 && c === 0) || (r === rows - 1 && c === cols - 1)) continue;
            newGrid[r][c] = 1;
        }
        const result = findShortestPath(newGrid, false);
        if (result.path.length > 0) {
            pathExists = true;
        }
    } while (!pathExists);
    
    return newGrid;
};

// Helper Components (defined outside main component to prevent re-creation on re-renders)

interface AnimationControlsProps {
    onReset: () => void;
    onPrev: () => void;
    onNext: () => void;
    onTogglePlay: () => void;
    isPlaying: boolean;
    isAtStart: boolean;
    isAtEnd: boolean;
}

const AnimationControls: React.FC<AnimationControlsProps> = ({ onReset, onPrev, onNext, onTogglePlay, isPlaying, isAtStart, isAtEnd }) => (
    <div className="mt-4 p-3 bg-white/50 rounded-lg shadow-md border border-emerald-200">
        <p className="text-center font-semibold text-emerald-700 mb-2">Animation Control</p>
        <div className="flex items-center justify-center gap-2">
            <button onClick={onReset} title="Reset Animation" className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50" disabled={isAtStart}>🔄</button>
            <button onClick={onPrev} title="Previous Step" className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50" disabled={isAtStart}>«</button>
            <button onClick={onTogglePlay} title={isPlaying ? "Pause" : "Play"} className="px-4 py-1 text-xl bg-emerald-500 text-white rounded-md hover:bg-emerald-600 w-16 disabled:opacity-50" disabled={isAtEnd}>{isPlaying ? '❚❚' : '▶'}</button>
            <button onClick={onNext} title="Next Step" className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50" disabled={isAtEnd}>»</button>
        </div>
    </div>
);


interface ControlsProps {
    rows: number;
    setRows: (r: number) => void;
    cols: number;
    setCols: (c: number) => void;
    handleGenerate: () => void;
    handleFindPath: (canBreakWall: boolean) => void;
    isBusy: boolean;
    hasResult: boolean;
    animationProps: AnimationControlsProps;
}

const Controls: React.FC<ControlsProps> = ({ rows, setRows, cols, setCols, handleGenerate, handleFindPath, isBusy, hasResult, animationProps }) => (
    <div className="w-full md:w-80 lg:w-96 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-emerald-200">
        <h2 className="text-2xl font-bold text-emerald-800 mb-4">Controls</h2>
        <div className="space-y-4">
            <div className="flex gap-4">
                <div>
                    <label htmlFor="rows" className="block text-sm font-medium text-gray-700">Rows</label>
                    <input type="number" id="rows" value={rows} onChange={e => setRows(Math.max(3, parseInt(e.target.value) || 3))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="cols" className="block text-sm font-medium text-gray-700">Columns</label>
                    <input type="number" id="cols" value={cols} onChange={e => setCols(Math.max(3, parseInt(e.target.value) || 3))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                </div>
            </div>
            <button onClick={handleGenerate} disabled={isBusy} className="w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-gray-400">
                Generate New Maze
            </button>
            <div className="space-y-2 pt-2">
                 <button onClick={() => handleFindPath(false)} disabled={isBusy} className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400">
                    Find Path (No Wall Breaking)
                </button>
                <button onClick={() => handleFindPath(true)} disabled={isBusy} className="w-full bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400">
                    Find Path with Boon (Break 1 Wall)
                </button>
            </div>
            {hasResult && <AnimationControls {...animationProps} />}
        </div>
    </div>
);

interface GridCellProps {
    value: CellValue;
    isStart: boolean;
    isEnd: boolean;
    isPath: boolean;
    isVisited: boolean;
    isBrokenWall: boolean;
    isBusy: boolean;
    onClick: () => void;
}

const GridCell: React.FC<GridCellProps> = ({ value, isStart, isEnd, isPath, isVisited, isBrokenWall, isBusy: isAnimating, onClick }) => {
    const getBgColor = () => {
        if (isStart) return 'bg-yellow-300';
        if (isEnd) return 'bg-green-500';

        // This cell is the designated broken wall AND the path animation has reached it.
        if (isBrokenWall && isPath) {
            return 'bg-red-500 animate-pulse';
        }
        
        // This is a regular path cell.
        if (isPath) {
            return 'bg-amber-400';
        }
        
        // This is a wall that is not on the path (or the broken wall before the path reaches it).
        if (value === 1) {
            return 'bg-stone-700';
        }
        
        if (isVisited) {
            return 'bg-cyan-300/70';
        }
        
        return 'bg-emerald-100/50';
    };

    const getTransition = () => {
        if (isPath) return 'transition-colors duration-300 delay-150';
        if (isVisited) return 'transition-colors duration-300';
        return '';
    };

    return (
        <button
            onClick={onClick}
            disabled={isAnimating || isStart || isEnd}
            className={`w-full h-full flex items-center justify-center border border-emerald-200/50 rounded-sm ${getBgColor()} ${getTransition()}`}
            style={{ aspectRatio: '1 / 1' }}
        >
            {isStart && <span className="text-2xl">⭐</span>}
        </button>
    );
};

export default function App() {
    const [rows, setRows] = useState(DEFAULT_ROWS);
    const [cols, setCols] = useState(DEFAULT_COLS);
    const [grid, setGrid] = useState<Grid>(() => createSolvableGrid(DEFAULT_ROWS, DEFAULT_COLS));
    const [path, setPath] = useState<Path>([]);
    const [visitedCells, setVisitedCells] = useState<Path>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Click on a button to find the path!");
    const [stepCount, setStepCount] = useState<number | null>(null);
    const [brokenWallCell, setBrokenWallCell] = useState<Path[0] | null>(null);

    // State for step-by-step animation
    const [fullVisitedOrder, setFullVisitedOrder] = useState<Path>([]);
    const [fullPath, setFullPath] = useState<Path>([]);
    const [animationStep, setAnimationStep] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);

    const totalAnimationSteps = useMemo(() => fullVisitedOrder.length + fullPath.length, [fullVisitedOrder, fullPath]);
    const isAnimationInProgress = useMemo(() => fullVisitedOrder.length > 0, [fullVisitedOrder]);
    const isBusy = isCalculating || (isAnimationInProgress && isAutoPlaying);

    useEffect(() => {
        handleGenerateGrid();
    }, []);

    useEffect(() => {
        // This effect updates the visible path/visited cells based on the animation step
        if (fullVisitedOrder.length === 0) return;

        const visitedCount = fullVisitedOrder.length;
        if (animationStep <= visitedCount) {
            setVisitedCells(fullVisitedOrder.slice(0, animationStep));
            setPath([]);
        } else {
            setVisitedCells(fullVisitedOrder);
            const pathStep = animationStep - visitedCount;
            setPath(fullPath.slice(0, pathStep));
        }
    }, [animationStep, fullVisitedOrder, fullPath]);

     useEffect(() => {
        // This effect handles the auto-play timer
        if (!isAutoPlaying) return;

        if (animationStep >= totalAnimationSteps) {
            setIsAutoPlaying(false);
            return;
        }

        const timer = setTimeout(() => {
            setAnimationStep(prev => prev + 1);
        }, AUTO_PLAY_SPEED);

        return () => clearTimeout(timer);
    }, [isAutoPlaying, animationStep, totalAnimationSteps]);


    const resetAnimationState = () => {
        setPath([]);
        setVisitedCells([]);
        setFullVisitedOrder([]);
        setFullPath([]);
        setAnimationStep(0);
        setIsAutoPlaying(false);
        setStepCount(null);
        setBrokenWallCell(null);
    };

    const handleGenerateGrid = useCallback(() => {
        resetAnimationState();
        setGrid(createSolvableGrid(rows, cols));
        setStatusMessage("A new maze is ready! Click on the grid to add or remove walls.");
    }, [rows, cols]);

    const handleCellClick = useCallback((r: number, c: number) => {
        if (isBusy) return;
        resetAnimationState();
        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = newGrid[r][c] === 0 ? 1 : 0;
        setGrid(newGrid as Grid);
    }, [grid, isBusy]);

    const handleFindPath = useCallback(async (canBreakWall: boolean) => {
        if (isBusy) return;
        
        resetAnimationState();
        setIsCalculating(true);
        setStatusMessage("Elara is charting a course...");

        // Yield to the browser to update the UI before heavy computation
        await new Promise(resolve => setTimeout(resolve, 0));

        const result = findShortestPath(grid, canBreakWall);
        
        setIsCalculating(false);
        setFullVisitedOrder(result.visited);
        setFullPath(result.path);

        if (result.path.length > 0) {
            if (canBreakWall) {
                const brokenWall = result.path.find(([r, c]) => grid[r][c] === 1);
                setBrokenWallCell(brokenWall || null);
            }
            const steps = result.path.length - 1;
            setStepCount(steps);
            setStatusMessage(`We did it! Path found in ${steps} steps!`);
            setIsAutoPlaying(true); // Start playing automatically
        } else {
            setStatusMessage("Oh, no! The path is blocked by ancient magic! NO PATH EXISTS.");
            setStepCount(null);
            // Still show the visited cells for failed attempts
            setIsAutoPlaying(true);
        }
    }, [grid, isBusy]);
    
    const animationProps: AnimationControlsProps = {
        onReset: () => {
            setIsAutoPlaying(false);
            setAnimationStep(0);
        },
        onPrev: () => {
            setIsAutoPlaying(false);
            setAnimationStep(s => Math.max(0, s - 1));
        },
        onNext: () => {
            setIsAutoPlaying(false);
            setAnimationStep(s => Math.min(totalAnimationSteps, s + 1));
        },
        onTogglePlay: () => setIsAutoPlaying(p => !p),
        isPlaying: isAutoPlaying,
        isAtStart: animationStep === 0,
        isAtEnd: animationStep === totalAnimationSteps,
    };

    const pathSet = useMemo(() => new Set(path.map(([r, c]) => `${r},${c}`)), [path]);
    const visitedSet = useMemo(() => new Set(visitedCells.map(([r, c]) => `${r},${c}`)), [visitedCells]);

    return (
        <div className="min-h-screen bg-cover bg-center p-4 sm:p-6 lg:p-8" style={{backgroundImage: "url('https://images.pexels.com/photos/3274903/pexels-photo-3274903.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')"}}>
            <div className="bg-white/30 backdrop-blur-md p-4 rounded-2xl shadow-xl">
                <header className="text-center mb-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-green-900 tracking-tight" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.2)'}}>
                        Elara's Maze Adventure
                    </h1>
                    <p className="text-green-800 mt-2 text-lg">{statusMessage}</p>
                    {stepCount !== null && (
                        <div className="mt-4 p-3 bg-white/50 rounded-lg inline-block shadow-md border border-emerald-200">
                            <p className="text-xl font-bold text-emerald-800">
                                Path Length: <span className="text-2xl text-green-700 font-extrabold">{stepCount} steps</span>
                            </p>
                        </div>
                    )}
                </header>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <Controls
                        rows={rows}
                        setRows={setRows}
                        cols={cols}
                        setCols={setCols}
                        handleGenerate={handleGenerateGrid}
                        handleFindPath={handleFindPath}
                        isBusy={isBusy}
                        hasResult={isAnimationInProgress}
                        animationProps={animationProps}
                    />
                    
                    <div className="flex-1 w-full p-4 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-emerald-200">
                        <div
                            className="grid gap-1 mx-auto"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                                maxWidth: 'calc(100vh - 200px)'
                            }}
                        >
                            {grid.map((row, r) =>
                                row.map((cell, c) => {
                                    const isStart = r === 0 && c === 0;
                                    const isEnd = r === rows - 1 && c === cols - 1;
                                    const isBroken = !!brokenWallCell && brokenWallCell[0] === r && brokenWallCell[1] === c;
                                    return (
                                        <GridCell
                                            key={`${r}-${c}`}
                                            value={cell}
                                            isStart={isStart}
                                            isEnd={isEnd}
                                            isPath={pathSet.has(`${r},${c}`)}
                                            isVisited={visitedSet.has(`${r},${c}`)}
                                            isBrokenWall={isBroken}
                                            isBusy={isBusy}
                                            onClick={() => handleCellClick(r, c)}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
                 <footer className="text-center mt-8 text-sm text-white/80 font-semibold">
                    <p>Built with React, TypeScript, and Tailwind CSS. Let the adventure begin!</p>
                </footer>
            </div>
        </div>
    );
}