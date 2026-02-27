export async function shareMixLink(url: string) {
  if (navigator.share) {
    return navigator.share({ title: "KSOM Vibes Mix", url });
  }
  await navigator.clipboard.writeText(url);
  return true;
}
