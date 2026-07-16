#!/usr/bin/env python3
import concurrent.futures
import json
import ssl
import time
import urllib.request

# ==================== KONFIGURASI API ====================
URL = "https://172.16.160.177:8000/dukcapil/get_json/351552223080001/CALL_VERIFY_BY_ELEMEN"
TOTAL_REQUESTS = 500
MAX_WORKERS = 5            # Jumlah thread paralel (bisa disesuaikan, misal 1-10)
TIMEOUT = 15                # Timeout per request (detik)
DELAY_BETWEEN_REQ = 0.05    # Jeda singkat per thread (detik) untuk mencegah overload server

# Isi payload JSON (sesuaikan dengan elemen data yang ingin Anda kirimkan)
PAYLOAD = {
    "USER_ID": "290220241042163515522230800018550",
    "PASSWORD": "gT8!jiPQ",
    "IP_USER": "10.35.15.152",
    "TRESHOLD": "1",
    "NIK": "3515082306920001",
    "NAMA_LGKP": "ARIEF SANGGA UTAMA",
    "KAB_NAME": "SIDOARJO"
}
# ========================================================

# Ignore SSL certificate verification (Privat/Self-Signed IP SSL)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE


def send_post_request(request_num):
    json_bytes = json.dumps(PAYLOAD).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "DukcapilTester/1.0"
    }

    req = urllib.request.Request(
        URL,
        data=json_bytes,
        headers=headers,
        method="POST"
    )

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, context=ssl_context, timeout=TIMEOUT) as response:
            status_code = response.getcode()
            elapsed = round((time.time() - start_time) * 1000, 2)
            resp_body = response.read().decode("utf-8", errors="ignore")
            return (request_num, True, status_code, elapsed, resp_body[:100])
    except urllib.error.HTTPError as e:
        elapsed = round((time.time() - start_time) * 1000, 2)
        error_body = e.read().decode("utf-8", errors="ignore") if hasattr(e, 'read') else str(e.reason)
        return (request_num, False, e.code, elapsed, f"HTTP Error {e.code}: {error_body[:100]}")
    except Exception as e:
        elapsed = round((time.time() - start_time) * 1000, 2)
        return (request_num, False, 0, elapsed, str(e))


def main():
    print("=" * 60)
    print(f" Memulai Load Test / Daily Quota Test 500x Hit")
    print(f" Target URL : {URL}")
    print(f" Method     : POST")
    print(f" Concurrent : {MAX_WORKERS} Threads")
    print("=" * 60)

    start_total = time.time()
    success_count = 0
    fail_count = 0
    status_summary = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(send_post_request, i): i for i in range(1, TOTAL_REQUESTS + 1)}

        for future in concurrent.futures.as_completed(futures):
            req_num, success, status, elapsed, detail = future.result()
            
            # Hitung statistik HTTP status code
            status_summary[status] = status_summary.get(status, 0) + 1

            if success:
                success_count += 1
                print(f"[{req_num:03d}/{TOTAL_REQUESTS}]  SUKSES - HTTP {status} ({elapsed} ms) | Response: {detail}")
            else:
                fail_count += 1
                print(f"[{req_num:03d}/{TOTAL_REQUESTS}] ❌ GAGAL  - Status {status} ({elapsed} ms) | Error: {detail}")

            time.sleep(DELAY_BETWEEN_REQ)

    total_time = round(time.time() - start_total, 2)

    print("\n" + "=" * 60)
    print(" RINGKASAN HASIL TEST DUKCAPIL API")
    print("=" * 60)
    print(f" Total Hits          : {TOTAL_REQUESTS}")
    print(f" Sukses (2xx)        : {success_count}")
    print(f" Gagal / Error       : {fail_count}")
    print(f" Total Waktu Eksekusi: {total_time} detik")
    print(" Rincian Status Code :")
    for code, count in sorted(status_summary.items()):
        print(f"   - HTTP {code}: {count} kali")
    print("=" * 60)


if __name__ == "__main__":
    main()
