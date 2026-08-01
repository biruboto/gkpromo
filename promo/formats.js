export const DEFAULT_OUTPUT_FORMAT = 'portrait';

export const OUTPUT_FORMATS = {
  portrait: {
    id: 'portrait',
    label: '4:5',
    name: 'Instagram portrait',
    logicalWidth: 540,
    logicalHeight: 675,
    exportScale: 2,
    exportWidth: 1080,
    exportHeight: 1350
  },
  landscape: {
    id: 'landscape',
    label: '16:9',
    name: 'HD landscape',
    logicalWidth: 960,
    logicalHeight: 540,
    exportScale: 2,
    exportWidth: 1920,
    exportHeight: 1080
  }
};

export function outputFormat(id) {
  return OUTPUT_FORMATS[id] || OUTPUT_FORMATS[DEFAULT_OUTPUT_FORMAT];
}
