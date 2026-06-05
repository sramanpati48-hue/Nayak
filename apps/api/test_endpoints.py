import urllib.request
import urllib.error
import json
import sys

def run_tests():
    print("Running endpoint tests...")
    
    # 1. Test GET /
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8000/")
        res = json.loads(req.read().decode())
        print(f"GET /: SUCCESS. Welcome Message: {res.get('message')}")
    except Exception as e:
        print(f"GET /: FAILED. Error: {e}")
        sys.exit(1)
        
    # 2. Test GET /api/v1/reports
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8000/api/v1/reports")
        res = json.loads(req.read().decode())
        print(f"GET /api/v1/reports: SUCCESS. Count: {len(res)}")
    except Exception as e:
        print(f"GET /api/v1/reports: FAILED. Error: {e}")
        sys.exit(1)
        
    # 3. Test POST /api/v1/vicharakbandhu/reviews (with unauthorized origin)
    try:
        url = "http://127.0.0.1:8000/api/v1/vicharakbandhu/reviews"
        data = json.dumps({"title": "Mock Check Review"}).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Origin": "http://malicious-site.com", "Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(req)
        print("POST (unauthorized origin): FAILED (did not block request)")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print("POST (unauthorized origin): SUCCESS (blocked with 403 Forbidden)")
        else:
            print(f"POST (unauthorized origin): FAILED. Expected 403, got {e.code}")
            sys.exit(1)
    except Exception as e:
        print(f"POST (unauthorized origin): FAILED. Error: {e}")
        sys.exit(1)

    # 4. Test POST /api/v1/vicharakbandhu/reviews (with authorized origin)
    try:
        url = "http://127.0.0.1:8000/api/v1/vicharakbandhu/reviews"
        data = json.dumps({"title": "Mock Check Review Success"}).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Origin": "http://localhost:3000", "Content-Type": "application/json"},
            method="POST"
        )
        res_data = urllib.request.urlopen(req).read().decode()
        res = json.loads(res_data)
        print(f"POST (authorized origin): SUCCESS. Created ID: {res.get('id')}")
    except Exception as e:
        print(f"POST (authorized origin): FAILED. Error: {e}")
        sys.exit(1)

    print("All backend security and functional tests passed successfully!")

if __name__ == "__main__":
    run_tests()
