export function jsonToCsv(json: any[], columns: string[]): string {
    const header = columns.join(',');
    const rows = json.map(obj => {
        return columns.map(col => {
            let val = obj[col];
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') {
                // Escape quotes and wrap in quotes
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',');
    });
    return [header, ...rows].join('\n');
}
