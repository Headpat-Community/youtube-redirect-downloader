const YOUTUBE_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)[\w-]+/;

export function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url);
}
