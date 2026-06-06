import requests
import json

BASE_URL = "http://localhost:8000"

def test_api():
    print("Testing backend CRUD endpoints...")
    
    # 1. GET /banned-companies
    r = requests.get(f"{BASE_URL}/banned-companies")
    print("GET /banned-companies response:", r.status_code)
    companies = r.json().get("companies", [])
    print("Initial companies count:", len(companies))
    
    # 2. POST /banned-companies
    r = requests.post(f"{BASE_URL}/banned-companies", json={"name": "Scam Recruiting Inc."})
    print("POST /banned-companies (new) response:", r.status_code)
    print("Response data:", r.json())
    assert r.status_code == 200, "Should add new company successfully"
    comp_id = r.json()["company"]["id"]
    
    # 3. POST duplicate
    r = requests.post(f"{BASE_URL}/banned-companies", json={"name": "Scam Recruiting Inc."})
    print("POST /banned-companies (duplicate) response:", r.status_code)
    assert r.status_code == 400, "Should refuse duplicate company name"
    
    # 4. GET /banned-companies (verify addition)
    r = requests.get(f"{BASE_URL}/banned-companies")
    companies = r.json().get("companies", [])
    print("Companies count after add:", len(companies))
    assert len(companies) > 0
    
    # 5. DELETE /banned-companies/{id}
    r = requests.delete(f"{BASE_URL}/banned-companies/{comp_id}")
    print("DELETE /banned-companies/{id} response:", r.status_code)
    assert r.status_code == 200
    
    # 6. GET /banned-companies (verify deletion)
    r = requests.get(f"{BASE_URL}/banned-companies")
    companies = r.json().get("companies", [])
    print("Companies count after delete:", len(companies))
    
    print("-" * 40)
    
    # 7. GET /banned-keywords
    r = requests.get(f"{BASE_URL}/banned-keywords")
    print("GET /banned-keywords response:", r.status_code)
    keywords = r.json().get("keywords", [])
    print("Initial keywords count:", len(keywords))
    
    # 8. POST /banned-keywords
    r = requests.post(f"{BASE_URL}/banned-keywords", json={"keyword": "us-only"})
    print("POST /banned-keywords (new) response:", r.status_code)
    print("Response data:", r.json())
    assert r.status_code == 200, "Should add new keyword successfully"
    kw_id = r.json()["keyword"]["id"]
    
    # 9. POST duplicate
    r = requests.post(f"{BASE_URL}/banned-keywords", json={"keyword": "us-only"})
    print("POST /banned-keywords (duplicate) response:", r.status_code)
    assert r.status_code == 400, "Should refuse duplicate keyword"
    
    # 10. GET /banned-keywords (verify addition)
    r = requests.get(f"{BASE_URL}/banned-keywords")
    keywords = r.json().get("keywords", [])
    print("Keywords count after add:", len(keywords))
    assert len(keywords) > 0
    
    # 11. DELETE /banned-keywords/{id}
    r = requests.delete(f"{BASE_URL}/banned-keywords/{kw_id}")
    print("DELETE /banned-keywords/{id} response:", r.status_code)
    assert r.status_code == 200
    
    # 12. GET /banned-keywords (verify deletion)
    r = requests.get(f"{BASE_URL}/banned-keywords")
    keywords = r.json().get("keywords", [])
    print("Keywords count after delete:", len(keywords))
    
    print("\nAPI CRUD endpoint tests completed successfully!")

if __name__ == "__main__":
    test_api()
