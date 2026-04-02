const fs = require('fs');

// Remove section-header CSS blocks from a file
function removeSectionHeaderCSS(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const before = (content.match(/section-header/g) || []).length;

    // Remove the entire Section Header comment block + rules
    // Pattern: find .section-header {...} and related rules

    // 1. Remove the comment block header
    content = content.replace(/\/\*\s*=+\s*\n\s*Section Header\s*\n\s*=+\s*\*\/\s*\n/g, '');
    content = content.replace(/\/\*\s*=+\s*\r?\n\s*Section Header\s*\r?\n\s*=+\s*\*\/\s*\r?\n/g, '');

    // 2. Remove individual CSS rules containing section-header
    // Strategy: split into lines, identify and remove section-header rule blocks

    const lines = content.split('\n');
    const result = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if this line is a CSS selector containing section-header (but not section-actions, section-subtitle, section-divider etc.)
        // A CSS rule starts with a selector line and ends with }
        const isSectionHeaderSelector = (
            /\.section-header(?!-actions|-badge|-subtitle|-divider)/.test(trimmed) ||
            trimmed === '.section-header-content {' ||
            /^\.section-header-content/.test(trimmed) ||
            /^\.section-header-actions/.test(trimmed) ||
            trimmed === '.section-header-actions {'
        ) && (trimmed.endsWith('{') || trimmed.endsWith(','));

        // Also check for comment lines about section-header
        const isSectionHeaderComment = /section-header/i.test(trimmed) && trimmed.startsWith('/*');

        // Check if it's a selector ending with { that contains section-header
        const isSelector = isSectionHeaderSelector;

        if (isSelector) {
            // Find the matching closing }
            let depth = 0;
            let j = i;
            while (j < lines.length) {
                const jLine = lines[j];
                const opens = (jLine.match(/\{/g) || []).length;
                const closes = (jLine.match(/\}/g) || []).length;
                depth += opens - closes;
                j++;
                if (depth <= 0 && opens + closes > 0) break;
            }
            // Skip all lines from i to j (the entire rule block)
            i = j;
        } else if (isSectionHeaderComment) {
            // Skip comment line
            i++;
        } else {
            result.push(line);
            i++;
        }
    }

    content = result.join('\n');

    // Also handle inline single-line rules with section-header
    content = content.replace(/[^\n]*\.section-header[^\n]*\{[^\n]*\}[^\n]*/g, '');

    // Remove the section header comment block title (/* ===...=== */)
    content = content.replace(/\/\*\s*[\r\n]+\s*رأس القسم العام[^\*]*\*\/\s*[\r\n]*/g, '');
    content = content.replace(/\/\*\s*[\r\n]+\s*Section Header[^\*]*\*\/\s*[\r\n]*/g, '');

    // Clean up multiple blank lines
    content = content.replace(/\n{3,}/g, '\n\n');

    const after = (content.match(/section-header/g) || []).length;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(filePath + ': ' + before + ' → ' + after);
}

// Also handle media queries with section-header inside them
function removeSectionHeaderFromMediaQueries(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const before = (content.match(/section-header/g) || []).length;

    // Remove lines with section-header selectors and their rule blocks
    // inside media queries
    const lines = content.split('\n');
    const result = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Detect .section-header selectors (any form) inside media queries
        const hasSectionHeader = /\.section-header(?!-actions\b|-badge\b|-subtitle\b|-divider\b)/.test(trimmed) ||
                                  /\.section-header-content/.test(trimmed) ||
                                  /\.section-header-actions/.test(trimmed);

        if (hasSectionHeader && trimmed.endsWith('{')) {
            // Skip this rule block
            let depth = 1;
            i++;
            while (i < lines.length && depth > 0) {
                const l = lines[i];
                depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
                i++;
            }
        } else if (hasSectionHeader && trimmed.endsWith(',')) {
            // Multi-selector - skip just this line
            i++;
        } else {
            result.push(line);
            i++;
        }
    }

    content = result.join('\n');
    content = content.replace(/\n{3,}/g, '\n\n');

    const after = (content.match(/section-header/g) || []).length;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(filePath + ' (media): ' + before + ' → ' + after);
}

const cssFiles = [
    'e:/moham/Downloads/adeeb/admin/css/layout.css',
    'e:/moham/Downloads/adeeb/news/news.css',
    'e:/moham/Downloads/adeeb/style.css',
    'e:/moham/Downloads/adeeb/greetings/Eid/style.css',
];

for (const f of cssFiles) {
    if (fs.existsSync(f)) {
        removeSectionHeaderFromMediaQueries(f);
    }
}

console.log('Done!');
