import * as http from 'http';
import TelegramBot from './Bot.js';
import MessageHandler from './MessageHandler.js';
import dotenv from 'dotenv';
import MessageTemplates from './MessageTemplates.js';
dotenv.config();

const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";
const LONG_CD = 600000;

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
                const bomb = json.bomb;

                // Game opened
                const menuKey = `menu_${player.steamid}`;
                if (json?.player?.activity === "menu" && !messageHandler.isPermanentlyLocked(menuKey)) {
                    const text = messages.getMessage('menu');
                    messageHandler.setPermanentLock(menuKey);
                    await bot.sendMessage(text);
                }

                if (!map || !matchStats) {
                    return res.end(JSON.stringify({ status: 'missing required fields for match.' }));
                }

                // Connected to map
                const connKey = `conn_${player.steamdid}_${map.name}`

                await messageHandler.withLock(connKey, async () => {
                    if (map?.name && !messageHandler.isPermanentlyLocked(connKey)) {
                        const text = messages.getMessage('map', {
                            map: map.name,
                        });
                        messageHandler.setPermanentLock(connKey);
                        await bot.sendMessage(text);
                    }
                });

                // AWP case
                const awpKey = `awp_${player.steamid}`;

                const weapons = player?.weapons || {};
                await messageHandler.withLock(awpKey, async () => {
                    for (const weapon of Object.values(weapons)) {
                        if (weapon?.name === 'weapon_awp' && !messageHandler.isOnCooldown(awpKey, LONG_CD)) {
                            const text = messages.getMessage('awp', {
                                player: player?.name,
                            });
                            messageHandler.setCooldown(awpKey);
                            await bot.sendMessage(text);
                            break;
                        }
                    }
                });

                // Lose streak
                const teamKey = team === 'T' ? 'team_t' : 'team_ct';

                const lossStreakKey = `loss_${team}`;
                const consecutiveLosses = map?.[teamKey]?.consecutive_round_losses;
                await messageHandler.withLock(lossStreakKey, async () => {
                    if (consecutiveLosses === 5 && !messageHandler.isPermanentlyLocked(lossStreakKey)) {
                        const text = messages.getMessage('lossstreak', {
                            rounds: consecutiveLosses,
                        });
                        messageHandler.setPermanentLock(lossStreakKey);
                        await bot.sendMessage(text);
                    }
                });

                // Win streak
                const opponentKey = team === 'T' ? 'team_ct' : 'team_t';

                const opponentLosses = map?.[opponentKey]?.consecutive_round_losses;
                const winStreakKey = `winstreak_${team}_${opponentLosses}`;
                await messageHandler.withLock(winStreakKey, async () => {
                    if (opponentLosses >= 3 && !messageHandler.isPermanentlyLocked(winStreakKey)) {
                        const text = messages.getMessage('winstreak', {
                            team: team,
                            rounds: consecutiveLosses,
                        });
                        messageHandler.setPermanentLock(winStreakKey);
                        await bot.sendMessage(text);
                    }
                });

                // Multi-kill
                const roundKills = player?.state?.round_kills || 0;
                const multiKillKey = `killspree_${player.steamid}_${map?.round}`;

                await messageHandler.withLock(multiKillKey, async () => {
                    if (roundKills > 3 && !messageHandler.isPermanentlyLocked(multiKillKey)) {
                        const text = messages.getMessage('milestone', {
                            player: player?.name,
                            kills: roundKills,
                        });
                        messageHandler.setPermanentLock(multiKillKey);
                        await bot.sendMessage(text);
                    }
                });

                // Over 20/30 kills
                const totalKills = matchStats.kills;

                for (const killMilestone of [20, 30]) {
                    const milestoneKey = `milestone_${killMilestone}_${player.steamid}`;
                    await messageHandler.withLock(totalKills, async () => {
                        if (totalKills === killMilestone && !messageHandler.isPermanentlyLocked(milestoneKey)) {
                            const text = messages.getMessage('milestone', {
                                player: player?.name,
                                kills: killMilestone,
                            });
                            messageHandler.setPermanentLock(milestoneKey);
                            await bot.sendMessage(text);
                        }
                    })
                };

                // Bomb actions
                const bombPlantedKey = `bombPlant_${map?.round}`;
                const bombDefuseKey = `bombDefuse_${map?.round}`;

                await messageHandler.withLock(totalKills, async () => {
                    if (bomb?.state === "planted" && !messageHandler.isPermanentlyLocked(bombPlantedKey)) {
                        messageHandler.setPermanentLock(bombPlantedKey);
                        await bot.sendMessage("Bomb has been planted! 💣");
                    }
                    if (bomb?.state === "defused" && json?.previously?.bomb?.countdown < 1.0 && !messageHandler.isPermanentlyLocked(bombDefuseKey)) {
                        messageHandler.setPermanentLock(bombDefuseKey);
                        await bot.sendMessage(`Bomb has been defused! Ja vain ${json?.previously?.bomb?.countdown}s jäljellä 😰`)
                    }
                });

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
