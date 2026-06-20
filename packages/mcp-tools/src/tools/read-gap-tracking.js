import fs from 'fs/promises';
import path from 'path';

export const readGapTrackingDef = {
  name: "evolith-read-gap-tracking",
  description: "Reads the Evolith architectural gap tracking board to check pending gaps and technical debt.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export async function readGapTrackingHandler() {
  try {
    const rootDir = process.cwd();
    const filePath = path.join(rootDir, 'reference', 'governance', 'standards', 'vision', 'gap-tracking.md');
    
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Extract the active tracking table
    const tableLines = content.split('\n').filter(line => line.startsWith('|'));
    const pendingLines = tableLines.filter(line => line.includes('PENDING'));
    
    return {
      content: [
        {
          type: "text",
          text: `Evolith Gap Tracking Board:\nFound ${pendingLines.length} PENDING gaps.\n\n${pendingLines.join('\n')}`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to read gap tracking: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
}
