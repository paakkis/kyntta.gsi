import * as http from 'http';
import TelegramBot from './Bot.js';

import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";
const LONG_CD = 120000;
const SHORT_CD = 60000;

function isOnCoolDown(cooldowns, key, ms) {
    const now = Date.now();
    if (!cooldowns.has(key) || now - cooldowns.get(key) > ms) {
        cooldowns.set(key, now);
        return false;
    }
    return true;
}

const server = http.createServer(function(req, res) {
    const bot = new TelegramBot();

    const triggerLocks = new Set();
    const cooldowns = new Map();

    if (req.method === 'POST') {
        console.log(new Date().toISOString(), '- Handling POST request...');
        res.writeHead(200, { 'Content-Type': 'application/json' });

        let body = '';

        req.on('data', function(data) {
            body += data;
        });

        req.on('end', async function() {
            console.log('POST payload:', body);
            try {
                const json = JSON.parse(body);
                const player = json.player;
                const previously = json.previously?.player;
                const matchStats = player?.match_stats;
                const map = json.map;
                const team = player?.team;

                if (!player || !map || !matchStats) {
                    return res.end(JSON.stringify({ status: 'missing required fields' }));
                }

                // Game opened
                const menuKey = `menu_${player.steamid}`
                if (json?.player?.activity === "menu" && !triggerLocks.has(menuKey)) {
                    await bot.sendMessage("Lets go Leap! 🔥");
                    triggerLocks.add(menuKey);
                }

                // AWP case
                const awpKey = `awp_${player.steamid}`;
                const prevWeapons = previously?.weapons || {};
                for (const weapon of Object.values(prevWeapons)) {
                    if (weapon?.name === 'weapon_awp' && !isOnCoolDown(cooldowns, awpKey, LONG_CD)) {
                        await bot.sendMessage(`${player.name} kävi AWP ostoksilla 🤡`);
                        triggerLocks.add(awpKey);
                        break;
                    }
                }

                // Lose streak
                const teamKey = team === 'T' ? 'team_t' : 'team_ct';
                const lossStreakKey = `loss_${team}`;
                const consecutiveLosses = map?.[teamKey]?.consecutive_round_losses;
                if (consecutiveLosses === 5 && !isOnCoolDown(cooldowns, lossStreakKey, SHORT_CD)) {
                    await bot.sendMessage('Nytkö ne sulaa... 📉');
                }

                // Multi-kill
                const roundKills = player?.state?.round_kills || 0;
                const multiKillKey = `killspree_${player.steamid}`;
                if (roundKills > 3 && !isOnCoolDown(cooldowns, multiKillKey, 20000)) {
                    await bot.sendMessage(`JA SIELTÄ! ${roundKills} tappoa by ${player.name}!`);
                }

                // Over 20 kills
                for (const killMilestone of [20, 30]) {
                    const milestoneKey = `milestone_${killMilestone}_${player.steamid}`;
                    if (totalKills === killMilestone && !triggerLocks.has(milestoneKey)) {
                        await bot.sendMessage(`${killMilestone} HÄRKÄÄ by ${player.name}!`);
                        triggerLocks.add(milestoneKey);
                    }
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
