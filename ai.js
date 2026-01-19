/**
 * ai.js - 強化版 AI 玩家邏輯 (V2.1 - 威脅優先權優化)
 */

import { GAME_CONFIG } from './config.js';

export class AIPlayer
{
    constructor(board)
    {
        this.board = board;
        this.SIZE = GAME_CONFIG.BOARD_SIZE;
    }

    chooseAction(hand, handDir, aiRole)
    {
        const opponentRole = aiRole === 'AI' ? 'PLAYER' : 'AI';
        let bestScore = -Infinity;
        let bestMoves = [];

        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (this.board.hasPiece(r, c)) continue;

                let score = this.evaluateHypotheticalMove(r, c, hand, handDir, aiRole, opponentRole);

                // 1. 基礎中心加權
                const distToCenter = Math.abs(r - 4.5) + Math.abs(c - 4.5);
                score += (this.SIZE - distToCenter) * 2;

                // 2. 鄰近性加權 (維持緊湊)
                score += this.getProximityScore(r, c);

                score += Math.random() * 5;

                if (score > bestScore)
                {
                    bestScore = score;
                    bestMoves = [{ r, c }];
                } else if (score === bestScore)
                {
                    bestMoves.push({ r, c });
                }
            }
        }
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    getProximityScore(r, c)
    {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++)
        {
            for (let dc = -1; dc <= 1; dc++)
            {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (this.isIn(nr, nc) && this.board.hasPiece(nr, nc))
                {
                    count += 10;
                }
            }
        }
        return count;
    }

    evaluateHypotheticalMove(r, c, hand, handDir, me, opp)
    {
        const virtualGrid = this.cloneGrid(this.board.grid);
        virtualGrid[r][c] = { p: me, type: hand, knightDir: handDir };

        this.simulateSkills(virtualGrid, me);

        // --- 核心勝負判斷 ---
        // 1. 如果我這步下完直接贏了，最高分
        if (this.checkWinInGrid(virtualGrid, me)) return 2000000;

        // 2. 如果我這步下完，對手下一手必贏（例如我沒擋住他的活四或死四），給予極大負分
        // 這解決了你提到的：AI 顧著連自己的 3 變 4，卻不擋對方的 4
        if (this.checkOpponentCanWinNext(virtualGrid, opp)) return -1000000;

        let totalScore = 0;
        totalScore += this.evaluateGrid(virtualGrid, me, opp);

        if (hand === 'MAGE')
        {
            const convertedCount = this.countConvertedLords(this.board.grid, virtualGrid, me);
            totalScore += convertedCount * 1500;
        }

        if (hand === 'KNIGHT')
        {
            const removedCount = this.countRemovedLords(this.board.grid, virtualGrid, opp);
            totalScore += removedCount * 1000;
        }

        return totalScore;
    }

    // 新增：檢查在當前狀態下，對手是否下一手就能贏 (針對問題 1)
    checkOpponentCanWinNext(grid, opp)
    {
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (grid[r][c]) continue;
                // 模擬對手放一個城堡在任何空位
                const tempGrid = this.cloneGrid(grid);
                tempGrid[r][c] = { p: opp, type: 'LORD', knightDir: null };
                if (this.checkWinInGrid(tempGrid, opp)) return true;
            }
        }
        return false;
    }

    simulateSkills(grid, currentMover)
    {
        let changed = true;
        let limit = 10;
        while (changed && limit-- > 0)
        {
            changed = false;
            for (let r = 0; r < this.SIZE; r++)
            {
                for (let c = 0; c < this.SIZE; c++)
                {
                    const p = grid[r][c];
                    if (!p) continue;
                    if (p.type === 'KNIGHT' && p.knightDir)
                    {
                        const tr = r + p.knightDir.dr, tc = c + p.knightDir.dc;
                        if (this.isIn(tr, tc) && grid[tr][tc] && grid[tr][tc].p !== p.p)
                        {
                            grid[tr][tc] = null;
                            grid[r][c] = null;
                            changed = true;
                        }
                    }
                    if (p.type === 'MAGE')
                    {
                        for (const [dr, dc] of [[0, -1], [0, 1]])
                        {
                            const tr = r + dr, tc = c + dc;
                            if (this.isIn(tr, tc) && grid[tr][tc] && grid[tr][tc].p !== p.p)
                            {
                                grid[tr][tc].p = p.p;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
    }

    evaluateGrid(grid, me, opp)
    {
        let score = 0;
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const p = grid[r][c];
                if (p && p.type === 'LORD')
                {
                    const val = this.evaluatePoint(grid, r, c, p.p);
                    // 防禦乘數：對方的連線威脅權重提高至 12 倍，確保「擋人」大於「自連」
                    score += (p.p === me) ? val : -val * 12.0;
                }
            }
        }
        return score;
    }

    evaluatePoint(grid, r, c, player)
    {
        const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        let score = 0;
        for (const [dr, dc] of dirs)
        {
            let count = 1;
            let blocked = 0;

            for (const sig of [1, -1])
            {
                for (let i = 1; i < 5; i++)
                {
                    const nr = r + dr * i * sig, nc = c + dc * i * sig;
                    if (this.isIn(nr, nc))
                    {
                        const p = grid[nr][nc];
                        if (p?.p === player && p?.type === 'LORD') count++;
                        else if (p) { blocked++; break; }
                        else break;
                    } else { blocked++; break; }
                }
            }

            // --- 重新定義連線分佈 ---
            if (count >= 5) score += 100000;
            else if (count === 4)
            {
                if (blocked === 0) score += 10000; // 活四：必勝
                else if (blocked === 1) score += 5000; // 死四：需要立刻擋
            }
            else if (count === 3)
            {
                if (blocked === 0) score += 1000; // 活三
                else if (blocked === 1) score += 200;
            }
            else if (count === 2)
            {
                if (blocked === 0) score += 100;
            }
        }
        return score;
    }

    isIn(r, c) { return r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE; }
    cloneGrid(grid) { return grid.map(row => row.map(cell => cell ? { ...cell } : null)); }

    countConvertedLords(oldGrid, newGrid, me)
    {
        let count = 0;
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (oldGrid[r][c]?.type === 'LORD' && oldGrid[r][c]?.p !== me && newGrid[r][c]?.p === me) count++;
            }
        }
        return count;
    }

    countRemovedLords(oldGrid, newGrid, opp)
    {
        let count = 0;
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (oldGrid[r][c]?.type === 'LORD' && oldGrid[r][c]?.p === opp && !newGrid[r][c]) count++;
            }
        }
        return count;
    }

    checkWinInGrid(grid, player)
    {
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const p = grid[r][c];
                if (p?.p === player && p?.type === 'LORD' && this.checkFiveInGrid(grid, r, c, player)) return true;
            }
        }
        return false;
    }

    checkFiveInGrid(grid, r, c, player)
    {
        const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        return dirs.some(([dr, dc]) =>
        {
            let count = 1;
            for (let sig of [1, -1])
            {
                for (let i = 1; i < 5; i++)
                {
                    const nr = r + dr * i * sig, nc = c + dc * i * sig;
                    const p = this.isIn(nr, nc) ? grid[nr][nc] : null;
                    if (p?.p === player && p?.type === 'LORD') count++;
                    else break;
                }
            }
            return count >= 5;
        });
    }
}