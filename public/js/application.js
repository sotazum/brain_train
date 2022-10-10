window.onload = function () {

    let accept_input = false;

    const State = Object.freeze({
        WaitingForStart: 0,
        Waiting: 1,
        Quiz: 4
    });

    let currentState = State.Waiting;
    
    const myId = document.getElementById('me');
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const text1 = document.getElementById('text1');
    const text2 = document.getElementById('text2');
    const text3 = document.getElementById('text3');
    const text4 = document.getElementById('text4');
    const user = document.getElementById('user');

    function setText(t1, t2, t3, t4) {
        text1.innerHTML = t1;
        text2.innerHTML = t2;
        text3.innerHTML = t3;
        text4.innerHTML = t4;
    }


    function displayUsers(points) {
        let userElement = document.createElement('div');
        userElement.setAttribute("id","users");
        for (let i = 0; i < points.length; i++ ) {
            let userSpanElement = document.createElement('span');
            let pointSpanElement = document.createElement('span');
            userSpanElement.setAttribute("id","user"+i);
            pointSpanElement.setAttribute("id","point"+i);
            userSpanElement.textContent = 'User' + i + ': ';
            pointSpanElement.textContent = points[i] + '点   ';
            userSpanElement.style.paddingLeft = '20px';
            userElement.appendChild(userSpanElement);
            userElement.appendChild(pointSpanElement);
        }
        user.appendChild(userElement);
    }

    function destroyUsers() {
        let users = document.getElementById('users');
        if (users) {
        users.remove();
        }
    }

    function displayPoints(points) {
        for (let i = 0; i < points.length; i++ ) {
            let point = document.getElementById('point' + i);
            point.textContent = points[i] + '点';
        }
    }

    function displayMe(id) {
        myId.innerHTML = 'あなたはUser' + id;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        submit();
    })

    let answer;

    function submit() {
        let inputText = input.value;

        switch (currentState) {
            case State.Quiz:
                if (inputText == answer)
                    box.send(JSON.stringify({
                        message: 'answer',
                        input: inputText
                    }));
                break;
        }
    }

    function setInputActive(active) {
        input.disabled = !active;
        if (active) {
            input.focus();
        }
        else {
            input.blur();
            input.value = '';
        }
    }

    const box = new ReconnectingWebSocket(location.protocol.replace("http", "ws") + "//" + location.host + "/ws");

    let server_connection = false;

    window.addEventListener('keydown', onKeyDown);

    box.onmessage = (message) => {
        let data = JSON.parse(message.data);
        console.log(data);
        switch (data.message) {
            case 'press key':
                currentState = State.WaitingForStart;
                setText('User0がEnterを押してスタート', '', '', '');
                displayMe(data.myId);
                destroyUsers();
                displayUsers(data.points);
                displayPoints(data.points);
                setInputActive(false);
                break;

            case 'game start': // ゲーム開始（1度のみ）
                currentState = State.Waiting;
                gameStart();
                setInputActive(false);
                break;

            case 'quiz':
                currentState = State.Quiz;
                displayNum(data.numId, data.color, data.quizIdx);
                answer = data.answer;
                setInputActive(true);
                break;

            case 'correct answer':
                setInputActive(false);
                setText('正解', '', '', '');
                destroyUsers();
                displayUsers(data.points);
                displayPoints(data.points);
                break;

            case 'failed':
                setInputActive(false);
                setText('時間切れ', '', '', '');
                destroyUsers();
                displayUsers(data.points);
                displayPoints(data.points);
                break;

            case 'clear':
                setText('', '', '', '');
                deleteNum();
                break;
        }
    };

    box.onclose = () => {
        console.log('box closed');
        server_connection = false;
        this.box = new ReconnectingWebSocket(box.url);
    };

    box.onopen = () => {
        console.log('connected to server');
        server_connection = true;
        box.send(JSON.stringify({
            message: 'first connection'
        }));
    };


    function displayNum(numId, color, quizIdx) {
        text4.style.display = 'block';
        text4.style.margin = '20px';
        text4.style.fontSize = '196px';
        if (quizIdx>=10){
            setText('10問終わりました', '', '', '終了！');
            points = [];
        } else {
        text4.style.color = color;
        setText('答えを入力', '', '', String(numId));
        }
    }

    function gameStart() {
        let cnt = 3;// カウントダウン
        const intervalId = setInterval(() => {
            setText(cnt, '', '', '');
            cnt--;
            if (cnt < 0) clearInterval(intervalId);
        }, 1000);
    }

    function deleteNum() {
        text4.style.display = 'none';
    }

    function onKeyDown(event) {
        switch (currentState) {
            case State.WaitingForStart:
                if (event.key == 'Enter') {
                    box.send(JSON.stringify({
                        message: 'key',
                        key: 'Enter'
                    }));
                }
                break;
        }
    }

};