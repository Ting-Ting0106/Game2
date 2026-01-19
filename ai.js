/**
 * ai.js - 強化版 AI 玩家邏輯 (V3.0 - 深度優化)
 * 
 * 主要改進：
 * 1. 騎士不會下在自己有棋子的地方
 * 2. 法師優先權大幅提升，提前結束遊戲
 * 3. 防守優先權更高（12倍強化）
 * 4. 棋盤邊界搜索優化
 * 5. 連線評估更精準
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

                // 基礎中心加權
                const distToCenter = Math.abs(r - 4.5) + Math.abs(c - 4.5);
                score += (this.SIZE - distToCenter) * 2;

                // 鄰近性加權 (維持緊湊)
                score += this.getProximityScore(r, c);

                // 隨機因子避免重複
                score += Math.random() * 3;

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

        return bestMoves.length > 0
            ? bestMoves[Math.floor(Math.random() * bestMoves.length)]
            : { r: 5, c: 5 }; // 防守性預設
    }

    getProximityScore(r, c)
    {
        let count = 0;
        for (let dr = -2; dr <= 2; dr++)
        {
            for (let dc = -2; dc <= 2; dc++)
            {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (this.isIn(nr, nc) && this.board.hasPiece(nr, nc))
                {
                    // 距離越近分數越高
                    const dist = Math.abs(dr) + Math.abs(dc);
                    count += (3 - dist) * 15;
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

        // ==================== 評分邏輯 (優先級由高到低) ====================

        // 1️⃣ 最高優先：我這步直接贏了
        if (this.checkWinInGrid(virtualGrid, me)) 
        {
            return 5000000;
        }

        // 2️⃣ 次高優先：對手下一步會贏，必須阻擋
        if (this.checkOpponentCanWinNext(virtualGrid, opp)) 
        {
            return 4000000;
        }

        // 3️⃣ 法師優先級大幅提升（可能產生連鎖贏局）
        if (hand === 'MAGE')
        {
            const mageScore = this.evaluateMageMove(virtualGrid, me, opp, r, c);
            if (mageScore > 500000) // 法師能轉化關鍵位置
            {
                return mageScore + 2000000;
            }
        }

        // 4️⃣ 騎士優先級次之（消滅對手棋子）
        if (hand === 'KNIGHT' && handDir)
        {
            const knightScore = this.evaluateKnightMove(virtualGrid, me, opp, r, c, handDir);
            if (knightScore > 400000) // 騎士能擊殺關鍵棋子
            {
                return knightScore + 1500000;
            }
        }

        // 5️⃣ 標準評估（LORD）
        let totalScore = 0;
        totalScore += this.evaluateGrid(virtualGrid, me, opp) * 2; // 加權兩倍

        // 6️⃣ 法師轉化加分
        if (hand === 'MAGE')
        {
            const convertedCount = this.countConvertedLords(this.board.grid, virtualGrid, me);
            totalScore += convertedCount * 2500; // 提升轉化獎勵
        }

        // 7️⃣ 騎士殺傷加分
        if (hand === 'KNIGHT')
        {
            const removedCount = this.countRemovedLords(this.board.grid, virtualGrid, opp);
            totalScore += removedCount * 2000; // 提升殺傷獎勵
        }

        return totalScore;
    }

    /**
     * 評估法師移動的威力
     * 檢查轉化後是否能形成強大連線或直接勝利
     */
    evaluateMageMove(grid, me, opp, r, c, handDir)
    {
        let score = 0;

        // 檢查左右兩側會被轉化的棋子
        for (const [dr, dc] of [[0, -1], [0, 1]])
        {
            const tr = r + dr, tc = c + dc;
            if (!this.isIn(tr, tc)) continue;

            const target = grid[tr][tc];
            if (!target || target.p === me) continue;

            // 該敵方棋子被轉化後的威力評估
            if (target.type === 'LORD')
            {
                const convertedValue = this.evaluatePoint(grid, tr, tc, me);
                score += convertedValue;
            }
        }

        return score;
    }

    /**
     * 評估騎士移動的威力
     * 檢查能否消滅對手的關鍵棋子
     */
    evaluateKnightMove(grid, me, opp, r, c, handDir)
    {
        const tr = r + handDir.dr;
        const tc = c + handDir.dc;

        if (!this.isIn(tr, tc)) return 0;

        const target = grid[tr][tc];
        if (!target || target.p === me) return 0; // ❌ 修復：騎士不會下在自己的棋子上

        if (target.type === 'LORD')
        {
            return this.evaluatePoint(grid, tr, tc, opp) * 10; // 消滅敵方關鍵棋子
        }

        return 500;
    }

    // 檢查對手下一步是否能贏
    checkOpponentCanWinNext(grid, opp)
    {
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (grid[r][c]) continue;
                const tempGrid = this.cloneGrid(grid);
                tempGrid[r][c] = { p: opp, type: 'LORD', knightDir: null };
                if (this.checkWinInGrid(tempGrid, opp)) return true;
            }
        }
        return false;
    }

    // 模擬技能觸發
    simulateSkills(grid, currentMover)
    {
        let changed = true;
        let limit = 15; // 提升迴圈上限，確保所有技能都被觸發

        while (changed && limit-- > 0)
        {
            changed = false;

            for (let r = 0; r < this.SIZE; r++)
            {
                for (let c = 0; c < this.SIZE; c++)
                {
                    const p = grid[r][c];
                    if (!p) continue;

                    // 騎士衝鋒
                    if (p.type === 'KNIGHT' && p.knightDir)
                    {
                        const tr = r + p.knightDir.dr;
                        const tc = c + p.knightDir.dc;

                        if (this.isIn(tr, tc) && grid[tr][tc] && grid[tr][tc].p !== p.p)
                        {
                            grid[tr][tc] = null;
                            grid[r][c] = null;
                            changed = true;
                        }
                    }

                    // 法師轉化
                    if (p.type === 'MAGE')
                    {
                        let converted = false;
                        for (const [dr, dc] of [[0, -1], [0, 1]])
                        {
                            const tr = r + dr;
                            const tc = c + dc;

                            if (this.isIn(tr, tc) && grid[tr][tc] && grid[tr][tc].p !== p.p)
                            {
                                grid[tr][tc].p = p.p;
                                converted = true;
                                changed = true;
                            }
                        }

                        if (converted)
                        {
                            grid[r][c] = null; // 法師轉化後消失
                        }
                    }
                }
            }
        }
    }

    // 評估虛擬棋盤狀態
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

                    if (p.p === me)
                    {
                        score += val; // 我的棋子加分
                    } else
                    {
                        score -= val * 15; // 敵方棋子減分（15倍防守優先級）
                    }
                }
            }
        }

        return score;
    }

    // 評估某個位置的棋力
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
                    const nr = r + dr * i * sig;
                    const nc = c + dc * i * sig;

                    if (this.isIn(nr, nc))
                    {
                        const p = grid[nr][nc];
                        if (p?.p === player && p?.type === 'LORD')
                        {
                            count++;
                        } else if (p)
                        {
                            blocked++;
                            break;
                        } else
                        {
                            break;
                        }
                    } else
                    {
                        blocked++;
                        break;
                    }
                }
            }

            // 連線評分（更精細的梯度）
            if (count >= 5)
            {
                score += 500000; // 必勝
            } else if (count === 4)
            {
                score += (blocked === 0) ? 50000 : 15000; // 活四 > 死四
            } else if (count === 3)
            {
                score += (blocked === 0) ? 5000 : 1000; // 活三 > 死三
            } else if (count === 2)
            {
                score += (blocked === 0) ? 200 : 20;
            }
        }

        return score;
    }

    // 輔助函數
    isIn(r, c)
    {
        return r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE;
    }

    cloneGrid(grid)
    {
        return grid.map(row => row.map(cell => cell ? { ...cell } : null));
    }

    // 統計被轉化的敵方 LORD
    countConvertedLords(oldGrid, newGrid, me)
    {
        let count = 0;
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (oldGrid[r][c]?.type === 'LORD' &&
                    oldGrid[r][c]?.p !== me &&
                    newGrid[r][c]?.p === me)
                {
                    count++;
                }
            }
        }
        return count;
    }

    // 統計被殺傷的敵方 LORD
    countRemovedLords(oldGrid, newGrid, opp)
    {
        let count = 0;
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (oldGrid[r][c]?.type === 'LORD' &&
                    oldGrid[r][c]?.p === opp &&
                    !newGrid[r][c])
                {
                    count++;
                }
            }
        }
        return count;
    }

    // 檢查虛擬棋盤中是否有人贏
    checkWinInGrid(grid, player)
    {
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const p = grid[r][c];
                if (p?.p === player && p?.type === 'LORD' &&
                    this.checkFiveInGrid(grid, r, c, player))
                {
                    return true;
                }
            }
        }
        return false;
    }

    // 在虛擬棋盤中檢查五連
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
                    const nr = r + dr * i * sig;
                    const nc = c + dc * i * sig;

                    const p = this.isIn(nr, nc) ? grid[nr][nc] : null;

                    if (p?.p === player && p?.type === 'LORD')
                    {
                        count++;
                    } else
                    {
                        break;
                    }
                }
            }

            return count >= 5;
        });
    }
}