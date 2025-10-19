require('dotenv').config();
const cluster = require('cluster');
const os = require('os');
const pidusage = require('pidusage');

const WORKER_SCRIPT = require('path').join(__dirname, 'app.js');
const CPU_THRESHOLD_PERCENT = 70; 

if (cluster.isMaster) {
  console.log(`Master ${process.pid} starting...`);

  function forkWorker() {
    const worker = cluster.fork();
    console.log(`Forked worker ${worker.process.pid}`);
    worker.on('exit', (code, signal) => {
      console.log(`Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Forking new one.`);
      setTimeout(forkWorker, 1000);
    });
    return worker;
  }

  let current = forkWorker();

  const interval = 3000;
  setInterval(async () => {
    try {
      const stats = await pidusage(current.process.pid);
      const cpu = stats.cpu; 
      if (cpu > CPU_THRESHOLD_PERCENT) {
        console.warn(`CPU ${cpu.toFixed(2)}% > ${CPU_THRESHOLD_PERCENT}% - restarting worker ${current.process.pid}`);
        current.process.kill();
      }
    } catch (err) {
    }
  }, interval);

} else {
  require('./app.js');
}
