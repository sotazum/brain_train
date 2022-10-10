'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;

const server = express()
    .use(express.static('public'))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });
let clients = new Set();

const WAIT = 2; // 待ち時間
const LIMIT = 10; // Time limit
const COUNT_DOWN = 4;
let numKanji; // 数字か漢数字か
let numId; // 今どの数字見てるか
let colorId; // 今何色か
let quizIdx = 0; // 今何問目か
let acceptInput = false;
let newGame = true;
let timeoutId;
let points = [];

const numLen = 10;
const colorLen = 6;
const numList = ['0','1','2','3','4','5','6','7','8','9'];
const kanjiList = ['零','一','二','三','四','五','六','七','八','九'];
const yomiList = ['rei','ichi','ni','san','yon','go','roku','nana','hachi','kyuu'];
const colorList = ['red','blue','yellow','green','black','purple'];

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', message => {
        let ms = JSON.parse(message);
        console.log(ms);
        switch (ms.message) {
            case 'first connection':
                if (clients.size == 0) {
                    points = [];
                    ws.id = 0;
                } else {
                    ws.id = Math.max(...clients) + 1;
                }
                clients.add(ws.id);
                points.push(0);
                wss.clients.forEach(ws => {
                ws.send(JSON.stringify({ message: 'press key', points: points, myId:ws.id}));
                });
                break;
            case 'answer':
                checkAnswer(ms.input, ws.id);
                break;
            case 'key':
                if (newGame) {
                    gameStart(ms.key, ws.id);
                }
                break;
        }
    });
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws.id)
    });
});


function gameStart(key, id) {
    if (key === 'Enter' && id === Math.min(...clients)) {
        newGame = false;
        sendAll({ message: 'game start' });
        setTimeout(() => {
            newQuiz(0);
        }, COUNT_DOWN * 1000);
    }
}

function checkAnswer(input, id) {
    if (numKanji == 0 && input === colorList[colorId]) {
        clearTimeout(timeoutId);
        wss.clients.forEach(ws => {
            if (ws.id == id) {
                points[ws.id]++;
                ws.send(JSON.stringify({ message: 'correct answer', points: points}));
            } else {
                ws.send(JSON.stringify({ message: 'failed', points: points }));
            }
        });
        quizIdx += 1;
        newQuiz(WAIT); // 出題
    }
    if (numKanji == 1 && input === yomiList[numId]) {
        clearTimeout(timeoutId);
        wss.clients.forEach(ws => {
            if (ws.id == id) {
                points[ws.id]++;
                ws.send(JSON.stringify({ message: 'correct answer', points: points}));
            } else {
                ws.send(JSON.stringify({ message: 'failed', points: points }));
            }
        });
        quizIdx += 1;
        newQuiz(WAIT); // 出題
    }
}


// [0, mx)のランダムな整数を返す
function randint(mx) {
    return Math.floor(Math.random() * mx);
}


function newQuiz(wait) {
    numId = randint(numLen);
    numKanji = randint(2);
    colorId =  randint(colorLen);
    setTimeout(() => {
        sendAll({ message: 'clear' });
        if (colorList[colorId] && numKanji == 0) {
            sendAll({
                message: 'quiz',
                numId: numId,
                color: colorList[colorId],
                answer: colorList[colorId],
                quizIdx: quizIdx
            });
            if (quizIdx < 10) {
            timeoutId = setTimeout(() => {
                sendAll({ message: 'failed', points: points });
                newQuiz(wait);
            }, LIMIT * 1000);}else{
                quizIdx = 0;
                newGame = true;
                points = [];
                clients = new Set();
            }
        } else if (yomiList[numId] && numKanji == 1){
            sendAll({
                message: 'quiz',
                numId: kanjiList[numId],
                color: colorList[colorId],
                answer: yomiList[numId],
                quizIdx: quizIdx
            });
            if (quizIdx < 10) {
                timeoutId = setTimeout(() => {
                    sendAll({ message: 'failed', points: points });
                    newQuiz(wait);
                }, LIMIT * 1000);}else{
                    quizIdx = 0;
                    newGame = true;
                    points = [];
                    clients = new Set();
                }
        }
    }, wait * 1000);
}

function sendAll(message) {
    wss.clients.forEach(ws => {
        ws.send(JSON.stringify(message));
    });
}
