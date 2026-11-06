/**
 * Длительность аудио в секундах по содержимому файла (без ffmpeg).
 * Поддерживает mp3, m4a/aac, wav, ogg, flac и другие форматы music-metadata.
 * null — формат не распознан или метаданных нет: подкаст без длительности лучше, чем ошибка загрузки.
 */
export async function readAudioDuration(buffer: Buffer): Promise<number | null> {
  try {
    // music-metadata — ESM-only, поэтому динамический import (проект собирается в CommonJS)
    const { parseBuffer } = await import('music-metadata');
    const metadata = await parseBuffer(buffer);
    const seconds = metadata.format.duration;
    if (!seconds || !Number.isFinite(seconds)) return null;
    return Math.max(1, Math.round(seconds));
  } catch {
    return null;
  }
}
