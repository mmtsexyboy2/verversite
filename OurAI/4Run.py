import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import os
import json
import logging

# تنظیمات لاگ‌گیری
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- تنظیمات قابل تغییر ---
MODEL_PATH = "/home/ghm/Desktop/ParsBERT/fine_tuned_parsbert_classifier4"  # مسیر مدل فاین‌تون شده
LABEL_MAP_PATH = os.path.join(MODEL_PATH, "label_map.json") # مسیر فایل مپینگ لیبل‌ها
CHUNK_SIZE_WORDS = 400 # تعداد کلمات برای هر قطعه در متون بلند
MAX_TOKENS_PER_CHUNK = 512 # حداکثر توکن برای هر قطعه (نباید از محدودیت مدل بیشتر باشد)
# -------------------------

# بررسی وجود GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"استفاده از دستگاه: {device}")

# بارگذاری Tokenizer و Model
try:
    logger.info(f"بارگذاری Tokenizer از مسیر: {MODEL_PATH}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    logger.info(f"بارگذاری مدل از مسیر: {MODEL_PATH}")
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.to(device)
    model.eval() # تنظیم مدل به حالت ارزیابی
except OSError:
    logger.error(f"خطا: مدل یا Tokenizer در مسیر '{MODEL_PATH}' یافت نشد.")
    logger.error("لطفاً ابتدا اسکریپت fine_tune_parsbert.py را اجرا کنید یا مسیر صحیح را وارد نمایید.")
    exit()

# بارگذاری مپینگ لیبل‌ها
try:
    with open(LABEL_MAP_PATH, 'r', encoding='utf-8') as f:
        label_map = json.load(f)
    id_to_label = {int(k): v for k, v in label_map['id_to_label'].items()} # کلیدهای JSON رشته‌ای هستند
    logger.info(f"مپینگ لیبل‌ها با موفقیت بارگذاری شد: {id_to_label}")
except FileNotFoundError:
    logger.error(f"خطا: فایل مپینگ لیبل‌ها در مسیر '{LABEL_MAP_PATH}' یافت نشد.")
    exit()
except json.JSONDecodeError:
    logger.error(f"خطا: فایل مپینگ لیبل‌ها در مسیر '{LABEL_MAP_PATH}' معتبر نیست.")
    exit()


def predict_text_percentage(text_input):
    """
    پیش‌بینی دسته‌بندی برای یک متن کوتاه و نمایش درصدها.
    """
    inputs = tokenizer(
        text_input,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=MAX_TOKENS_PER_CHUNK # استفاده از MAX_TOKENS_PER_CHUNK
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
    
    logits = outputs.logits
    probabilities = torch.softmax(logits, dim=-1)[0] # گرفتن احتمالات برای نمونه اول در بچ
    
    results = []
    for i, prob in enumerate(probabilities):
        label_name = id_to_label.get(i, f"ناشناخته ({i})")
        results.append({"label": label_name, "score": prob.item() * 100})
        
    # مرتب‌سازی بر اساس امتیاز (درصد) به صورت نزولی
    results = sorted(results, key=lambda x: x['score'], reverse=True)
    
    return results

def predict_long_text_percentage(long_text):
    """
    پیش‌بینی دسته‌بندی برای متن بلند با تقسیم به قطعات و میانگین‌گیری از احتمالات.
    """
    words = long_text.split()
    chunks = []
    
    for i in range(0, len(words), CHUNK_SIZE_WORDS):
        chunk_text = ' '.join(words[i:i + CHUNK_SIZE_WORDS])
        chunks.append(chunk_text)
    
    if not chunks:
        return []

    logger.info(f"متن بلند به {len(chunks)} قطعه تقسیم شد.")
    
    all_chunk_probabilities = []
    for i, chunk in enumerate(chunks):
        # logger.info(f"پردازش قطعه {i+1}/{len(chunks)}...")
        inputs = tokenizer(
            chunk,
            return_tensors="pt",
            truncation=True,
            padding='max_length', # پدینگ تا حداکثر طول برای سازگاری ابعاد
            max_length=MAX_TOKENS_PER_CHUNK
        ).to(device)
        
        with torch.no_grad():
            outputs = model(**inputs)
        
        probabilities = torch.softmax(outputs.logits, dim=-1)[0]
        all_chunk_probabilities.append(probabilities)
    
    if not all_chunk_probabilities:
        return []

    # میانگین‌گیری از احتمالات تمام قطعات
    # ابتدا مطمئن شویم که همه تنسورها روی CPU هستند برای stack کردن
    avg_probabilities = torch.stack([p.cpu() for p in all_chunk_probabilities]).mean(dim=0)
    
    results = []
    for i, prob in enumerate(avg_probabilities):
        label_name = id_to_label.get(i, f"ناشناخته ({i})")
        results.append({"label": label_name, "score": prob.item() * 100})
        
    results = sorted(results, key=lambda x: x['score'], reverse=True)
    return results

def display_results(predictions):
    if not predictions:
        print("نتیجه‌ای برای نمایش وجود ندارد.")
        return
    print("\n--- نتایج طبقه‌بندی ---")
    for item in predictions:
        if item['score'] > 0.1: # فقط درصدهای بالاتر از یک دهم درصد نمایش داده شوند
            print(f"{item['label']}: {item['score']:.2f}%")
    print("-----------------------\n")

if __name__ == "__main__":
    print("مدل طبقه‌بندی متن PARSBERT آماده است.")
    print(f"دسته‌بندی‌های موجود: {', '.join(id_to_label.values())}")
    print("برای خروج، عبارت 'خروج' یا 'exit' را تایپ کنید.")

    while True:
        user_input = input("\nمتن خود را وارد کنید: ")
        if user_input.lower() in ['خروج', 'exit']:
            break
        if not user_input.strip():
            print("لطفا متنی وارد کنید.")
            continue

        # تشخیص اینکه متن کوتاه است یا بلند (بر اساس تعداد کلمات)
        # این یک معیار ساده است، می‌توانید پیچیده‌تر کنید
        if len(user_input.split()) > (MAX_TOKENS_PER_CHUNK - 50): # کمی حاشیه برای توکن‌ها
            logger.info("تشخیص متن بلند، استفاده از روش قطعه‌بندی...")
            predictions = predict_long_text_percentage(user_input)
        else:
            predictions = predict_text_percentage(user_input)
        
        display_results(predictions)
