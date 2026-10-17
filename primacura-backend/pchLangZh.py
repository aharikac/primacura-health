"""Chinese support for pchLang: Simplified (zh-Hans, read aloud in Mandarin) and
Traditional (zh-Hant, read aloud in Cantonese).

  * which script a message is in (Cantonese colloquial words count as zh-Hant)
  * ages written in Chinese ("3个月大", "兩歲") carried into the translation
  * the reply texts in both scripts (zh-Hant converted from zh-Hans with OpenCC,
    Hong Kong variant, then checked by hand)

Chinese medical wording should be reviewed by a native speaker before release.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

_CHARS = json.loads((Path(__file__).resolve().parent / "data" / "zh-script-chars.json").read_text(encoding="utf-8"))
_SIMPLIFIED_ONLY = frozenset(_CHARS["simplified_only"]) - frozenset(_CHARS["traditional_only"])
_TRADITIONAL_ONLY = frozenset(_CHARS["traditional_only"]) - frozenset(_CHARS["simplified_only"])
# Written Cantonese: words only Cantonese speakers write (they use Traditional characters).
_CANTONESE = re.compile(r"[佢唔嘅咗喺冇嘢啲哋嚟乜咁畀睇郁攰嗰噉嘢瞓]|點算|點樣|點解|點做")
_CJK = re.compile(r"[\u3400-\u9fff]")


def is_chinese(text: str) -> bool:
    """Mostly Chinese characters (a few Latin words like AED or 911 are fine)."""
    text = str(text)
    cjk = len(_CJK.findall(text))
    latin = len(re.findall(r"[A-Za-z]", text))
    return cjk >= 2 and cjk >= latin / 3


def chinese_script(text: str) -> str | None:
    """"zh-Hant", "zh-Hans", or None when the characters fit both scripts."""
    text = str(text)
    trad = sum(ch in _TRADITIONAL_ONLY for ch in text) + 2 * len(_CANTONESE.findall(text))
    simp = sum(ch in _SIMPLIFIED_ONLY for ch in text)
    if trad > simp:
        return "zh-Hant"
    if simp > trad:
        return "zh-Hans"
    return None


_NUM = {"一": 1, "二": 2, "两": 2, "兩": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
        "十一": 11, "十二": 12, "半": 0.5}
_UNIT = {"天": "day", "日": "day", "周": "week", "週": "week", "星期": "week", "个月": "month", "個月": "month",
         "月": "month", "岁": "year", "歲": "year"}
_AGE = re.compile(r"(\d{1,3}|十[一二]?|[一二两兩三四五六七八九半])\s*(个月|個月|星期|天|日|周|週|月|岁|歲)(半)?")


def chinese_age(text: str) -> str | None:
    """"3个月大" / "兩歲" / "一岁半" -> "3 months old" / "2 years old" / "18 months old"."""
    m = _AGE.search(str(text))
    if not m:
        return None
    n = int(m.group(1)) if m.group(1).isdigit() else _NUM[m.group(1)]
    unit = _UNIT[m.group(2)]
    if m.group(3) and unit == "year":  # "一岁半" = a year and a half
        n, unit = int(n * 12 + 6), "month"
    if n == 0.5 and unit == "year":
        n, unit = 6, "month"
    if n == 0.5:
        return None
    return f"{n} {unit}{'s' if n != 1 else ''} old"


PROMPT_HINTS = 'Emergency words: 噎住/哽住/卡住/鲠到/哽親/骾親 = choking (something stuck, cannot breathe), unless the person was in water (水、泳池、游泳池、海、河、浴缸), then 淹/溺水/遇溺/浸 = drowning; 嘴唇发紫/发紫/变紫/面青 = turned blue; 没有呼吸/冇呼吸/唔呼吸/唞唔到气 = not breathing; 没反应/冇反應/叫唔醒/叫不醒/昏迷/唔醒 = not responding / unconscious; 晕倒/暈低/昏倒 = fainted / collapsed; 抽筋/抽搐/發羊吊/羊癫疯/翻白眼/口吐白沫 = seizure, eyes rolled back, foaming at the mouth; 心口痛/胸口痛/胸闷 = chest pain / chest tightness; 中风/嘴歪/口齿不清/讲嘢唔清楚 = stroke signs: face drooping, slurred speech; 过敏/敏感/出风疹/荨麻疹/起红点 = allergy, hives; 喉咙肿/喉咙收紧 = throat swelling; 低血糖/血糖低 = low blood sugar; 流血不止/流血唔停/大量出血 = bleeding heavily; 漂白水 = bleach; 入眼/溅到眼 = in the eye; 食咗/吃了/吞了/误食 = ate / swallowed; 烫伤/淥親/滚水/热水 = scalded / boiling water / hot water (a burn); 撞到头/撞親個頭 = hit their head; 佢 = he/she; BB/宝宝/BB仔 = baby. Ages: 3个月大/三個月大 = is 3 months old; 10天大 = is 10 days old; 两岁/兩歲 = is 2 years old; 一岁半 = is 18 months old. '

TABLES = {
    "zh-Hans": {
        "CONDITION": {
            "Cardiac Arrest": "心脏骤停",
            "Cardiac Arrest (Drowning)": "心脏骤停（溺水）",
            "Heart Attack": "心脏病发作",
            "Choking": "噎住",
            "Anaphylaxis": "严重过敏反应",
            "Diabetic Emergency": "糖尿病急症",
            "Stroke": "中风",
            "Opioid Overdose": "阿片类药物过量",
            "Severe Bleeding": "严重出血",
            "Burns (Chemical to Eye)": "化学品入眼",
            "Burns (Thermal)": "烧烫伤（热）",
            "Poisoning / Ingestion": "中毒／误食",
            "Seizures": "抽搐（癫痫发作）",
            "Head, Neck, or Spinal Injury": "头部、颈部或脊椎受伤"
        },
        "CUE": {
            "Cardiac Arrest": "没有反应，没有正常呼吸",
            "Cardiac Arrest (Drowning)": "从水里救出来，没有反应或没有呼吸",
            "Heart Attack": "清醒，胸口疼痛或有压迫感",
            "Choking": "清醒但不能呼吸、咳嗽或说话；有东西卡住",
            "Anaphylaxis": "过敏反应：肿胀、荨麻疹、呼吸困难",
            "Diabetic Emergency": "有糖尿病；手抖、出汗、神志不清（低血糖）",
            "Stroke": "突然脸部下垂、一侧无力或说话含糊",
            "Opioid Overdose": "用过毒品或止痛药后；很难叫醒，呼吸很慢",
            "Severe Bleeding": "伤口大量出血",
            "Burns (Chemical to Eye)": "化学品溅进眼睛",
            "Burns (Thermal)": "被热源、火、蒸汽或热液体烧伤烫伤",
            "Poisoning / Ingestion": "吞下或吸入了有害的东西",
            "Seizures": "抽动或抽搐、身体僵硬、翻白眼",
            "Head, Neck, or Spinal Injury": "摔倒、车祸或撞击伤到头、颈或背"
        },
        "OPTION_EXTRA": {
            "None of these": "以上都不是",
            "Not responding and not breathing (or only gasping)": "没有反应，没有呼吸（或只有喘息）",
            "Not responding, but breathing": "没有反应，但有呼吸",
            "Awake and responding": "清醒，有反应",
            "Adult": "成人",
            "Child (1 year to puberty)": "儿童（1岁到青春期）",
            "Infant (under 1 year)": "婴儿（1岁以下）"
        },
        "NONE_HINT": "改为描述你看到的情况",
        "MESSAGES": {
            "triage": "**这个人对你有反应吗？呼吸正常吗？**\n\n喘息不是正常呼吸。",
            "triage_again": "**这个人对你有反应吗？呼吸正常吗？**请点最符合的答案。\n\n喘息不是正常呼吸。",
            "tap_again": "谢谢。**请点最符合的一项。**",
            "tap": "**请点最符合的一项。**",
            "out_of_scope": "这看起来不是PrimaCura涵盖的急症。**如果下面有符合的，请点它。**",
            "unable": "我还是无法判断是哪种急症。**请点最符合的指南**，或描述你看到的情况。",
            "describe": "好的。请用几句话描述你看到的情况：发生了什么、这个人是否清醒、呼吸是否正常。",
            "pet": "PrimaCura的指南是给人用的，不是给动物的。如果是宠物急症，请马上打电话给你的兽医或动物急诊医院。在美国也可以拨打ASPCA动物中毒控制中心(888) 426-4435（可能收费）。\n\n如果也有人受伤或不舒服，请告诉我他的情况。",
            "discard": "抱歉，我没看懂。请用几句话描述发生了什么，例如：“他倒下了，没有呼吸”。",
            "pair_drowning": "**是在水里或从水里出来后发生的（溺水），还是在陆地上倒下的（心脏骤停）？**"
        },
        "AGE_Q": "看起来是**{name}**，但正确的步骤取决于病人的年龄，不能混用。\n\n**是成人、儿童（1岁到青春期）还是婴儿（1岁以下）？**"
    },
    "zh-Hant": {
        "CONDITION": {
            "Cardiac Arrest": "心臟驟停",
            "Cardiac Arrest (Drowning)": "心臟驟停（溺水）",
            "Heart Attack": "心臟病發作",
            "Choking": "噎住",
            "Anaphylaxis": "嚴重過敏反應",
            "Diabetic Emergency": "糖尿病急症",
            "Stroke": "中風",
            "Opioid Overdose": "阿片類藥物過量",
            "Severe Bleeding": "嚴重出血",
            "Burns (Chemical to Eye)": "化學品入眼",
            "Burns (Thermal)": "燒燙傷（熱）",
            "Poisoning / Ingestion": "中毒／誤食",
            "Seizures": "抽搐（癲癇發作）",
            "Head, Neck, or Spinal Injury": "頭部、頸部或脊椎受傷"
        },
        "CUE": {
            "Cardiac Arrest": "沒有反應，沒有正常呼吸",
            "Cardiac Arrest (Drowning)": "從水裏救出來，沒有反應或沒有呼吸",
            "Heart Attack": "清醒，胸口疼痛或有壓迫感",
            "Choking": "清醒但不能呼吸、咳嗽或説話；有東西卡住",
            "Anaphylaxis": "過敏反應：腫脹、蕁麻疹、呼吸困難",
            "Diabetic Emergency": "有糖尿病；手抖、出汗、神志不清（低血糖）",
            "Stroke": "突然臉部下垂、一側無力或説話含糊",
            "Opioid Overdose": "用過毒品或止痛藥後；很難叫醒，呼吸很慢",
            "Severe Bleeding": "傷口大量出血",
            "Burns (Chemical to Eye)": "化學品濺進眼睛",
            "Burns (Thermal)": "被熱源、火、蒸汽或熱液體燒傷燙傷",
            "Poisoning / Ingestion": "吞下或吸入了有害的東西",
            "Seizures": "抽動或抽搐、身體僵硬、翻白眼",
            "Head, Neck, or Spinal Injury": "摔倒、車禍或撞擊傷到頭、頸或背"
        },
        "OPTION_EXTRA": {
            "None of these": "以上都不是",
            "Not responding and not breathing (or only gasping)": "沒有反應，沒有呼吸（或只有喘息）",
            "Not responding, but breathing": "沒有反應，但有呼吸",
            "Awake and responding": "清醒，有反應",
            "Adult": "成人",
            "Child (1 year to puberty)": "兒童（1歲到青春期）",
            "Infant (under 1 year)": "嬰兒（1歲以下）"
        },
        "NONE_HINT": "改為描述你看到的情況",
        "MESSAGES": {
            "triage": "**這個人對你有反應嗎？呼吸正常嗎？**\n\n喘息不是正常呼吸。",
            "triage_again": "**這個人對你有反應嗎？呼吸正常嗎？**請點最符合的答案。\n\n喘息不是正常呼吸。",
            "tap_again": "謝謝。**請點最符合的一項。**",
            "tap": "**請點最符合的一項。**",
            "out_of_scope": "這看起來不是PrimaCura涵蓋的急症。**如果下面有符合的，請點它。**",
            "unable": "我還是無法判斷是哪種急症。**請點最符合的指南**，或描述你看到的情況。",
            "describe": "好的。請用幾句話描述你看到的情況：發生了什麼、這個人是否清醒、呼吸是否正常。",
            "pet": "PrimaCura的指南是給人用的，不是給動物的。如果是寵物急症，請馬上打電話給你的獸醫或動物急診醫院。在美國也可以撥打ASPCA動物中毒控制中心(888) 426-4435（可能收費）。\n\n如果也有人受傷或不舒服，請告訴我他的情況。",
            "discard": "抱歉，我沒看懂。請用幾句話描述發生了什麼，例如：「他倒下了，沒有呼吸」。",
            "pair_drowning": "**是在水裏或從水裏出來後發生的（溺水），還是在陸地上倒下的（心臟驟停）？**"
        },
        "AGE_Q": "看起來是**{name}**，但正確的步驟取決於病人的年齡，不能混用。\n\n**是成人、兒童（1歲到青春期）還是嬰兒（1歲以下）？**"
    }
}
