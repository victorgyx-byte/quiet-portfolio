#!/usr/bin/env python3
import argparse
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from urllib.error import HTTPError
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG_PATH = BASE_DIR / "feeds.example.json"
STATE_PATH = BASE_DIR / ".sent-links.json"
OFFSET_PATH = BASE_DIR / ".telegram-offset"


@dataclass(frozen=True)
class FeedItem:
    source: str
    title: str
    link: str
    summary: str
    published: str
    score: int


def load_config() -> dict:
    config_path = Path(os.environ.get("CONFIG_PATH", DEFAULT_CONFIG_PATH))
    with config_path.open("r", encoding="utf-8") as config_file:
        return json.load(config_file)


def load_sent_links() -> set[str]:
    if not STATE_PATH.exists():
        return set()
    try:
        with STATE_PATH.open("r", encoding="utf-8") as state_file:
            return set(json.load(state_file))
    except (json.JSONDecodeError, OSError):
        return set()


def save_sent_links(links: set[str]) -> None:
    with STATE_PATH.open("w", encoding="utf-8") as state_file:
        json.dump(sorted(links), state_file, indent=2)


def fetch_text(url: str, timeout: int = 20) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "education-research-telegram-bot/0.1"
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def child_text(element: ET.Element, names: list[str]) -> str:
    for name in names:
        child = element.find(name)
        if child is not None and child.text:
            return clean_text(child.text)
    return ""


def parse_feed(source: str, xml_text: str, keywords: list[str]) -> list[FeedItem]:
    root = ET.fromstring(xml_text)
    entries = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    items: list[FeedItem] = []

    for entry in entries:
        title = child_text(entry, ["title", "{http://www.w3.org/2005/Atom}title"])
        summary = child_text(
            entry,
            [
                "description",
                "summary",
                "{http://www.w3.org/2005/Atom}summary",
                "{http://www.w3.org/2005/Atom}content",
            ],
        )
        link = child_text(entry, ["link", "guid"])

        atom_link = entry.find("{http://www.w3.org/2005/Atom}link")
        if atom_link is not None and atom_link.attrib.get("href"):
            link = atom_link.attrib["href"]

        published = child_text(
            entry,
            ["pubDate", "published", "updated", "{http://www.w3.org/2005/Atom}published", "{http://www.w3.org/2005/Atom}updated"],
        )

        if not title or not link:
            continue

        searchable = f"{title} {summary}".lower()
        score = sum(2 if keyword.lower() in title.lower() else 1 for keyword in keywords if keyword.lower() in searchable)
        items.append(
            FeedItem(
                source=source,
                title=title,
                link=link,
                summary=summary[:280],
                published=published,
                score=score,
            )
        )

    return items


def collect_items(config: dict, sent_links: set[str], max_items: int) -> list[FeedItem]:
    all_items: list[FeedItem] = []
    seen_links: set[str] = set()

    for feed in config["feeds"]:
        try:
            xml_text = fetch_text(feed["url"])
            feed_items = parse_feed(feed["name"], xml_text, config["keywords"])
        except Exception as exc:
            print(f"Could not read {feed['name']}: {exc}", file=sys.stderr)
            continue

        for item in feed_items:
            normalized_link = item.link.split("?")[0].rstrip("/")
            if normalized_link in sent_links or normalized_link in seen_links:
                continue
            seen_links.add(normalized_link)
            all_items.append(item)

    all_items.sort(key=lambda item: item.score, reverse=True)
    return all_items[:max_items]


def format_digest(items: list[FeedItem]) -> str:
    if not items:
        return "No new education research updates found today."

    lines = ["Today's education research digest"]
    for index, item in enumerate(items, start=1):
        summary = f"\n{item.summary}" if item.summary else ""
        lines.append(
            f"\n{index}. {item.title}\n"
            f"Source: {item.source}{summary}\n"
            f"Link: {item.link}"
        )
    return "\n".join(lines)


def telegram_request(method: str, token: str, payload: dict) -> dict:
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = urllib.parse.urlencode(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code == 404:
            raise RuntimeError(
                "Telegram could not find this bot token. Check that the token is copied exactly, "
                "or create a fresh token in BotFather with /revoke."
            ) from exc
        if exc.code == 401:
            raise RuntimeError("Telegram rejected this bot token. Create a fresh token in BotFather with /revoke.") from exc
        raise


def send_telegram_message(token: str, chat_id: str, text: str) -> None:
    chunks = [text[index:index + 3900] for index in range(0, len(text), 3900)]
    for chunk in chunks:
        telegram_request(
            "sendMessage",
            token,
            {
                "chat_id": chat_id,
                "text": chunk,
                "disable_web_page_preview": "true",
            },
        )
        time.sleep(0.5)


def build_and_send_digest(token: str, chat_id: str, max_items: int) -> int:
    config = load_config()
    sent_links = load_sent_links()
    items = collect_items(config, sent_links, max_items)
    digest = format_digest(items)
    send_telegram_message(token, chat_id, digest)

    sent_links.update(item.link.split("?")[0].rstrip("/") for item in items)
    save_sent_links(sent_links)
    return len(items)


def print_chat_id(token: str) -> None:
    response = telegram_request("getUpdates", token, {})
    updates = response.get("result", [])
    if not updates:
        print("No Telegram messages found. Send your bot a message first, then run this again.")
        return

    for update in updates[-5:]:
        message = update.get("message") or update.get("channel_post") or {}
        chat = message.get("chat", {})
        if chat.get("id"):
            print(f"chat_id: {chat['id']} ({chat.get('type', 'unknown')})")


def load_offset() -> int:
    if not OFFSET_PATH.exists():
        return 0
    try:
        return int(OFFSET_PATH.read_text(encoding="utf-8").strip())
    except ValueError:
        return 0


def save_offset(offset: int) -> None:
    OFFSET_PATH.write_text(str(offset), encoding="utf-8")


def listen_for_commands(token: str, allowed_chat_id: str, max_items: int) -> None:
    print("Listening for Telegram commands. Send /latest to your bot.")
    offset = load_offset()

    while True:
        try:
            response = telegram_request(
                "getUpdates",
                token,
                {
                    "offset": str(offset),
                    "timeout": "25",
                    "allowed_updates": json.dumps(["message"]),
                },
            )
        except Exception as exc:
            print(f"Telegram polling error: {exc}", file=sys.stderr)
            time.sleep(10)
            continue

        for update in response.get("result", []):
            offset = max(offset, update["update_id"] + 1)
            save_offset(offset)

            message = update.get("message") or {}
            chat = message.get("chat") or {}
            chat_id = str(chat.get("id", ""))
            text = (message.get("text") or "").strip().lower()

            if chat_id != str(allowed_chat_id):
                if chat_id:
                    send_telegram_message(token, chat_id, "Sorry, this private research bot is not available for this chat.")
                continue

            if text in {"/start", "start", "hello", "hi"}:
                send_telegram_message(token, allowed_chat_id, "Send /latest whenever you want an education research digest.")
            elif text.startswith("/latest"):
                count = build_and_send_digest(token, allowed_chat_id, max_items)
                print(f"Sent {count} item(s) from /latest.")
            elif text.startswith("/help"):
                send_telegram_message(token, allowed_chat_id, "Commands:\n/latest - send a fresh education research digest")


def main() -> int:
    parser = argparse.ArgumentParser(description="Send a low-cost education research news digest to Telegram.")
    parser.add_argument("--get-chat-id", action="store_true", help="Print recent Telegram chat IDs for your bot.")
    parser.add_argument("--listen", action="store_true", help="Keep running and answer Telegram commands like /latest.")
    args = parser.parse_args()

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Set TELEGRAM_BOT_TOKEN first.", file=sys.stderr)
        return 1

    if args.get_chat_id:
        print_chat_id(token)
        return 0

    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not chat_id:
        print("Set TELEGRAM_CHAT_ID first.", file=sys.stderr)
        return 1

    max_items = int(os.environ.get("MAX_ITEMS", "8"))
    if args.listen:
        listen_for_commands(token, chat_id, max_items)
        return 0

    count = build_and_send_digest(token, chat_id, max_items)
    print(f"Sent {count} item(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
