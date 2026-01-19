/**
 * skills.js - 技能邏輯
 */

import { GAME_CONFIG } from './config.js';

export class SkillSystem
{
    constructor(board)
    {
        this.board = board;
        this.SIZE = GAME_CONFIG.BOARD_SIZE;
    }

    async checkAndTriggerSkills(onMessage)
    {
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const piece = this.board.getPiece(r, c);

                if (!piece) continue;

                if (piece.type === 'KNIGHT' && piece.knightDir)
                {
                    if (await this.triggerKnightCharge(r, c, piece, onMessage))
                    {
                        return true;
                    }
                }

                if (piece.type === 'MAGE')
                {
                    if (await this.triggerMageConvert(r, c, piece, onMessage))
                    {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    async triggerKnightCharge(r, c, piece, onMessage)
    {
        const tr = r + piece.knightDir.dr;
        const tc = c + piece.knightDir.dc;

        if (tr >= 0 && tr < this.SIZE && tc >= 0 && tc < this.SIZE)
        {
            const target = this.board.getPiece(tr, tc);

            if (target && target.p !== piece.p)
            {
                if (onMessage)
                {
                    await onMessage('騎士衝鋒！');
                }
                this.board.removePiece(tr, tc);
                this.board.removePiece(r, c);
                return true;
            }
        }
        return false;
    }

    async triggerMageConvert(r, c, piece, onMessage)
    {
        const targets = [];

        for (const [dr, dc] of [[0, -1], [0, 1]])
        {
            const tr = r + dr;
            const tc = c + dc;

            if (tr >= 0 && tr < this.SIZE && tc >= 0 && tc < this.SIZE)
            {
                const target = this.board.getPiece(tr, tc);
                if (target && target.p !== piece.p)
                {
                    targets.push({ tr, tc });
                }
            }
        }

        if (targets.length > 0)
        {
            if (onMessage)
            {
                await onMessage('法術洗腦！');
            }

            targets.forEach(t =>
            {
                const target = this.board.getPiece(t.tr, t.tc);
                target.p = piece.p;
                target.isConverted = true;
            });

            this.board.removePiece(r, c);
            return true;
        }
        return false;
    }
}