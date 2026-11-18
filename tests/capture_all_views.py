import subprocess, time, os

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
BASE = 'http://127.0.0.1:3000'
OUT_DIR = 'screenshots'
os.makedirs(OUT_DIR, exist_ok=True)

views = [
    ('04_help.png', f'{BASE}/#/help', 1440, 1600),
    ('05_reserve.png', f'{BASE}/#/reserve', 1440, 1600),
    ('06_dialog.png', f'{BASE}/#/dialog', 1440, 1600),
    ('07_cabinet_anketa.png', f'{BASE}/#/cabinet', 1440, 1500),
]

for filename, url, w, h in views:
    out_path = os.path.join(OUT_DIR, filename)
    print(f'Capturing {filename}...')
    cmd = [
        CHROME,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        f'--window-size={w},{h}',
        '--virtual-time-budget=2000',
        f'--screenshot={out_path}',
        url
    ]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        p.communicate(timeout=7)
        print(f'   Saved {filename} ({os.path.getsize(out_path) // 1024} KB)')
    except Exception as e:
        print(f'   Failed {filename}: {e}')
        p.kill()

print('Done basic views!')
