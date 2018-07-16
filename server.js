const express = require('express')
const http = require('http')
const socketIO = require('socket.io')

// Используем порт:
const port = 8888

// Счётчик номеров комнат
let rooms = 0;
let turns = [];
// Формат объектов в  turns:  {key:rooms, gestures:[5,5], retry:0}

const app = express()
const server = http.createServer(app)
const io = socketIO(server)

app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


io.on('connection', (socket) => {
  
  console.log('Подключился новый пользователь');

  /* На emit "createGame" создаём комнату и отправляем туда первого игрока. Далее emit  с информацией о новой игре для генерации ссылки на стороне клиента */
  socket.on('createGame', (data) => {
      socket.join(`${++rooms}`);
      turns.push( {key:rooms, gestures:[5,5], retry:0});
      socket.emit('newGame', { name: rooms, room: `${rooms}` });
  });

  /* На emit "joinGame" пробуем подкулючиться к комнате */
  socket.on('joinGame', function(data){
    var room = io.nsps['/'].adapter.rooms[data.room];
    if (room && room.length === 1) {
      socket.join(data.room);
      socket.broadcast.to(data.room).emit('player1', {});
      socket.emit('player2', { name: data.name, room: data.room })
    } else {
      console.log('При подключении игрока возникла проблема');
      // Сообщаем клиентам, что что-то случилось
      socket.emit('err', { message: 'Мест нет :(' });
  }
  });
  
  /* На emit "playerTurn" обновляем информацию о комнате и информируем игроков в комнате если это необходимо */
  socket.on('playerTurn', (data) => {
    // Ищем инфорацию о комнате в массиве turns
    let index = turns.findIndex(x => x["key"] === parseInt(data.room));
    let gameInfo = turns[index];
    gameInfo["gestures"][data.player-1]=data.gesture;
    if(gameInfo["gestures"][0]!==5 && gameInfo["gestures"][1]!==5)
      {
      // Информируем игроков в комнате, что все походили
        io.in(data.room).emit('playerTurnBroadcast',gameInfo["gestures"]);
      // Информируем игроков комнате о результате игры
        io.in(data.room).emit('gameResult',gameResult(gameInfo["gestures"]));
      }
  });

/* На emit "restartGame" обновляем информацию о комнате и информируем игроков в комнате о том, что можно играть снова */
socket.on('restartGame', (data) => {
  // Ищем инфорацию о комнате в массиве turns
  let index = turns.findIndex(x => x["key"] === parseInt(data.room));
  // +1 к счётчику игроков, которые подтвердили повтор игры 
  turns[index].retry++
  // Если   turns[index].retry >= 2 инициируем новую игру 
  if(turns[index].retry>=2){
    turns[index]={key:parseInt(data.room), gestures:[5,5], retry:0}
    io.in(data.room).emit('restart');
  }
});


socket.on('messagetoserver', (data) => {
  io.in(data.room).emit('newmessage', {message:data.message,player:data.player});
});


});


server.listen(port, () => console.log(`Listening on port ${port}`))


function gameResult(arr){
/*
*  Пример,что:
*  0: lizard
*  1: paper
*  2: rock
*  3: scissors
*  4: spock
*  тогда правила игры можно описать следующим образом:
*  Жест   :  Побеждает
*  0      :  1,4
*  1      :  2,4
*  2      :  0,3
*  3      :  0,1
*  4      :  2,3
*/
let win = 0;
 if( ((arr[0]==0)&&(arr[1]== 1 || arr[1]==4)) || ((arr[0]==1)&&(arr[1]== 2 || arr[1]==4))  || ((arr[0]==2)&&(arr[1]==0 || arr[1]==3))  ||((arr[0]==3)&&(arr[1]==0 || arr[1]==1))  ||((arr[0]==4)&&(arr[1]== 2 || arr[1]==3))  ){
  win = 1;
 };
 if( ((arr[1]==0)&&(arr[0]== 1 || arr[0]==4)) || ((arr[1]==1)&&(arr[0]== 2 || arr[0]==4))  || ((arr[1]==2)&&(arr[0]==0 || arr[0]==3))  ||((arr[1]==3)&&(arr[0]==0 || arr[0]==1))  ||((arr[1]==4)&&(arr[0]== 2 || arr[0]==3))  ){
  win = 2;
};
return win;
}
