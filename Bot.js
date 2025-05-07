import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class TelegramBot {
    constructor() {
        this.botToken = process.env.BOT_TOKEN;
        this.recipientId = process.env.RECIPIENT_ID;

        if (!this.botToken || !this.recipientId) {
            throw new Error("BOT_TOKEN or RECIPIENT_ID not defined in .env file");
        }

        this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;

        this.delay = parseInt(process.env.DELAY || '0');
    }

    /**
     * Sends a message to the predefined recipient (person or group).
     * @param {string} text - The message to send
     * @returns {Promise<void>}
     */
    async sendMessage(text) {
        const url = `${this.apiUrl}/sendMessage`;
        const body = {
            chat_id: this.recipientId,
            text: text,
        };
        try {
            if (this.delay > 0) {
                console.log(`Adding a delay of ${this.delay} ms to msg`);
                await new Promise(resolve => setTimeout(resolve, this.delay));
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                console.error('Telegram API error:', data);
                throw new Error(`Failed to send message: ${data.description || 'Unknown error'}`);
            }

            console.log('Message sent successfully:', data.result.text);
        } catch (error) {
            console.error('Error sending message:', error.message);
        }
    }
}

export default TelegramBot;
