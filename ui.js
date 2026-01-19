/**
 * ui.js - UI 管理與渲染
 */

import { GAME_CONFIG, PIECE_DATA } from './config.js';

export class GameUI
{
    constructor() { this.SIZE = GAME_CONFIG.BOARD_SIZE; this.listeners = {}; }
    on(event, callback) { this.listeners[event] = callback; }

    initBoard()
    {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = `repeat(${this.SIZE}, 1fr)`;
        boardEl.style.gridTemplateRows = `repeat(${this.SIZE}, 1fr)`;

        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.onclick = () => this.listeners['onCellClick']?.(r, c);
                boardEl.appendChild(cell);
            }
        }
    }

    render(board)
    {
        const cells = document.querySelectorAll('.cell');
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const cell = cells[r * this.SIZE + c];
                cell.innerHTML = '';
                const p = board.getPiece(r, c);
                if (p)
                {
                    const el = document.createElement('div');
                    el.className = `piece ${PIECE_DATA[p.type].class} ${p.p.toLowerCase()}`;
                    el.innerHTML = `<span>${PIECE_DATA[p.type].icon}</span>`;
                    if (p.knightDir)
                    {
                        const dir = document.createElement('div');
                        dir.className = 'dir-hint';
                        dir.innerText = p.knightDir.icon;
                        el.appendChild(dir);
                    }
                    cell.appendChild(el);
                }
            }
        }
    }

    updateRoleIndicator(role)
    {
        const tag = document.getElementById('my-role-tag');
        tag.style.display = 'block';
        if (role === 'PLAYER')
        {
            tag.innerText = "你的陣營：藍方 (先手)";
            tag.className = 'tag-blue';
        } else
        {
            tag.innerText = "你的陣營：紅方 (後手)";
            tag.className = 'tag-red';
        }
    }

    updateCard(hand, handDir, currentTurn)
    {
        const cardEl = document.getElementById('game-card');
        const iconEl = document.getElementById('res-icon');
        const dirEl = document.getElementById('res-dir');
        iconEl.innerText = PIECE_DATA[hand].icon;
        dirEl.innerText = handDir ? handDir.icon : (hand === 'MAGE' ? '✨' : '');

        cardEl.classList.remove('glow-p1', 'glow-p2');
        if (currentTurn === 'PLAYER') cardEl.classList.add('glow-p1');
        else cardEl.classList.add('glow-p2');
    }

    updateTimer(s) { document.getElementById('timer-display').innerText = s > 0 ? `⏱ 剩餘時間: ${s}s` : ""; }

    updateTurnIndicator(turn, isMyTurn)
    {
        const el = document.getElementById('turn-indicator');
        el.innerText = isMyTurn ? "● 你的回合" : "○ 等待小手...";
        el.className = turn === 'PLAYER' ? 'turn-my' : 'turn-opp';
    }

    setMyId(id) { document.getElementById('my-id').innerText = id; }
    hideLobby() { document.getElementById('lobby-overlay').style.display = 'none'; }
    showLobby() { document.getElementById('lobby-overlay').style.display = 'flex'; }
    showPVPSetup() { document.getElementById('pvp-setup').style.display = 'block'; }
    getInputPeerId() { return document.getElementById('peer-id-input').value.trim().toUpperCase(); }

    // ✨ 新增：顯示勝負提示框
    showWin(isMe)
    {
        const modal = document.getElementById('win-modal');
        const title = document.getElementById('win-title');
        const desc = document.getElementById('win-desc');

        if (isMe)
        {
            title.innerText = "✨ 你贏了！✨";
            title.style.color = "var(--p1)";
            desc.innerText = "領地成功守護！";
        } else
        {
            title.innerText = "💀 你輸了... 💀";
            title.style.color = "var(--p2)";
            desc.innerText = "領地已失守...";
        }

        modal.classList.add('show');
    }

    // ✨ 新增：隱藏勝負提示框
    hideWin()
    {
        document.getElementById('win-modal').classList.remove('show');
    }

    async showMessage(message, isWarning = false)
    {
        const msgPop = document.getElementById('msg-pop');
        msgPop.innerText = message;

        if (isWarning)
        {
            msgPop.style.borderColor = "#ff4757";
            msgPop.style.color = "#ff4757";
        } else
        {
            msgPop.style.borderColor = "rgba(255,235,59,0.3)";
            msgPop.style.color = "var(--accent)";
        }

        msgPop.style.opacity = '1';

        await new Promise(res => setTimeout(() =>
        {
            msgPop.style.opacity = '0';
            res();
        }, 800));
    }
}