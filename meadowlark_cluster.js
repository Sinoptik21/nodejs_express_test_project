'use strict';

const cluster = require('cluster');

const startWorker = () => {
  const worker = cluster.fork();
  console.log(`КЛАСТЕР: Исполнитель ${worker.id} запущен`);
};

if (cluster.isMaster) {
  require('os').cpus().forEach(() => {
    startWorker();
  });
  // Записываем в журнал всех отключившихся исполнителей;
  // Если исполнитель отключается, он должен затем завершить работу, так что мы подождем
  // события завершения работы для порождения нового исполнителя ему на замену
  cluster.on('disconnect', (worker) => {
    console.log(`КЛАСТЕР: Исполнитель ${worker.id} отключился от кластера.`);
  });
  // Когда исполнитель завершает работу, создаем исполнителя ему на замену
  cluster.on('exit', (worker, code, signal) => {
    console.log(`КЛАСТЕР: Исполнитель ${worker.id} завершил работу с кодом завершения ${code} (${signal})`);
    startWorker();
  });
} else {
  // Запускаем наше приложение на исполнителе; см. meadowlark.js
  require('./meadowlark.js')();
}
