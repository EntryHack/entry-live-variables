export default function textEllipsis(text: string, maxLength: number) {
  if (text.length > maxLength) return text.slice(0, maxLength) + "...";
  else return text;
}
