// id композиции = имя клипа (папка public/<clip>/ с data.json)
export const compositionIdForClip = (clip: string) => clip.replace(/[^a-zA-Z0-9-]/g, '-');
