import fs from 'fs';

class MessageTemplates {
    constructor(path = './messages.json') {
        this.templates = JSON.parse(fs.readFileSync(path, 'utf8'));
    }

    getMessage(type, data = {}) {
        const options = this.templates[type];
        if (!options || options.length === 0) return null;

        const template = options[Math.floor(Math.random() * options.length)];

        return template.replace(/{(.*?)}/g, (_, key) => data[key] || '');
    }
}

export default MessageTemplates;
