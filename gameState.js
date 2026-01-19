/**
 * gameState.js - 遊戲狀態管理
 * 追蹤當前回合、手牌、勝負狀態
 */

export class GameState
{
    constructor()
    {
        this.turn = 'PLAYER';
        this.hand = 'LORD';
        this.handDir = null;
        this.isOver = false;
        this.isProcessing = false;
        this.lastPos = null;
    }

    changeTurn()
    {
        this.turn = this.turn === 'PLAYER' ? 'AI' : 'PLAYER';
    }

    setHand(hand, dir = null)
    {
        this.hand = hand;
        this.handDir = dir;
    }

    generateRandomHand(dirs)
    {
        const r = Math.random() * 100;
        if (r < 15)
        {
            this.hand = 'MAGE';
            this.handDir = null;
        } else if (r < 35)
        {
            this.hand = 'KNIGHT';
            this.handDir = dirs[Math.floor(Math.random() * dirs.length)];
        } else
        {
            this.hand = 'LORD';
            this.handDir = null;
        }
    }

    reset()
    {
        this.turn = 'PLAYER';
        this.hand = 'LORD';
        this.handDir = null;
        this.isOver = false;
        this.isProcessing = false;
        this.lastPos = null;
    }
}