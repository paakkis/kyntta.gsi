import * as http from 'http';
import TelegramBot from './Bot.js';
import MessageHandler from './MessageHandler.js';
import dotenv from 'dotenv';
import MessageTemplates from './MessageTemplates.js';
dotenv.config();

const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";
const LONG_CD = 120000;
const SHORT_CD = 60000;

const messageHandler = new MessageHandler();
const messages = new MessageTemplates();

const server = http.createServer(function(req, res) {
    const bot = new TelegramBot();

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

                // Game opened
                const menuKey = `menu_${player.steamid}`;
                if (json?.player?.activity === "menu" && !messageHandler.isPermanentlyLocked(menuKey)) {

                    console.log("Menu activity detected", { locked: messageHandler.isPermanentlyLocked(menuKey) });
                    await bot.sendMessage("Lets go Leap! 🔥");
                    messageHandler.setPermanentLock(menuKey);
                }

                if (!map || !matchStats) {
                    return res.end(JSON.stringify({ status: 'missing required fields for match.' }));
                }


                // Connected to map
                const connKey = `conn_${player.steamdid}_${map.name}`
                if (map?.name && !messageHandler.isPermanentlyLocked(connKey)) {
                    const text = messages.getMessage('menu');
                    await bot.sendMessage(text);
                    messageHandler.setPermanentLock(connKey);
                }

                // AWP case
                const awpKey = `awp_${player.steamid}`;
                const prevWeapons = previously?.weapons || {};
                await messageHandler.withLock(awpKey, async () => {
                    for (const weapon of Object.values(prevWeapons)) {
                        if (weapon?.name === 'weapon_awp' && !messageHandler.isOnCooldown(awpKey, LONG_CD)) {
                            await bot.sendMessage(`Makseleeko ${player.name}:n bossi? 🤡`);
                            messageHandler.setCooldown(awpKey);
                            break;
                        }
                    }
                });

                // Lose streak
                const teamKey = team === 'T' ? 'team_t' : 'team_ct';
                const lossStreakKey = `loss_${team}`;
                const consecutiveLosses = map?.[teamKey]?.consecutive_round_losses;
                await messageHandler.withLock(lossStreakKey, async () => {
                    if (consecutiveLosses === 5 && !messageHandler.isOnCooldown(lossStreakKey, SHORT_CD)) {
                        await bot.sendMessage(`Nytkö ne sulaa... ${consecutiveLosses} putkeen 📉`);
                        messageHandler.setCooldown(lossStreakKey);
                    }
                });

                // Win streak
                const opponentKey = team === 'T' ? 'team_ct' : 'team_t';
                const opponentLosses = map?.[opponentKey]?.consecutive_round_losses;
                const winStreakKey = `winstreak_${team}_${opponentLosses}`;
                await messageHandler.withLock(winStreakKey, async () => {
                    if (opponentLosses >= 3 && !messageHandler.isPermanentlyLocked(winStreakKey)) {
                        await bot.sendMessage(`${team} on putkessa! ${opponentLosses} rundia putkeen 🚀`);
                        messageHandler.setPermanentLock(winStreakKey);
                    }
                });

                // Multi-kill
                const roundKills = player?.state?.round_kills || 0;
                const multiKillKey = `killspree_${player.steamid}`;
                await messageHandler.withLock(multiKillKey, async () => {
                    if (roundKills > 3 && !messageHandler.isOnCooldown(multiKillKey, 20000)) {
                        await bot.sendMessage(`JA SIELTÄ! ${roundKills} tappoa by ${player.name}! 🎶`);
                        messageHandler.setCooldown(multiKillKey);
                    }
                });

                // Over 20/30 kills
                const totalKills = matchStats.kills;
                for (const killMilestone of [20, 30]) {
                    const milestoneKey = `milestone_${killMilestone}_${player.steamid}`;
                    if (totalKills === killMilestone && !messageHandler.isPermanentlyLocked(milestoneKey)) {
                        await bot.sendMessage(`${killMilestone} HÄRKÄÄ by ${player.name}! 🔫`);
                        messageHandler.setPermanentLock(milestoneKey);
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
