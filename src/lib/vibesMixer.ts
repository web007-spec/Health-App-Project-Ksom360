import { Howl } from "howler";

export type MixItem = {
  soundId: string;
  name: string;
  url: string;
  volume: number;
  iconUrl?: string;
  howl?: Howl;
};

export function createHowl(url: string, volume: number) {
  return new Howl({
    src: [url],
    loop: true,
    volume,
    html5: true,
  });
}

export function playMix(items: MixItem[]) {
  items.forEach((item) => {
    if (!item.howl) item.howl = createHowl(item.url, item.volume);
    if (!item.howl.playing()) item.howl.play();
  });
}

export function pauseMix(items: MixItem[]) {
  items.forEach((item) => item.howl?.pause());
}

export function setItemVolume(item: MixItem, volume: number) {
  item.volume = volume;
  item.howl?.volume(volume);
}

export function removeFromMix(items: MixItem[], soundId: string) {
  const idx = items.findIndex((x) => x.soundId === soundId);
  if (idx === -1) return items;
  items[idx].howl?.stop();
  items[idx].howl?.unload();
  return items.filter((x) => x.soundId !== soundId);
}

export function clearMix(items: MixItem[]) {
  items.forEach((x) => {
    x.howl?.stop();
    x.howl?.unload();
  });
  return [];
}
