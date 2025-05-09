import Hue from './Hue.js';
import * as http from 'http';
import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";
let bomb_timer = 40;

const hue = new Hue();

const server = http.createServer(function(req, res) {
    if (req.method === 'POST') {
        console.log(new Date().toISOString(), '- Handling POST request...');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        let body = '';
        req.on('data', function(data) {
            body += data;
        });
        req.on('end', async function() {
            try {
                const json = JSON.parse(body);
                const round = json.round;
                if (round.bomb === "planted") {
                    const interval = setInterval(async function() {
                        await hue.switchOff(3);
                        await hue.switchOn(3);
                        bomb_timer--;
                        console.log(bomb_timer + ' seconds remaining');
                        if (bomb_timer <= 0) {
                            clearInterval(interval);
                        }
                    }, 1000);
                }
            } catch (error) {
                console.error('Error parsing JSON or sending message:', error.message);
            }
            res.end(JSON.stringify({ status: 'ok' }));
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(port, host);
console.log('Listening to game events at http://' + host + ':' + port, "...");
