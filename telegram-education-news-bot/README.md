# Low-cost Telegram education research news bot

This is a small, low-cost starter bot that sends a Telegram digest from public education and research feeds.

It does not require paid news APIs, paid hosting, or AI summarization. You can run it manually on your laptop first, then automate it later if you like.

## What it does

- Reads public RSS feeds from education research, policy, and global organizations
- Scores items using education research keywords
- Removes duplicate links
- Sends a short Telegram digest
- Stores sent links locally so you do not receive the same item repeatedly

## Setup

1. Create a bot in Telegram using BotFather and copy the bot token.
2. Message your new bot once from Telegram.
3. Get your chat ID:

   ```bash
   python3 education_news_bot.py --get-chat-id
   ```

4. Run the digest:

   ```bash
   TELEGRAM_BOT_TOKEN="your-token" TELEGRAM_CHAT_ID="your-chat-id" python3 education_news_bot.py
   ```

## Optional settings

```bash
MAX_ITEMS=8 python3 education_news_bot.py
```

```bash
CONFIG_PATH=feeds.example.json python3 education_news_bot.py
```

## Ask the bot for news

Run the bot in listening mode:

```bash
TELEGRAM_BOT_TOKEN="your-token" TELEGRAM_CHAT_ID="your-chat-id" python3 education_news_bot.py --listen
```

Then send this command to your Telegram bot:

```text
/latest
```

The script must keep running on your computer while you want the bot to answer.

## Cheapest automation options

- Free: run it manually whenever you want.
- Free/cheap: schedule it on your own computer once per day, or keep `--listen` running while your computer is on.
- Cheap: run it on a small cloud server or scheduled job later.

Keep `TELEGRAM_BOT_TOKEN` private. Anyone with that token can send messages as your bot.
