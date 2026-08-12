const fs = require('fs');

const html = fs.readFileSync('temp_nghia.html', 'utf-8');
const regex = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/g;
let match;
const chunks = [];

while ((match = regex.exec(html)) !== null) {
    // Next.js chunks have a format like `1a:["$","div",...]`
    const rawStr = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    // Extract the JSON part
    const jsonMatch = rawStr.match(/^[0-9a-f]+:(.*)$/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[1]);
            chunks.push(parsed);
        } catch (e) {
            // ignore
        }
    }
}

function traverse(node, depth = 0) {
    if (!node) return;
    if (Array.isArray(node)) {
        if (node[0] === '$') {
            const tag = node[1];
            const props = node[3] || {};
            const className = props.className || '';
            console.log('  '.repeat(depth) + `<${tag} class="${className}">`);
            traverse(props.children, depth + 1);
            console.log('  '.repeat(depth) + `</${tag}>`);
        } else {
            node.forEach(child => traverse(child, depth));
        }
    } else if (typeof node === 'string') {
        if (node.trim()) {
            console.log('  '.repeat(depth) + node.trim());
        }
    }
}

chunks.forEach(chunk => {
    traverse(chunk);
});
