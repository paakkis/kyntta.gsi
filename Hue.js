import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class Hue {
    constructor() {
        this.ip = process.env.HUE_BRIDGE_IP;
        this.user = process.env.HUE_BRIDGE_USER;
        this.apiUrl = `http://${this.ip}/api/${this.user}/lights`;
    }
    async switchOn(id) {
        const url = `${this.apiUrl}/${id}/state`;
        const body = {
            on: true,
        };
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            console.log(`Light ${id} switched ON`, response);
        } catch (error) {
            console.error('Error sending message:', error.message);
        }
    }

    async switchOff(id) {
        const url = `${this.apiUrl}/${id}/state`;
        const body = {
            on: false,
        };
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            console.log(`Light ${id} switched OFF`, response);
        } catch (error) {
            console.error('Error sending message:', error.message);
        }
    }

    async setBrightness(id, level) {
        const url = `${this.apiUrl}/${id}/state`;
        const body = {
            bri: level,
        };
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            console.log(`Brightness ${id} set to ${level}`, response);
        } catch (error) {
            console.error('Error sending message:', error.message);
        }
    }
}

export default Hue;
