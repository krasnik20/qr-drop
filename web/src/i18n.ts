import { createContext, createElement, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type Language = "en" | "ru" | "sr";
export type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    title: "QR Drop", lede: "Send text and files over a private peer-to-peer channel. No account, no noise.", chooseMode: "How do you want to use QR Drop?", howUse: "Choose a mode", hostMode: "Start a room and share", receiverMode: "Receive on this device", receiverTitle: "Connect this device", scanToHost: "Scan this code to start a room", back: "Back",
    invite: "Invite link", creating: "creating room…", roomOpen: "Room is open", watcherCount: "Number of watchers",
    newRoom: "New room", startRoom: "Start your own room", copy: "Copy link", copied: "Link copied", attach: "Attach file", send: "Send",
    write: "Write a message…", drop: "Drop files here", expand: "Expand message", emptyHost: "Nothing here yet — write a message or drop a file.", emptyGuest: "No messages yet",
    room: "ROOM", connecting: "connecting…", channel: "channel open", waitingChannel: "waiting for channel…", waitingHost: "waiting for the host…",
    hostLeft: "host left, waiting for them to return…", hostBack: "host is back, reconnecting…", hostTaken: "this room is already hosted in another tab", hostUnavailable: "The host disconnected, this file is no longer available", download: "Download", downloading: "Downloading…", close: "Close",
    preview: "Preview", file: "File", image: "Image", audio: "Audio", video: "Video", other: "File", filename: "Name", extension: "Extension", size: "Size",
  },
  ru: {
    title: "QR Drop", lede: "Отправляйте текст и файлы по приватному peer-to-peer каналу. Без аккаунта и лишнего шума.", chooseMode: "Как вы хотите использовать QR Drop?", howUse: "Выберите режим", hostMode: "Создать комнату и делиться", receiverMode: "Принимать на этом устройстве", receiverTitle: "Подключить это устройство", scanToHost: "Отсканируйте код, чтобы создать комнату", back: "Назад",
    invite: "Ссылка для приглашения", creating: "создаём комнату…", roomOpen: "Комната открыта", watcherCount: "Кол-во зрителей",
    newRoom: "Новая комната", startRoom: "Начать свою комнату", copy: "Копировать ссылку", copied: "Ссылка скопирована", attach: "Прикрепить файл", send: "Отправить",
    write: "Напишите сообщение…",
    drop: "Отпустите файлы здесь",
    expand: "Развернуть сообщение",
    emptyHost: "Здесь пока ничего нет — напишите сообщение или добавьте файл.",
    emptyGuest: "Пока нет сообщений",
    room: "КОМНАТА", connecting: "подключение…", channel: "канал открыт", waitingChannel: "ждём канал…", waitingHost: "ждём хозяина комнаты…",
    hostLeft: "хозяин ушёл, ждём возвращения…", hostBack: "хозяин вернулся, переподключаемся…", hostTaken: "эта комната уже открыта в другой вкладке", hostUnavailable: "Хост отключился, этот файл больше недоступен", download: "Скачать", downloading: "Загрузка…", close: "Закрыть",
    preview: "Предпросмотр", file: "Файл", image: "Изображение", audio: "Аудио", video: "Видео", other: "Файл", filename: "Название", extension: "Расширение", size: "Размер",
  },
  sr: {
    title: "QR Drop", lede: "Šaljite tekst i fajlove privatnim peer-to-peer kanalom. Bez naloga i suvišne buke.", chooseMode: "Kako želite da koristite QR Drop?", howUse: "Izaberite režim", hostMode: "Pokreni sobu i deli", receiverMode: "Prikazuj na ovom uređaju", receiverTitle: "Povežite ovaj uređaj", scanToHost: "Skenirajte kod da pokrenete sobu", back: "Nazad",
    invite: "Link za poziv", creating: "kreiranje sobe…", roomOpen: "Soba je otvorena", watcherCount: "Broj gledaoca",
    newRoom: "Nova soba", startRoom: "Pokreni svoju sobu", copy: "Kopiraj link", copied: "Link je kopiran", attach: "Dodaj fajl", send: "Pošalji",
    write: "Napišite poruku…",
    drop: "Otpustite fajlove ovde",
    expand: "Proširi poruku",
    emptyHost: "Još nema ničega — napišite poruku ili dodajte fajl.",
    emptyGuest: "Još nema poruka",
    room: "SOBA", connecting: "povezivanje…", channel: "kanal je otvoren", waitingChannel: "čekamo kanal…", waitingHost: "čekamo domaćina…",
    hostLeft: "domaćin je otišao, čekamo povratak…", hostBack: "domaćin se vratio, povezujemo se…", hostTaken: "ova soba je već otvorena u drugoj kartici", hostUnavailable: "Domaćin se isključio, ovaj fajl više nije dostupan", download: "Preuzmi", downloading: "Preuzimanje…", close: "Zatvori",
    preview: "Pregled", file: "Fajl", image: "Slika", audio: "Audio", video: "Video", other: "Fajl", filename: "Naziv", extension: "Ekstenzija", size: "Veličina",
  },
} as const;

function detectLanguage(): Language {
  const language = navigator.language.toLowerCase();
  if (language.startsWith("ru")) return "ru";
  if (language.startsWith("sr") || language.startsWith("hr") || language.startsWith("bs")) return "sr";
  return "en";
}

type LanguageContextValue = [
  Language,
  Dispatch<SetStateAction<Language>>,
];

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(
    () =>
      (sessionStorage.getItem("qr-drop-language") as Language | null) ??
      detectLanguage(),
  );

  useEffect(() => {
    sessionStorage.setItem("qr-drop-language", language);
  }, [language]);

  return createElement(
    LanguageContext.Provider,
    { value: [language, setLanguage] },
    children,
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export function useTranslate() {
  const [language] = useLanguage();
  return useMemo(
    () => (key: TranslationKey) => translations[language][key],
    [language],
  );
}
