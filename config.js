/**
 * config.js - 全局配置
 */

export const GAME_CONFIG = {
    BOARD_SIZE: 10,
    WIN_COUNT: 5,
    ANIMATION_DELAY: 400,
    TURN_TIME_LIMIT: 5, // 5秒思考時間
};

export const PIECE_DATA = {
    LORD: { icon: '🏰', class: 'lord' },
    KNIGHT: { icon: '🐎', class: 'knight' },
    MAGE: { icon: '🧙', class: 'mage' },
};

// 使用更明確的箭頭符號
export const DIRECTIONS = [
    { dr: -1, dc: 0, icon: '⬆️', name: 'up' },
    { dr: 1, dc: 0, icon: '⬇️', name: 'down' },
    { dr: 0, dc: -1, icon: '⬅️', name: 'left' },
    { dr: 0, dc: 1, icon: '➡️', name: 'right' },
];

export const PEER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
        ]
    }
};