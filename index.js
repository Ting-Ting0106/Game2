/**
 * index.js - 主邏輯 (V14.4)
 */

import { GameConnection } from './connection.js';
import { GameState } from './gameState.js';
import { Board } from './board.js';
import { SkillSystem } from './skills.js';
import { AIPlayer } from './ai.js';
import { GameUI } from './ui.js';
import { DIRECTIONS, GAME_CONFIG } from './config.js';

class Game
{
    constructor()
    {
        this.connection = new GameConnection();
        this.gameState = new GameState();
        this.board = new Board();
        this.skillSystem = new SkillSystem(this.board);
        this.aiPlayer = new AIPlayer(this.board);
        this.ui = new GameUI();

        this.isAI = false;
        this.myRole = 'PLAYER';
        this.timer = null;
        this.currentTimer = 0;

        this.setupListeners();
    }

    setupListeners()
    {
        window.showPVP = () => { this.ui.showPVPSetup(); this.connection.initPeer(); };
        window.startAI = () => { this.isAI = true; this.startGame(); };
        window.connectToFriend = () =>
        {
            const id = this.ui.getInputPeerId();
            this.connection.connectToFriend(id).then(() => this.startGame());
        };

        window.copyID = () =>
        {
            const id = document.getElementById('my-id').innerText;
            if (id && id !== '生成中...')
            {
                navigator.clipboard.writeText(id);
                this.ui.showMessage('代碼已複製');
            }
        };

        window.rematch = () => this.handleRematch();
        window.goBackToLobby = () => location.reload();

        this.ui.on('onCellClick', (r, c) => this.handleMove(r, c));
        this.connection.on('onConnected', (id) => this.ui.setMyId(id));
        this.connection.on('onData', (d) => this.handleRemoteData(d));
    }

    startGame()
    {
        this.myRole = this.connection.myRole;
        this.ui.hideWin();
        this.ui.hideLobby();
        this.ui.initBoard();
        this.ui.updateRoleIndicator(this.myRole);
        this.prepareTurn();
    }

    handleRematch()
    {
        if (!this.isAI)
        {
            this.connection.send({ type: 'REMATCH' });
        }
        this.resetAndRestart();
    }

    resetAndRestart()
    {
        this.stopTimer();
        this.board.reset();
        this.gameState.reset();
        this.ui.hideWin();
        this.ui.initBoard();
        this.ui.render(this.board);
        this.prepareTurn();
    }

    async prepareTurn()
    {
        if (this.gameState.isOver) return;

        this.gameState.isProcessing = false;
        const isMyTurn = (this.gameState.turn === this.myRole);
        this.ui.updateTurnIndicator(this.gameState.turn, isMyTurn);

        if (isMyTurn || (this.isAI && this.gameState.turn === 'AI'))
        {
            this.gameState.generateRandomHand(DIRECTIONS);
            this.ui.updateCard(this.gameState.hand, this.gameState.handDir, this.gameState.turn);

            if (!this.isAI && isMyTurn)
            {
                this.connection.send({ type: 'SYNC', hand: this.gameState.hand, dir: this.gameState.handDir });
            }
        }

        if (isMyTurn) this.startTimer();

        if (this.isAI && this.gameState.turn === 'AI')
        {
            this.gameState.isProcessing = true;
            await new Promise(r => setTimeout(r, 1000));
            const move = this.aiPlayer.chooseAction(this.gameState.hand, this.gameState.handDir, 'AI');
            this.executeMove(move.r, move.c, 'AI');
        }
    }

    startTimer()
    {
        this.stopTimer();
        this.currentTimer = GAME_CONFIG.TURN_TIME_LIMIT;
        this.ui.updateTimer(this.currentTimer);
        this.timer = setInterval(() =>
        {
            this.currentTimer--;
            this.ui.updateTimer(this.currentTimer);
            if (this.currentTimer <= 0)
            {
                this.stopTimer();
                this.handleTimeout();
            }
        }, 1000);
    }

    stopTimer()
    {
        clearInterval(this.timer);
        this.timer = null;
    }

    handleMove(r, c)
    {
        if (this.gameState.isOver || this.gameState.isProcessing) return;
        if (this.gameState.turn !== this.myRole) return;
        if (this.currentTimer <= 0)
        {
            this.ui.showMessage("⚠️ 時間已到！由 AI 代下", true);
            return;
        }
        if (this.board.hasPiece(r, c)) return;

        this.gameState.isProcessing = true;
        this.executeMove(r, c, this.myRole);
    }

    async handleTimeout()
    {
        if (this.gameState.isProcessing || this.gameState.isOver) return;
        this.gameState.isProcessing = true;
        this.ui.showMessage("⏰ 時間超時！由 AI 代打", true);
        await new Promise(r => setTimeout(r, 500));
        const move = this.aiPlayer.chooseAction(this.gameState.hand, this.gameState.handDir, this.myRole);
        this.executeMove(move.r, move.c, this.myRole);
    }

    async executeMove(r, c, p)
    {
        this.stopTimer();

        if (p === this.myRole && !this.isAI)
        {
            this.connection.send({ type: 'MOVE', r, c, hand: this.gameState.hand, dir: this.gameState.handDir });
        }

        this.board.placePiece(r, c, { p, type: this.gameState.hand, knightDir: this.gameState.handDir });
        this.ui.render(this.board);

        await new Promise(r => setTimeout(r, 300));
        while (await this.skillSystem.checkAndTriggerSkills(m => this.ui.showMessage(m)))
        {
            this.ui.render(this.board);
            await new Promise(r => setTimeout(r, 300));
        }

        if (this.board.checkWin(p))
        {
            this.gameState.isOver = true;
            this.ui.showWin(p === this.myRole);
            return;
        }

        this.gameState.changeTurn();
        this.prepareTurn();
    }

    handleRemoteData(d)
    {
        if (d.type === 'REMATCH')
        {
            this.ui.showMessage("小方發起了重新對戰");
            this.resetAndRestart();
            return;
        }

        if (this.gameState.isOver) return;

        if (d.type === 'SYNC')
        {
            this.gameState.hand = d.hand;
            this.gameState.handDir = d.dir;
            this.ui.updateCard(d.hand, d.dir, this.gameState.turn);
        } else if (d.type === 'MOVE')
        {
            this.gameState.isProcessing = true;
            this.gameState.hand = d.hand;
            this.gameState.handDir = d.dir;
            this.executeMove(d.r, d.c, this.gameState.turn);
        }
    }
}

new Game();