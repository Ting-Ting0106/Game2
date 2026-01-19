/**
 * board.js - 棋盤與移動管理
 */

import { GAME_CONFIG } from './config.js';

export class Board
{
    constructor()
    {
        this.SIZE = GAME_CONFIG.BOARD_SIZE;
        this.grid = [];
        this.initBoard();
    }

    initBoard()
    {
        this.grid = Array(this.SIZE)
            .fill(null)
            .map(() => Array(this.SIZE).fill(null));
    }

    hasPiece(r, c)
    {
        return r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE && this.grid[r][c];
    }

    placePiece(r, c, piece)
    {
        if (!this.hasPiece(r, c))
        {
            this.grid[r][c] = piece;
            return true;
        }
        return false;
    }

    removePiece(r, c)
    {
        this.grid[r][c] = null;
    }

    getPiece(r, c)
    {
        if (r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE)
        {
            return this.grid[r][c];
        }
        return null;
    }

    checkFive(r, c, player)
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
                    const p = this.getPiece(nr, nc);

                    if (p && p.p === player && p.type === 'LORD')
                    {
                        count++;
                    } else
                    {
                        break;
                    }
                }
            }

            return count >= GAME_CONFIG.WIN_COUNT;
        });
    }

    checkWin(player)
    {
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const p = this.getPiece(r, c);
                if (p && p.p === player && p.type === 'LORD' && this.checkFive(r, c, player))
                {
                    return true;
                }
            }
        }
        return false;
    }

    getEmptyPositions()
    {
        const empty = [];
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (!this.hasPiece(r, c))
                {
                    empty.push({ r, c });
                }
            }
        }
        return empty;
    }

    reset()
    {
        this.initBoard();
    }
}